import { query } from "@/lib/server/db";

const markKinds = {
  saved: "saved_property",
  following: "profile_follow",
  joinedCommunities: "community_membership",
  reactions: "social_reaction",
};

const statusLabels = {
  pending_confirmation: "Pending confirmation",
  awaiting_confirmation: "Awaiting host confirmation",
  confirmed: "Confirmed",
  declined: "Declined",
  reschedule_requested: "Reschedule requested",
  cancelled: "Cancelled",
  completed: "Completed",
};

export async function getMemberState(userId) {
  const [marks, bookings, inspections] = await Promise.all([
    query("SELECT kind, target_id FROM member_marks WHERE user_id = $1 ORDER BY created_at ASC", [userId]),
    query("SELECT id, property_id, property_title, check_in, guests, nights, total_amount, status, created_at FROM booking_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100", [userId]),
    query("SELECT id, property_id, property_title, preferred_date, status, created_at FROM inspection_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100", [userId]),
  ]);

  const state = { saved: [], following: [], joinedCommunities: [], reactions: [] };
  const keyByKind = Object.fromEntries(Object.entries(markKinds).map(([key, kind]) => [kind, key]));
  for (const mark of marks.rows) {
    const key = keyByKind[mark.kind];
    if (key) state[key].push(mark.target_id);
  }

  return {
    ...state,
    bookings: bookings.rows.map((row) => ({
      id: row.id,
      propertyId: row.property_id,
      title: row.property_title,
      date: toDateValue(row.check_in),
      guests: row.guests,
      nights: row.nights,
      total: Number(row.total_amount),
      status: statusLabels[row.status] || row.status,
      createdAt: row.created_at,
    })),
    inspections: inspections.rows.map((row) => ({
      id: row.id,
      propertyId: row.property_id,
      title: row.property_title,
      date: toDateValue(row.preferred_date),
      status: statusLabels[row.status] || row.status,
      createdAt: row.created_at,
    })),
  };
}

export async function setMemberMark({ userId, key, value, enabled }) {
  const kind = markKinds[key];
  if (!kind) throw new Error("Unsupported member mark");
  if (enabled) {
    await query("INSERT INTO member_marks (user_id, kind, target_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [userId, kind, value]);
  } else {
    await query("DELETE FROM member_marks WHERE user_id = $1 AND kind = $2 AND target_id = $3", [userId, kind, value]);
  }
  return { key, value, enabled };
}

export async function createBookingRequest({ userId, propertyId, title, date, guests, nights, total }) {
  const result = await query(
    "INSERT INTO booking_requests (user_id, property_id, property_title, check_in, guests, nights, total_amount) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, property_id, property_title, check_in, guests, nights, total_amount, status, created_at",
    [userId, propertyId, title, date, guests, nights, Math.round(total)],
  );
  const row = result.rows[0];
  await recordAudit(userId, "booking.requested", "booking_request", row.id, { propertyId });
  return { id: row.id, propertyId: row.property_id, title: row.property_title, date: toDateValue(row.check_in), guests: row.guests, nights: row.nights, total: Number(row.total_amount), status: statusLabels[row.status], createdAt: row.created_at };
}

export async function createInspectionRequest({ userId, propertyId, title, date }) {
  const result = await query(
    "INSERT INTO inspection_requests (user_id, property_id, property_title, preferred_date) VALUES ($1, $2, $3, $4) RETURNING id, property_id, property_title, preferred_date, status, created_at",
    [userId, propertyId, title, date],
  );
  const row = result.rows[0];
  await recordAudit(userId, "inspection.requested", "inspection_request", row.id, { propertyId });
  return { id: row.id, propertyId: row.property_id, title: row.property_title, date: toDateValue(row.preferred_date), status: statusLabels[row.status], createdAt: row.created_at };
}

function toDateValue(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

async function recordAudit(actorId, action, targetType, targetId, metadata) {
  try {
    await query("INSERT INTO audit_events (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5::jsonb)", [actorId, action, targetType, targetId, JSON.stringify(metadata)]);
  } catch (error) {
    console.error("Activity audit recording failed", { action, targetType, message: error.message });
  }
}
