import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { demoAccountByKey } from "../lib/demo-accounts.js";

const baseUrl = String(process.env.NESTORA_E2E_BASE_URL || "http://localhost:3040").replace(/\/$/, "");
const password = process.env.NESTORA_E2E_PASSWORD;
if (!password) throw new Error("NESTORA_E2E_PASSWORD is required.");
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseUrl)) throw new Error("Specialist browser QA is restricted to a local Nestora origin.");

const root = process.cwd();
const screenshotDir = path.join(root, "docs", "qa", "evidence", "screenshots", "local-specialists");
const dataDir = path.join(root, "docs", "qa", "evidence", "data");
await fs.mkdir(screenshotDir, { recursive: true });
await fs.mkdir(dataDir, { recursive: true });

const results = [];
const suffix = Date.now().toString(36).slice(-7);
const projectName = `Katampe QA Terraces ${suffix}`;
const blockCode = `C${suffix.slice(-3)}`;
const unitTypeCode = `T${suffix.slice(-3)}`;
const unitCode = `C-${suffix.slice(-4)}`;
const developerListingTitle = `Katampe Buyer Residence ${suffix}`;
const hotelListingTitle = `Jabi Executive Stay ${suffix}`;
const roomTypeCode = `EXEC-${suffix.slice(-4)}`;
const roomCode = `EX-${suffix.slice(-4)}`;
let developerListingId;
let hotelListingId;
let expectedAvailabilityConflict = false;
let fatalError = null;
let currentScenario = "initialization";

const browser = await chromium.launch({ headless: true, executablePath: await resolveBrowserExecutable() });
const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(30_000);
page.setDefaultNavigationTimeout(60_000);
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) results.push({ name: "browser console", status: "warning", detail: message.text() });
});
page.on("pageerror", (error) => {
  if (error.message.includes("Minified React error #418") && error.message.includes("args[]=HTML")) return;
  results.push({ name: "page error", status: "warning", detail: `${currentScenario} | ${page.url()} | ${error.message}` });
});
page.on("response", (response) => {
  if (response.status() < 400) return;
  if (response.status() === 401 && response.url().endsWith("/api/auth/session")) return;
  if (expectedAvailabilityConflict && response.status() === 409 && response.url().endsWith("/api/account/state")) return;
  results.push({ name: "failed request", status: "warning", detail: `${response.status()} ${response.request().method()} ${response.url()}` });
});

try {
  await scenario("developer creates project inventory and review-ready listing through UI", async () => {
    await login(demoAccountByKey.developer.email, "/workspace/developer");
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page.getByRole("button", { name: "Add project" }).click();
    const projectForm = page.locator(".workspace-form").filter({ has: page.locator("input[name=name]") }).first();
    await projectForm.locator("input[name=name]").fill(projectName);
    await projectForm.locator("input[name=location]").fill("Katampe Extension, Abuja");
    await projectForm.locator("input[name=completionDate]").fill("2028-06-30");
    await projectForm.locator("textarea[name=paymentPlan]").fill("30% deposit, 40% during construction, and 30% before documented handover.");
    await projectForm.getByRole("button", { name: "Create project" }).click();
    await expectVisible(page.getByText(projectName, { exact: true }), "created development project");

    await page.getByRole("button", { name: "Inventory", exact: true }).click();
    await page.getByRole("button", { name: "Add block" }).click();
    await fillCreateForm("Create block", { developmentId: { label: projectName }, code: blockCode, name: `Courtyard ${blockCode}`, floors: "5" });
    await page.getByRole("button", { name: "Unit type", exact: true }).click();
    await fillCreateForm("Create unit type", { developmentId: { label: projectName }, code: unitTypeCode, name: `Three-bedroom ${suffix}`, bedrooms: "3", bathrooms: "3.5", areaSqm: "228", priceAmount: "245000000" });
    await page.getByRole("button", { name: "Add unit" }).click();
    await fillCreateForm("Create unit", { developmentId: { label: projectName }, blockId: { label: `${projectName} · Courtyard ${blockCode}` }, unitTypeId: { label: `${projectName} · Three-bedroom ${suffix}` }, code: unitCode, floor: "2", priceAmount: "245000000" });
    const unit = page.locator(".workspace-record").filter({ hasText: unitCode }).first();
    await expectVisible(unit, "created development unit");
    await unit.locator("select[name=status]").selectOption("reserved");
    await unit.locator("input[name=priceAmount]").fill("252000000");
    await unit.getByRole("button", { name: "Update unit" }).click();

    developerListingId = await createListing({
      role: "developer",
      title: developerListingTitle,
      category: "development",
      propertyType: "Three-bedroom development residence",
      addressLine1: "44 Katampe Ridge Road",
      addressLine2: projectName,
      priceAmount: "252000000",
      bedrooms: "3",
      bathrooms: "3.5",
      areaSqm: "228",
      description: "A documented three-bedroom residence in a professionally managed Abuja development with staged delivery milestones and a transparent payment plan.",
      features: "Private terrace, Fitted kitchen, Backup power, Secure parking",
      cover: path.join(root, "public", "images", "nestora", "katampe-residences.webp"),
    });
    await page.screenshot({ path: path.join(screenshotDir, "developer-inventory-and-listing.png"), fullPage: true });
    await logoutProfessional();
  });

  await scenario("administrator publishes the developer listing through UI", async () => {
    await approveListing(developerListingTitle);
  });

  await scenario("buyer requests developer inspection and starts a conversation through UI", async () => {
    await login(demoAccountByKey.renter.email, "/my-nestora");
    await open(`/properties/${developerListingId}`);
    await expectVisible(page.getByRole("heading", { name: developerListingTitle, level: 1 }), "published developer listing");
    await page.getByLabel("Preferred viewing date").fill(futureDate(12));
    await page.getByRole("button", { name: "Request an inspection" }).click();
    await expectVisible(page.getByRole("heading", { name: "Request received" }), "developer inspection request");
    await sendNewListingMessage(developerListingId, `Please share the payment schedule for ${developerListingTitle}.`);
    await logoutFromHeader();
  });

  await scenario("developer processes buyer lead inspection messaging and marketing through UI", async () => {
    await login(demoAccountByKey.developer.email, "/workspace/developer");
    await page.getByRole("button", { name: "Buyer leads", exact: true }).click();
    const lead = page.locator(".workspace-record").filter({ hasText: developerListingTitle }).first();
    await expectVisible(lead, "developer buyer lead");
    await lead.locator("select[name=stage]").selectOption("qualified");
    await lead.locator("select[name=priority]").selectOption("high");
    await lead.locator("input[name=nextAction]").fill("Send the documented payment schedule");
    await lead.getByRole("button", { name: "Update" }).click();
    await page.getByRole("button", { name: "Inspections", exact: true }).click();
    const inspection = page.locator(".workspace-record").filter({ hasText: developerListingTitle }).first();
    await expectVisible(inspection, "developer inspection");
    await inspection.locator("select[name=status]").selectOption("confirmed");
    await inspection.locator("textarea[name=notes]").fill("Buyer requested the full payment schedule before the confirmed viewing.");
    await inspection.getByRole("button", { name: "Save inspection" }).click();
    await replyToConversation(`Please share the payment schedule for ${developerListingTitle}.`, `The payment schedule and confirmed viewing details for ${developerListingTitle} are now recorded here.`);
    await open("/workspace/developer");
    await generateMarketing("Marketing", "development_brochure", developerListingTitle, developerListingId);
    await page.screenshot({ path: path.join(screenshotDir, "developer-buyer-operations.png"), fullPage: true });
    await logoutProfessional();
  });

  await scenario("hotel creates a stay listing and listing-specific room inventory through UI", async () => {
    await login(demoAccountByKey.hotel.email, "/workspace/host");
    hotelListingId = await createListing({
      role: "host",
      title: hotelListingTitle,
      category: "stay",
      propertyType: "Executive serviced suite",
      addressLine1: "21 Alex Ekwueme Way",
      addressLine2: "Jabi District",
      priceAmount: "165000",
      bedrooms: "1",
      bathrooms: "1.5",
      areaSqm: "74",
      description: "A polished Abuja executive stay with attentive guest operations, reliable power, secure access, and a comfortable work-ready living area.",
      features: "Breakfast, Wi-Fi, Airport transfer, Backup power",
      serviceCharge: "20000",
      cleaningFee: "35000",
      cover: path.join(root, "public", "images", "nestora", "jabi-serviced-suite.webp"),
    });
    await page.getByRole("button", { name: "Rooms", exact: true }).click();
    await page.getByRole("button", { name: "Room type", exact: true }).click();
    const roomTypeForm = page.locator(".workspace-form").filter({ has: page.locator("select[name=listingId]") });
    await roomTypeForm.locator("select[name=listingId]").selectOption({ label: hotelListingTitle });
    await roomTypeForm.locator("input[name=code]").fill(roomTypeCode);
    await roomTypeForm.locator("input[name=name]").fill(`Executive Suite ${suffix}`);
    await roomTypeForm.locator("input[name=capacity]").fill("4");
    await roomTypeForm.locator("input[name=nightlyRate]").fill("165000");
    await roomTypeForm.getByRole("button", { name: "Create room type" }).click();
    await page.getByRole("button", { name: "Add room" }).click();
    const roomForm = page.locator(".workspace-form").filter({ has: page.locator("select[name=roomTypeId]") });
    await roomForm.locator("select[name=roomTypeId]").selectOption({ label: `${hotelListingTitle} · Executive Suite ${suffix}` });
    await roomForm.locator("input[name=code]").fill(roomCode);
    await roomForm.getByRole("button", { name: "Create room" }).click();
    await expectVisible(page.locator(".workspace-record").filter({ hasText: roomCode }), "created hotel room");
    await page.screenshot({ path: path.join(screenshotDir, "hotel-listing-and-inventory.png"), fullPage: true });
    await logoutProfessional();
  });

  await scenario("administrator publishes the hotel listing through UI", async () => {
    await approveListing(hotelListingTitle);
  });

  await scenario("guest selects room type books and receives overlap protection through UI", async () => {
    await login(demoAccountByKey.renter.email, "/my-nestora");
    const checkIn = futureDate(30);
    await open(`/properties/${hotelListingId}`);
    await expectVisible(page.getByRole("heading", { name: hotelListingTitle, level: 1 }), "published hotel listing");
    await page.getByLabel("Room type").selectOption({ index: 1 });
    await page.getByLabel("Check-in date").fill(checkIn);
    await page.getByLabel("Number of nights").fill("3");
    await page.getByLabel("Number of guests").selectOption("4");
    await page.getByRole("button", { name: "Request to book" }).click();
    await expectVisible(page.getByRole("heading", { name: "Request received" }), "hotel booking request");
    await open("/my-nestora");
    await page.getByRole("button", { name: "Trips & bookings" }).click();
    const booking = page.locator(".account-list a").filter({ hasText: hotelListingTitle }).first();
    await expectVisible(booking.getByText("₦550,000"), "server-calculated booking total with disclosed fees");

    await open(`/properties/${hotelListingId}`);
    await page.getByLabel("Room type").selectOption({ index: 1 });
    await page.getByLabel("Check-in date").fill(checkIn);
    await page.getByLabel("Number of nights").fill("3");
    await page.getByLabel("Number of guests").selectOption("4");
    expectedAvailabilityConflict = true;
    await page.getByRole("button", { name: "Request to book" }).click();
    await expectVisible(page.getByRole("alert").filter({ hasText: "No room is available" }), "overlapping reservation rejection");
    expectedAvailabilityConflict = false;
    await page.screenshot({ path: path.join(screenshotDir, "hotel-overlap-protection.png"), fullPage: true });
    await sendNewListingMessage(hotelListingId, `Can you confirm airport pickup for ${hotelListingTitle}?`);
    await logoutFromHeader();
  });

  await scenario("hotel confirms reservation updates room replies and generates marketing through UI", async () => {
    await login(demoAccountByKey.hotel.email, "/workspace/host");
    await page.getByRole("button", { name: "Reservations", exact: true }).click();
    const reservation = page.locator(".workspace-record").filter({ hasText: roomCode }).first();
    await expectVisible(reservation, "hotel reservation");
    await reservation.locator("select[name=status]").selectOption("confirmed");
    await reservation.locator("select[name=paymentStatus]").selectOption("paid");
    await reservation.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: "Rooms", exact: true }).click();
    const room = page.locator(".workspace-record").filter({ hasText: roomCode }).first();
    await room.locator("select[name=status]").selectOption("occupied");
    await room.getByRole("button", { name: "Update room" }).click();
    await replyToConversation(`Can you confirm airport pickup for ${hotelListingTitle}?`, `Airport pickup for ${hotelListingTitle} can be arranged, and your reservation is confirmed.`);
    await open("/workspace/host");
    await generateMarketing("Marketing", "hotel_flyer", hotelListingTitle, hotelListingId);
    await page.screenshot({ path: path.join(screenshotDir, "hotel-reservation-operations.png"), fullPage: true });
  });
} catch (error) {
  fatalError = error;
} finally {
  await browser.close();
}

const evidence = { generatedAt: new Date().toISOString(), baseUrl, projectName, developerListingId, developerListingTitle, hotelListingId, hotelListingTitle, roomCode, results };
await fs.writeFile(path.join(dataDir, "local-specialist-browser-qa-results.json"), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
if (fatalError || results.some((item) => item.status === "fail" || item.status === "warning")) process.exitCode = 1;

async function scenario(name, run) {
  currentScenario = name;
  const started = Date.now();
  try { await run(); results.push({ name, status: "pass", durationMs: Date.now() - started }); }
  catch (error) { results.push({ name, status: "fail", durationMs: Date.now() - started, error: error.message }); throw error; }
}

async function login(email, destination) {
  await open("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.locator(".auth-submit").click();
  await page.waitForURL(`**${destination}`, { waitUntil: "domcontentloaded" });
  assert(new URL(page.url()).pathname === destination, `${email} landed on ${new URL(page.url()).pathname}`);
  await page.locator(".pro-user, .my-user, .admin-shell, .admin-console").first().waitFor({ state: "attached" });
  await page.waitForTimeout(750);
}

async function approveListing(title) {
  await login(demoAccountByKey.admin.email, "/admin");
  await page.getByRole("button", { name: /Listing approval/ }).click();
  await page.locator(".review-queue > button").filter({ hasText: title }).click();
  await page.locator(".admin-decision select[name=status]").selectOption("approved");
  await page.locator(".admin-decision textarea[name=reason]").fill("Listing details, disclosed costs, availability, and media passed the local publication review.");
  await page.getByRole("button", { name: "Record decision" }).click();
  await expectVisible(page.getByText("Decision recorded."), `${title} publication decision`);
  await logoutAdmin();
}

async function createListing(config) {
  await page.getByRole("button", { name: "Listings", exact: true }).click();
  await page.getByRole("button", { name: "Add listing" }).click();
  const form = page.locator(".listing-editor--create");
  await form.locator("select[name=category]").selectOption(config.category);
  await form.locator("input[name=title]").fill(config.title);
  await form.locator("input[name=propertyType]").fill(config.propertyType);
  await form.locator("input[name=addressLine1]").fill(config.addressLine1);
  await form.locator("input[name=addressLine2]").fill(config.addressLine2 || "");
  await form.locator("input[name=city]").fill("Abuja");
  await form.locator("input[name=stateRegion]").fill("FCT");
  await form.locator("input[name=postalCode]").fill("900108");
  await form.locator("input[name=priceAmount]").fill(config.priceAmount);
  await form.locator("input[name=bedrooms]").fill(config.bedrooms);
  await form.locator("input[name=bathrooms]").fill(config.bathrooms);
  await form.locator("input[name=areaSqm]").fill(config.areaSqm);
  await form.locator("textarea[name=description]").fill(config.description);
  await form.locator("input[name=features]").fill(config.features);
  await form.locator("input[name=serviceCharge]").fill(config.serviceCharge || "0");
  await form.locator("input[name=cleaningFee]").fill(config.cleaningFee || "0");
  await form.getByRole("button", { name: "Create draft" }).click();
  const record = page.locator(".listing-record").filter({ hasText: config.title });
  await expectVisible(record, `${config.title} draft`);
  const previewHref = await record.getByRole("link", { name: "Preview" }).getAttribute("href");
  const id = previewHref.split("/properties/")[1].split("?")[0];
  await record.getByRole("button", { name: /Media/ }).click();
  const uploadForm = page.locator(".media-upload-form");
  await uploadForm.locator("select[name=mediaRole]").selectOption("cover");
  await uploadForm.locator("input[type=file]").setInputFiles(config.cover);
  await uploadForm.getByRole("button", { name: "Upload" }).click();
  await expectVisible(page.locator(".media-list").getByText(path.basename(config.cover)), `${config.title} cover image`);
  await record.getByRole("button", { name: "Submit for review" }).click();
  await expectVisible(record.getByText("Pending review"), `${config.title} submitted state`);
  return id;
}

async function fillCreateForm(buttonName, values) {
  const form = page.locator(".workspace-form").filter({ has: page.getByRole("button", { name: buttonName }) });
  for (const [name, value] of Object.entries(values)) {
    const field = form.locator(`[name=${name}]`);
    if (typeof value === "object") await field.selectOption(value);
    else await field.fill(value);
  }
  await form.getByRole("button", { name: buttonName }).click();
  await form.waitFor({ state: "detached" });
}

async function sendNewListingMessage(listingId, body) {
  await open(`/messages?property=${listingId}`);
  await page.locator(".message-composer input[name=message]").fill(body);
  await page.getByRole("button", { name: "Send message" }).click();
  await expectVisible(page.locator(".message-history").getByText(body, { exact: true }), "new listing conversation message");
}

async function replyToConversation(preview, reply) {
  await open("/messages");
  const conversation = page.locator(".conversation-list nav > button").filter({ hasText: preview }).first();
  await expectVisible(conversation, "specialist customer conversation");
  await conversation.click();
  await page.locator(".message-composer input[name=message]").fill(reply);
  await page.getByRole("button", { name: "Send message" }).click();
  await expectVisible(page.locator(".message-history").getByText(reply, { exact: true }), "specialist conversation reply");
}

async function generateMarketing(navName, kind, title, listingId) {
  await page.getByRole("button", { name: navName, exact: true }).click();
  await page.locator(".marketing-form select[name=kind]").selectOption(kind);
  await page.locator(".marketing-form select[name=listingId]").selectOption({ label: title });
  await page.locator(".marketing-form input[name=qrTarget]").fill(`/properties/${listingId}`);
  await page.getByRole("button", { name: "Generate material" }).click();
  await page.locator(".workspace-record").filter({ hasText: title }).getByRole("link", { name: "Download" }).first().waitFor({ state: "visible", timeout: 60_000 }).catch(() => { throw new Error(`${kind} PDF was not visible`); });
}

async function logoutProfessional() {
  const response = page.waitForResponse((item) => item.url().endsWith("/api/auth/logout") && item.request().method() === "POST");
  await page.locator(".pro-sidebar__bottom button").filter({ hasText: "Logout" }).click();
  await response;
  await page.waitForURL("**/login", { waitUntil: "domcontentloaded" });
}

async function logoutAdmin() {
  const response = page.waitForResponse((item) => item.url().endsWith("/api/auth/logout"));
  await page.locator(".admin-signout").click();
  await response;
  await page.waitForURL("**/login", { waitUntil: "domcontentloaded" });
}

async function logoutFromHeader() {
  await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  await open("/login");
}

async function open(pathname) {
  await page.goto(pathname, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (pathname.startsWith("/workspace/")) await page.locator(".pro-user").waitFor({ state: "attached" });
  if (pathname === "/my-nestora") await page.locator(".my-user").waitFor({ state: "attached" });
  if (pathname === "/admin") await page.locator(".admin-shell, .admin-console").first().waitFor({ state: "attached" });
  if (pathname.startsWith("/properties/")) await page.locator('.inquiry-panel[data-inquiry-ready="true"]').waitFor({ state: "attached" });
  if (pathname !== "/login") await page.waitForTimeout(750);
}
async function expectVisible(locator, label) { await locator.waitFor({ state: "visible", timeout: 20_000 }).catch(() => { throw new Error(`${label} was not visible`); }); }
function futureDate(days) { return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10); }
function assert(condition, message) { if (!condition) throw new Error(message); }

async function resolveBrowserExecutable() {
  if (process.env.NESTORA_CHROME_PATH) return process.env.NESTORA_CHROME_PATH;
  const systemChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  try { await fs.access(systemChrome); return systemChrome; } catch { return undefined; }
}
