import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { demoAccounts } from "../lib/demo-accounts.js";

const baseUrl = String(process.env.NESTORA_E2E_BASE_URL || "").replace(/\/$/, "");
const password = process.env.NESTORA_E2E_PASSWORD;
const environment = String(process.env.NESTORA_E2E_ENVIRONMENT || "").toLowerCase();

if (!baseUrl || !password) throw new Error("NESTORA_E2E_BASE_URL and NESTORA_E2E_PASSWORD are required.");
if (!["local", "test", "staging"].includes(environment) && process.env.NESTORA_E2E_ALLOW_PRODUCTION_READONLY !== "true") {
  throw new Error("Set NESTORA_E2E_ENVIRONMENT to local, test, or staging. Production runs require an explicit read-only override.");
}

const expectedDestinations = { member: "/my-nestora", agent: "/workspace/agent", host: "/workspace/host", developer: "/workspace/developer", agency_admin: "/workspace/agency", admin: "/admin" };
const workspaceChecks = { agent: ["overview", "listings", "leads", "inspections", "marketing", "entitlements"], host: ["overview", "listings", "hotel", "marketing", "entitlements"], developer: ["overview", "listings", "developer", "leads", "inspections", "marketing", "entitlements"], agency_admin: ["overview", "listings", "leads", "inspections", "team", "marketing", "entitlements"], admin: ["admin"] };
const results = [];
const mutatingRun = ["local", "test", "staging"].includes(environment);

await scenario("deep health", async () => {
  const response = await fetch(`${baseUrl}/api/health?deep=1`, { headers: { accept: "application/json" } });
  const payload = await json(response);
  assert(response.ok && payload.status === "ok", `readiness returned ${response.status} ${payload.status || "unknown"}`);
});

for (const account of demoAccounts) {
  await scenario(`${account.role} identity and role landing`, async () => {
    const session = await login(account.email);
    assert(session.payload.user.role === account.role, `expected ${account.role}, received ${session.payload.user.role}`);
    assert(session.payload.destination === expectedDestinations[account.role], `unexpected destination ${session.payload.destination}`);
    const identity = await request("/api/auth/session", { cookie: session.cookie });
    assert(identity.response.ok && identity.payload.user.email === account.email, "session identity does not match login account");
    for (const resource of workspaceChecks[account.role] || []) {
      const workspace = account.role === "agency_admin" ? "agency" : account.role;
      const result = await request(`/api/workspace/${resource}?workspace=${workspace}`, { cookie: session.cookie });
      assert(result.response.ok, `${resource} returned HTTP ${result.response.status}`);
    }
    const messages = await request("/api/messages", { cookie: session.cookie });
    assert(messages.response.ok, `messages returned HTTP ${messages.response.status}`);
    const logout = await request("/api/auth/logout", { method: "POST", cookie: session.cookie, body: {} });
    assert(logout.response.ok, `logout returned HTTP ${logout.response.status}`);
    const afterLogout = await request("/api/auth/session", { cookie: logout.cookie || session.cookie });
    assert(afterLogout.response.status === 401, `session remained active after logout (${afterLogout.response.status})`);
  });
}

await scenario("cross-role workspace access is denied", async () => {
  const agent = demoAccounts.find((account) => account.role === "agent");
  const session = await login(agent.email);
  const forbidden = await request("/api/workspace/developer?workspace=developer", { cookie: session.cookie });
  assert(forbidden.response.status === 403, `agent reached developer workspace (${forbidden.response.status})`);
});

await scenario("member cannot enter professional resources", async () => {
  const member = demoAccounts.find((account) => account.role === "member");
  const session = await login(member.email);
  const forbidden = await request("/api/workspace/listings?workspace=agent", { cookie: session.cookie });
  assert(forbidden.response.status === 403, `member reached professional resources (${forbidden.response.status})`);
});

if (mutatingRun) {
  await scenario("listing media approval enquiry and inspection persist end to end", async () => {
    const suffix = Date.now().toString(36);
    const agent = await loginRole("agent");
    const created = await request("/api/workspace/listings?workspace=agent", { method: "POST", cookie: agent.cookie, body: { action: "create", title: `E2E Wuye Residence ${suffix}`, category: "rent", location: "Wuye, Abuja", priceAmount: 8500000, description: "Automated staging workflow listing.", bedrooms: 3, bathrooms: 3.5 } });
    assert(created.response.status === 201, `listing creation returned ${created.response.status}`);
    const listingId = created.payload.listing?.id;
    assert(listingId, "listing creation did not return an id");
    await uploadListingImage({ listingId, cookie: agent.cookie });
    const activated = await request("/api/workspace/listings?workspace=agent", { method: "POST", cookie: agent.cookie, body: { action: "update", id: listingId, title: `E2E Wuye Residence ${suffix}`, location: "Wuye, Abuja", priceAmount: 8500000, description: "Automated staging workflow listing.", status: "active" } });
    assert(activated.response.ok, `listing activation returned ${activated.response.status}`);

    const admin = await loginRole("admin");
    const approval = await request("/api/workspace/admin", { method: "POST", cookie: admin.cookie, body: { action: "listingDecision", id: listingId, status: "approved", reason: "Automated staging publication check passed." } });
    assert(approval.response.ok, `listing approval returned ${approval.response.status}`);

    const member = await loginRole("member");
    const publicListings = await request("/api/listings", { cookie: member.cookie });
    assert(publicListings.payload.listings?.some((item) => item.id === listingId), "approved listing did not appear publicly");
    const enquiry = await request("/api/messages", { method: "POST", cookie: member.cookie, body: { action: "startListing", listingId, body: "I would like to inspect this property.", clientNonce: crypto.randomUUID() } });
    assert(enquiry.response.status === 201, `listing enquiry returned ${enquiry.response.status}`);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const inspection = await request("/api/account/state", { method: "POST", cookie: member.cookie, body: { type: "inspection", propertyId: listingId, date: tomorrow } });
    assert(inspection.response.status === 201, `inspection request returned ${inspection.response.status}`);

    const agentLeads = await request("/api/workspace/leads?workspace=agent", { cookie: agent.cookie });
    const agentInspections = await request("/api/workspace/inspections?workspace=agent", { cookie: agent.cookie });
    assert(agentLeads.payload.leads?.some((item) => item.listing_id === listingId), "customer enquiry did not reach the agent lead desk");
    const professionalInspection = agentInspections.payload.inspections?.find((item) => item.listing_title === `E2E Wuye Residence ${suffix}`);
    assert(professionalInspection, "customer inspection did not reach the agent calendar");
    const confirmedAt = `${tomorrow}T11:00:00.000Z`;
    const confirmedInspection = await request("/api/workspace/inspections?workspace=agent", { method: "POST", cookie: agent.cookie, body: { action: "update", id: professionalInspection.id, status: "confirmed", scheduledAt: confirmedAt, notes: "Confirmed by the staging workflow." } });
    assert(confirmedInspection.response.ok, `inspection confirmation returned ${confirmedInspection.response.status}`);
    const memberState = await request("/api/account/state", { cookie: member.cookie });
    assert(memberState.payload.state?.inspections?.some((item) => item.propertyId === listingId && item.status === "Confirmed"), "professional inspection status did not reach the customer account");
    const listingReport = await request("/api/listing-reports", { method: "POST", cookie: member.cookie, body: { listingId, reason: "Automated moderation workflow review for listing accuracy." } });
    assert(listingReport.response.status === 201, `listing report returned ${listingReport.response.status}`);
    const adminQueue = await request("/api/workspace/admin?workspace=admin", { cookie: admin.cookie });
    assert(adminQueue.payload.reports?.some((item) => item.id === listingReport.payload.report.id), "listing report did not reach the administration queue");
    const resolvedReport = await request("/api/workspace/admin?workspace=admin", { method: "POST", cookie: admin.cookie, body: { action: "report", id: listingReport.payload.report.id, status: "resolved", reason: "Automated staging review completed." } });
    assert(resolvedReport.response.ok, `listing report resolution returned ${resolvedReport.response.status}`);
    const material = await request("/api/workspace/marketing?workspace=agent", { method: "POST", cookie: agent.cookie, body: { action: "generate", kind: "rental_flyer", listingId, developmentId: null, qrTarget: `/properties/${listingId}` } });
    assert(material.response.status === 201 && material.payload.previewPath, `marketing generation returned ${material.response.status}`);
    const preview = await fetch(`${baseUrl}${material.payload.previewPath}`, { headers: { cookie: agent.cookie }, redirect: "manual" });
    assert(preview.ok && (preview.headers.get("content-type") || "").includes("application/pdf"), "generated PDF could not be opened");
    const archived = await request("/api/workspace/listings?workspace=agent", { method: "POST", cookie: agent.cookie, body: { action: "update", id: listingId, title: `E2E Wuye Residence ${suffix}`, location: "Wuye, Abuja", priceAmount: 8500000, description: "Automated staging workflow listing.", status: "archived" } });
    assert(archived.response.ok, "test listing cleanup failed");
  });

  await scenario("hotel developer and agency inventory creation persists", async () => {
    const suffix = Date.now().toString(36).slice(-8);
    const host = await loginRole("host");
    const roomType = await request("/api/workspace/hotel?workspace=host", { method: "POST", cookie: host.cookie, body: { action: "roomType", code: `E2E-${suffix}`, name: `E2E Suite ${suffix}`, capacity: 2, nightlyRate: 150000 } });
    assert(roomType.response.status === 201, `room type creation returned ${roomType.response.status}`);
    const room = await request("/api/workspace/hotel?workspace=host", { method: "POST", cookie: host.cookie, body: { action: "roomCreate", roomTypeId: roomType.payload.roomType.id, code: `R-${suffix}` } });
    assert(room.response.status === 201, `room creation returned ${room.response.status}`);

    const stay = await request("/api/workspace/listings?workspace=host", { method: "POST", cookie: host.cookie, body: { action: "create", title: `E2E Jabi Stay ${suffix}`, category: "stay", location: "Jabi, Abuja", priceAmount: 150000, description: "Automated staging reservation workflow.", bedrooms: 1, bathrooms: 1 } });
    assert(stay.response.status === 201, `stay listing creation returned ${stay.response.status}`);
    const stayId = stay.payload.listing.id;
    await uploadListingImage({ listingId: stayId, cookie: host.cookie });
    const activatedStay = await request("/api/workspace/listings?workspace=host", { method: "POST", cookie: host.cookie, body: { action: "update", id: stayId, title: `E2E Jabi Stay ${suffix}`, location: "Jabi, Abuja", priceAmount: 150000, description: "Automated staging reservation workflow.", status: "active" } });
    assert(activatedStay.response.ok, `stay listing activation returned ${activatedStay.response.status}`);
    const admin = await loginRole("admin");
    const approvedStay = await request("/api/workspace/admin?workspace=admin", { method: "POST", cookie: admin.cookie, body: { action: "listingDecision", id: stayId, status: "approved", reason: "Automated staging stay publication check passed." } });
    assert(approvedStay.response.ok, `stay listing approval returned ${approvedStay.response.status}`);
    const member = await loginRole("member");
    const checkIn = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    const booking = await request("/api/account/state", { method: "POST", cookie: member.cookie, body: { type: "booking", propertyId: stayId, date: checkIn, guests: 2, nights: 2 } });
    assert(booking.response.status === 201, `reservation request returned ${booking.response.status}`);
    const hotelDesk = await request("/api/workspace/hotel?workspace=host", { cookie: host.cookie });
    const reservation = hotelDesk.payload.reservations?.find((item) => item.guest_email === demoAccounts.find((account) => account.role === "member").email && String(item.check_in).startsWith(checkIn));
    assert(reservation, "reservation request did not reach the hotel workspace");
    const confirmedReservation = await request("/api/workspace/hotel?workspace=host", { method: "POST", cookie: host.cookie, body: { action: "reservation", id: reservation.id, status: "confirmed", paymentStatus: "pending" } });
    assert(confirmedReservation.response.ok, `reservation confirmation returned ${confirmedReservation.response.status}`);
    const bookingState = await request("/api/account/state", { cookie: member.cookie });
    assert(bookingState.payload.state?.bookings?.some((item) => item.propertyId === stayId && item.status === "Confirmed"), "hotel reservation status did not reach the customer account");
    const archivedStay = await request("/api/workspace/listings?workspace=host", { method: "POST", cookie: host.cookie, body: { action: "update", id: stayId, title: `E2E Jabi Stay ${suffix}`, location: "Jabi, Abuja", priceAmount: 150000, description: "Automated staging reservation workflow.", status: "archived" } });
    assert(archivedStay.response.ok, "stay listing cleanup failed");

    const developer = await loginRole("developer");
    const development = await request("/api/workspace/developer?workspace=developer", { method: "POST", cookie: developer.cookie, body: { action: "developmentCreate", name: `E2E Development ${suffix}`, location: "Katampe, Abuja", completionDate: null, paymentPlan: "Thirty percent deposit with milestone payments." } });
    assert(development.response.status === 201, `development creation returned ${development.response.status}`);
    const developmentId = development.payload.development.id;
    const block = await request("/api/workspace/developer?workspace=developer", { method: "POST", cookie: developer.cookie, body: { action: "blockCreate", developmentId, code: `B-${suffix}`, name: "Block E2E", floors: 4 } });
    const unitType = await request("/api/workspace/developer?workspace=developer", { method: "POST", cookie: developer.cookie, body: { action: "unitTypeCreate", developmentId, code: `T-${suffix}`, name: "Three bedroom", bedrooms: 3, bathrooms: 3.5, areaSqm: 210, priceAmount: 240000000 } });
    assert(block.response.status === 201 && unitType.response.status === 201, "development structure creation failed");
    const unit = await request("/api/workspace/developer?workspace=developer", { method: "POST", cookie: developer.cookie, body: { action: "unitCreate", developmentId, blockId: block.payload.block.id, unitTypeId: unitType.payload.unitType.id, code: `U-${suffix}`, floor: 2, priceAmount: 245000000 } });
    assert(unit.response.status === 201, `unit creation returned ${unit.response.status}`);

    const agency = await loginRole("agency_admin");
    const rule = await request("/api/workspace/team?workspace=agency", { method: "POST", cookie: agency.cookie, body: { action: "routingRule", name: `E2E routing ${suffix}`, source: "listing", listingCategory: "rent", assigneeUserId: null, strategy: "least_active", priority: 900 } });
    assert(rule.response.status === 201, `routing rule creation returned ${rule.response.status}`);
  });

  await scenario("cross tenant listing mutation is denied", async () => {
    const suffix = Date.now().toString(36).slice(-8);
    const host = await loginRole("host");
    const hostListing = await request("/api/workspace/listings?workspace=host", { method: "POST", cookie: host.cookie, body: { action: "create", title: `E2E Host Listing ${suffix}`, category: "stay", location: "Jabi, Abuja", priceAmount: 120000, description: "Cross tenant authorization record.", bedrooms: 1, bathrooms: 1 } });
    assert(hostListing.response.status === 201, "host listing setup failed");
    const agent = await loginRole("agent");
    const denied = await request("/api/workspace/listings?workspace=agent", { method: "POST", cookie: agent.cookie, body: { action: "update", id: hostListing.payload.listing.id, title: `E2E Host Listing ${suffix}`, location: "Jabi, Abuja", priceAmount: 1, description: "Unauthorized update", status: "archived" } });
    assert([403, 404].includes(denied.response.status), `cross-tenant update returned ${denied.response.status}`);
  });
}

const output = { generatedAt: new Date().toISOString(), baseUrl, environment, results };
const evidencePath = path.resolve("docs", "qa", "evidence", "data", "deployed-e2e-results.json");
await fs.mkdir(path.dirname(evidencePath), { recursive: true });
await fs.writeFile(evidencePath, JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
if (results.some((result) => result.status === "fail")) process.exitCode = 1;

async function login(email) {
  const result = await request("/api/auth/login", { method: "POST", body: { email, password } });
  assert(result.response.ok, `login for ${email} returned HTTP ${result.response.status}`);
  assert(result.cookie, `login for ${email} did not set a session cookie`);
  return { payload: result.payload, cookie: result.cookie };
}

async function loginRole(role) {
  const account = demoAccounts.find((item) => item.role === role);
  assert(account, `missing ${role} QA account`);
  return login(account.email);
}

async function request(pathname, { method = "GET", cookie, body } = {}) {
  const headers = { accept: "application/json", origin: baseUrl };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${pathname}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  const setCookie = response.headers.getSetCookie?.()[0] || response.headers.get("set-cookie");
  return { response, payload: await json(response), cookie: setCookie ? setCookie.split(";", 1)[0] : null };
}

async function requestForm(pathname, { cookie, form }) {
  const headers = { accept: "application/json", origin: baseUrl };
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${baseUrl}${pathname}`, { method: "POST", headers, body: form, redirect: "manual" });
  return { response, payload: await json(response) };
}

async function uploadListingImage({ listingId, cookie }) {
  const image = await sharp({ create: { width: 96, height: 96, channels: 3, background: { r: 43, g: 83, b: 68 } } }).png().toBuffer();
  const form = new FormData();
  form.set("listingId", listingId);
  form.set("file", new Blob([image], { type: "image/png" }), "e2e-property.png");
  const uploaded = await requestForm("/api/media", { cookie, form });
  assert(uploaded.response.status === 201, `media upload returned ${uploaded.response.status}`);
  return uploaded.payload.media;
}

async function json(response) { return response.json().catch(() => ({})); }
function assert(condition, message) { if (!condition) throw new Error(message); }
async function scenario(name, run) { const started = Date.now(); try { await run(); results.push({ name, status: "pass", durationMs: Date.now() - started }); } catch (error) { results.push({ name, status: "fail", durationMs: Date.now() - started, error: error.message }); } }
