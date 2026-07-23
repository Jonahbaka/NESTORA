import crypto from "node:crypto";
import { AccessError } from "@/lib/server/authorization";
import { recordAuditEvent } from "@/lib/server/audit";
import { getPool, query } from "@/lib/server/db";
import { calculatePropertyMediaEstimate, mergePropertyMediaPricing, PROPERTY_MEDIA_PRICING } from "@/lib/property-media-pricing";

export const PROPERTY_MEDIA_SERVICE_MEDIA = Object.freeze({
  team: {
    src: "/images/property-media/team-field-production.webp",
    alt: "Illustrative Nigerian property-media crew operating a camera, 360-degree camera and grounded drone at an Abuja residence",
  },
  interior: {
    src: "/images/property-media/interior-photography.webp",
    alt: "Illustrative Nigerian property photographer composing an interior image with a professional camera and tripod",
  },
  drone: {
    src: "/images/property-media/drone-development-overview.webp",
    alt: "Illustrative aerial overview of a landscaped Abuja residential development and its surrounding roads",
  },
});

export async function getPropertyMediaConfiguration() {
  const result = await query("SELECT pricing, service_media, updated_at FROM property_media_settings WHERE id = 'default' LIMIT 1");
  const row = result.rows[0];
  return {
    pricing: mergePropertyMediaPricing(row?.pricing),
    serviceMedia: { ...PROPERTY_MEDIA_SERVICE_MEDIA, ...(row?.service_media || {}) },
    updatedAt: row?.updated_at || null,
  };
}

export async function updatePropertyMediaConfiguration({ context, input }) {
  requireAdmin(context);
  const current = await getPropertyMediaConfiguration();
  const nextPricing = {
    ...current.pricing,
    depositPercent: input.depositPercent,
    taxMode: input.taxMode,
    taxRatePercent: input.taxRatePercent,
    taxLabel: input.taxLabel,
    includedRadiusKm: input.includedRadiusKm,
    additionalKmRateNgn: input.additionalKmRateNgn,
    hostingRenewalNgn: input.hostingRenewalNgn,
    packages: current.pricing.packages.map((item) => ({
      ...item,
      priceNgn: input.packagePrices[item.id] ?? item.priceNgn,
    })),
    extras: current.pricing.extras.map((item) => ({
      ...item,
      priceNgn: input.extraPrices[item.id] ?? item.priceNgn,
    })),
  };
  const serviceMedia = { ...current.serviceMedia, ...(input.serviceMedia || {}) };
  await query(
    `INSERT INTO property_media_settings (id, pricing, service_media, updated_by)
     VALUES ('default', $1::jsonb, $2::jsonb, $3)
     ON CONFLICT (id) DO UPDATE SET pricing = EXCLUDED.pricing, service_media = EXCLUDED.service_media,
       updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [JSON.stringify(nextPricing), JSON.stringify(serviceMedia), context.user.id],
  );
  await recordAuditEvent({ actorId: context.user.id, action: "property_media.pricing_updated", targetType: "property_media_settings", targetId: "default", metadata: { packageCount: nextPricing.packages.length } });
  return getPropertyMediaConfiguration();
}

export async function estimatePropertyMediaBooking(input) {
  const { pricing } = await getPropertyMediaConfiguration();
  validateBookingDates(input);
  return calculatePropertyMediaEstimate(input, pricing);
}

export async function createPropertyMediaBooking({ context, input }) {
  validateBookingDates(input);
  if (input.listingId) await requireListingAccess(context, input.listingId);
  const configuration = await getPropertyMediaConfiguration();
  const estimate = calculatePropertyMediaEstimate(input, configuration.pricing);
  const bookingReference = createBookingReference();
  const client = await getPool().connect();
  let booking;
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO property_media_bookings
         (booking_reference, requester_user_id, organization_id, listing_id, customer_name, customer_email,
          customer_phone, whatsapp_number, customer_type, property_type, property_address, map_location,
          package_id, extras, property_scope, drone_requested, tour_360_requested, preferred_date, alternate_date,
          access_instructions, occupancy_status, special_requirements, estimate, consented_at)
       VALUES ($1, $2, $3, $4, $5, LOWER($6), $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb,
               $16, $17, $18, $19, $20, $21, $22, $23::jsonb, NOW())
       RETURNING id, booking_reference, listing_id, package_id, preferred_date, alternate_date, status, payment_status, estimate, created_at`,
      [
        bookingReference, context?.user.id || null, context?.organization?.id || null, input.listingId || null,
        input.customerName, input.email, input.phone, input.whatsapp, input.customerType, input.propertyType,
        input.propertyAddress, input.mapLocation || null, input.packageId, JSON.stringify(input.extras || {}),
        JSON.stringify({
          rooms: input.rooms,
          unitTypes: input.unitTypes,
          approximateSizeSqm: input.approximateSizeSqm,
          distanceKm: input.distanceKm,
          permitAllowanceNgn: input.permitAllowanceNgn || 0,
        }),
        input.droneRequested, input.tour360Requested, input.preferredDate, input.alternateDate || null,
        input.accessInstructions || null, input.occupancyStatus, input.specialRequirements || null, JSON.stringify(estimate),
      ],
    );
    booking = result.rows[0];
    await client.query(
      `INSERT INTO property_media_operations (booking_id, travel_estimate_ngn)
       VALUES ($1, $2)`,
      [booking.id, estimate.travel.amountNgn],
    );
    await client.query(
      `INSERT INTO property_media_booking_events (booking_id, actor_id, event_type, to_status, metadata)
       VALUES ($1, $2, 'booking_requested', 'requested', $3::jsonb)`,
      [booking.id, context?.user.id || null, JSON.stringify({ packageId: input.packageId, totalNgn: estimate.totalNgn })],
    );
    await client.query(
      `INSERT INTO delivery_jobs (user_id, organization_id, channel, destination, template_key, payload)
       VALUES ($1, $2, 'email', $3, 'property_media_booking_requested', $4::jsonb)`,
      [context?.user.id || null, context?.organization?.id || null, input.email.toLowerCase(), JSON.stringify({ bookingReference, packageName: estimate.package.name, preferredDate: input.preferredDate, depositNgn: estimate.deposit.amountNgn })],
    );
    if (context?.user.id) {
      await client.query(
        `INSERT INTO notifications (external_key, user_id, kind, title, body, deep_link, delivery_status, is_demo)
         VALUES ($1, $2, 'property_media', 'Property-media request received', $3, '/my-nestora', 'queued', $4)`,
        [`property-media-${booking.id}`, context.user.id, `${bookingReference} is awaiting review by the Nestora media team.`, Boolean(context.user.is_demo)],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
  await recordAuditEvent({ actorId: context?.user.id || null, action: "property_media.booking_created", targetType: "property_media_booking", targetId: booking.id, metadata: { bookingReference, packageId: input.packageId, listingId: input.listingId || null } });
  return booking;
}

export async function listPropertyMediaBookings(context) {
  if (!context?.user) throw new AccessError("AUTH_REQUIRED", "Sign in to view bookings.");
  const admin = context.isAdmin;
  const result = await query(
    `SELECT b.id, b.booking_reference, b.listing_id, b.package_id, b.property_type, b.property_address,
            b.preferred_date, b.alternate_date, b.estimate, b.status, b.payment_status, b.created_at, b.updated_at
     FROM property_media_bookings b
     WHERE $1 = TRUE OR b.requester_user_id = $2 OR ($3::uuid IS NOT NULL AND b.organization_id = $3)
     ORDER BY b.created_at DESC LIMIT 100`,
    [admin, context.user.id, context.organization?.id || null],
  );
  return result.rows;
}

export async function listPropertyMediaOperations(context) {
  requireAdmin(context);
  const result = await query(
    `SELECT b.*, o.quote, o.staff_assignment, o.photographer_assignment, o.drone_operator_assignment,
            o.equipment_requirements, o.travel_estimate_ngn, o.scheduled_at, o.production_notes,
            o.media_delivery, o.revision_requests, o.updated_at AS operations_updated_at,
            l.title AS listing_title, u.name AS requester_name
     FROM property_media_bookings b
     LEFT JOIN property_media_operations o ON o.booking_id = b.id
     LEFT JOIN listings l ON l.id = b.listing_id
     LEFT JOIN users u ON u.id = b.requester_user_id
     ORDER BY
       CASE b.status WHEN 'requested' THEN 1 WHEN 'quote_pending' THEN 2 WHEN 'awaiting_deposit' THEN 3
         WHEN 'confirmed' THEN 4 WHEN 'scheduled' THEN 5 WHEN 'capture_completed' THEN 6
         WHEN 'editing' THEN 7 WHEN 'ready_for_review' THEN 8 ELSE 9 END,
       b.preferred_date, b.created_at DESC
     LIMIT 250`,
  );
  return result.rows;
}

export async function updatePropertyMediaOperation({ context, input }) {
  requireAdmin(context);
  const client = await getPool().connect();
  let booking;
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT id, status, listing_id FROM property_media_bookings WHERE id = $1 FOR UPDATE", [input.bookingId]);
    if (!existing.rowCount) throw new AccessError("NOT_FOUND", "Photography booking not found.");
    booking = existing.rows[0];
    const updated = await client.query(
      `UPDATE property_media_bookings SET status = $1, payment_status = $2, updated_at = NOW()
       WHERE id = $3 RETURNING id, booking_reference, status, payment_status, listing_id, updated_at`,
      [input.status, input.paymentStatus, input.bookingId],
    );
    booking = updated.rows[0];
    await client.query(
      `INSERT INTO property_media_operations
         (booking_id, staff_assignment, photographer_assignment, drone_operator_assignment,
          equipment_requirements, scheduled_at, production_notes, revision_requests, updated_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb, $9)
       ON CONFLICT (booking_id) DO UPDATE SET
         staff_assignment = EXCLUDED.staff_assignment,
         photographer_assignment = EXCLUDED.photographer_assignment,
         drone_operator_assignment = EXCLUDED.drone_operator_assignment,
         equipment_requirements = EXCLUDED.equipment_requirements,
         scheduled_at = EXCLUDED.scheduled_at,
         production_notes = EXCLUDED.production_notes,
         revision_requests = EXCLUDED.revision_requests,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()`,
      [
        input.bookingId, input.staffAssignment || null, input.photographerAssignment || null,
        input.droneOperatorAssignment || null, JSON.stringify(input.equipmentRequirements || []),
        input.scheduledAt || null, input.productionNotes || null, JSON.stringify(input.revisionRequests || []),
        context.user.id,
      ],
    );
    await client.query(
      `INSERT INTO property_media_booking_events (booking_id, actor_id, event_type, from_status, to_status, metadata)
       VALUES ($1, $2, 'operations_updated', $3, $4, $5::jsonb)`,
      [input.bookingId, context.user.id, existing.rows[0].status, input.status, JSON.stringify({ paymentStatus: input.paymentStatus })],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
  await recordAuditEvent({ actorId: context.user.id, action: "property_media.operations_updated", targetType: "property_media_booking", targetId: input.bookingId, metadata: { status: input.status, paymentStatus: input.paymentStatus } });
  return booking;
}

export async function attachDeliveredMedia({ context, input }) {
  requireAdmin(context);
  const result = await query(
    `UPDATE listing_media lm SET service_booking_id = $1, media_source = $2, updated_at = NOW()
     FROM property_media_bookings b
     WHERE b.id = $1 AND b.listing_id IS NOT NULL AND lm.id = $3 AND lm.listing_id = b.listing_id AND lm.status = 'ready'
     RETURNING lm.id, lm.listing_id, lm.media_role, lm.media_source, lm.service_booking_id`,
    [input.bookingId, input.mediaSource, input.mediaId],
  );
  if (!result.rowCount) throw new AccessError("NOT_FOUND", "The selected media does not belong to this booking's listing.");
  await recordAuditEvent({ actorId: context.user.id, action: "property_media.media_attached", targetType: "listing_media", targetId: input.mediaId, metadata: { bookingId: input.bookingId, mediaSource: input.mediaSource } });
  return result.rows[0];
}

async function requireListingAccess(context, listingId) {
  if (!context?.user) throw new AccessError("AUTH_REQUIRED", "Sign in before connecting a shoot to a listing.");
  const result = await query(
    `SELECT id FROM listings
     WHERE id = $1 AND ($2 = TRUE OR owner_user_id = $3 OR ($4::uuid IS NOT NULL AND organization_id = $4))
     LIMIT 1`,
    [listingId, context.isAdmin, context.user.id, context.organization?.id || null],
  );
  if (!result.rowCount) throw new AccessError("NOT_FOUND", "Listing not found.");
}

function validateBookingDates(input) {
  const preferred = new Date(`${input.preferredDate}T12:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (Number.isNaN(preferred.getTime()) || preferred < today) throw new AccessError("VALIDATION_ERROR", "Choose a preferred date that is not in the past.");
  if (input.alternateDate) {
    const alternate = new Date(`${input.alternateDate}T12:00:00Z`);
    if (Number.isNaN(alternate.getTime()) || alternate < today || alternate.getTime() === preferred.getTime()) {
      throw new AccessError("VALIDATION_ERROR", "Choose a different valid alternate date.");
    }
  }
}

function createBookingReference() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `NPM-${date}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function requireAdmin(context) {
  if (!context?.isAdmin) throw new AccessError("FORBIDDEN", "Platform administrator access is required.");
}
