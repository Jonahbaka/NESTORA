import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { demoAccountByKey } from "../lib/demo-accounts.js";

const baseUrl = String(process.env.NESTORA_E2E_BASE_URL || "http://localhost:3040").replace(/\/$/, "");
const password = process.env.NESTORA_E2E_PASSWORD;
if (!password) throw new Error("NESTORA_E2E_PASSWORD is required.");
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseUrl)) throw new Error("Browser QA is restricted to a local Nestora origin.");

const root = process.cwd();
const screenshotDir = path.join(root, "docs", "qa", "evidence", "screenshots", "local-product");
const dataDir = path.join(root, "docs", "qa", "evidence", "data");
await fs.mkdir(screenshotDir, { recursive: true });
await fs.mkdir(dataDir, { recursive: true });
const results = [];
const browser = await chromium.launch({ headless: true, executablePath: await resolveBrowserExecutable() });
const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(30_000);
page.setDefaultNavigationTimeout(60_000);
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) results.push({ name: "browser console", status: "warning", detail: `${currentScenario} | ${page.url()} | ${message.text()}` });
});
page.on("pageerror", (error) => {
  if (error.message.includes("Minified React error #418") && error.message.includes("args[]=HTML")) return;
  results.push({ name: "page error", status: "warning", detail: `${currentScenario} | ${page.url()} | ${error.message}` });
});
page.on("response", (response) => {
  if (response.status() < 400) return;
  if (response.status() === 401 && response.url().endsWith("/api/auth/session")) return;
  results.push({ name: "failed request", status: "warning", detail: `${response.status()} ${response.request().method()} ${response.url()}` });
});

const suffix = Date.now().toString(36).slice(-7);
const listingTitle = `Wuye QA Residence ${suffix}`;
let listingId;
let qrTarget;
let fatalError = null;
let currentScenario = "initialization";

try {
  for (const [key, destination] of [["developer", "/workspace/developer"], ["hotel", "/workspace/host"], ["agency", "/workspace/agency"]]) {
    await scenario(`${key} login and role landing`, async () => {
      await login(demoAccountByKey[key].email, destination);
      await expectVisible(page.getByText(demoAccountByKey[key].name, { exact: true }).first(), `${key} authenticated identity`);
      await logoutProfessional();
    });
  }

  await scenario("agent profile listing media and submission through UI", async () => {
    await login(demoAccountByKey.agent.email, "/workspace/agent");
    await page.screenshot({ path: path.join(screenshotDir, "agent-workspace-desktop.png"), fullPage: true });
    await page.getByRole("button", { name: "Professional profile" }).click();
    await page.locator(".profile-editor input[name=headline]").fill("Abuja residential property advisor");
    await page.locator(".profile-editor textarea[name=biography]").fill("I help renters and buyers compare well-documented homes across Abuja with clear fees, inspection planning, and secure on-platform follow-up.");
    await page.locator(".profile-editor input[name=serviceAreas]").fill("Wuye, Maitama, Guzape");
    await page.locator(".profile-editor input[name=languages]").fill("English, Hausa");
    await page.locator(".profile-editor input[name=specialisations]").fill("Residential rentals, Buyer representation");
    await page.locator(".profile-photo-actions input[type=file]").setInputFiles(path.join(root, "public", "images", "nestora", "amina-bello-agent.webp"));
    await page.locator(".profile-photo-actions button[type=submit]").click();
    await expectVisible(page.locator(".profile-photo img"), "uploaded professional image");
    await page.locator(".profile-editor button[type=submit]").click();
    await page.getByRole("button", { name: "Listings" }).click();
    await page.getByRole("button", { name: "Add listing" }).click();
    const create = page.locator(".listing-editor--create");
    await create.locator("input[name=title]").fill(listingTitle);
    await create.locator("input[name=propertyType]").fill("Three-bedroom apartment");
    await create.locator("input[name=addressLine1]").fill("18 Mambilla Street");
    await create.locator("input[name=addressLine2]").fill("Wuye District");
    await create.locator("input[name=city]").fill("Abuja");
    await create.locator("input[name=stateRegion]").fill("FCT");
    await create.locator("input[name=postalCode]").fill("900108");
    await create.locator("input[name=priceAmount]").fill("8500000");
    await create.locator("input[name=bedrooms]").fill("3");
    await create.locator("input[name=bathrooms]").fill("3.5");
    await create.locator("input[name=areaSqm]").fill("215");
    await create.locator("textarea[name=description]").fill("A bright three-bedroom Abuja residence with generous living areas, fitted kitchen, secure parking, and documented backup power arrangements.");
    await create.locator("input[name=features]").fill("Balcony, Fitted kitchen, Inverter, Secure parking");
    await create.locator("input[name=serviceCharge]").fill("620000");
    await create.locator("input[name=cautionDeposit]").fill("500000");
    await create.locator("input[name=agencyFee]").fill("850000");
    await create.locator("input[name=legalFee]").fill("425000");
    await create.locator("input[name=tourEnabled]").check();
    await create.getByRole("button", { name: "Create draft" }).click();
    const record = page.locator(".listing-record").filter({ hasText: listingTitle });
    await expectVisible(record, "created listing record");
    const previewHref = await record.getByRole("link", { name: "Preview" }).getAttribute("href");
    listingId = previewHref.split("/properties/")[1].split("?")[0];
    await record.getByRole("button", { name: /Media/ }).click();
    await uploadMedia("cover", path.join(root, "public", "images", "nestora", "wuye-apartment.webp"));
    await uploadMedia("panorama", path.join(root, "public", "images", "nestora", "hero-abuja-residence.webp"), "Living room");
    await uploadMedia("walkthrough", path.join(root, "public", "media", "nestora-home-story.mp4"));
    await record.getByRole("button", { name: "Submit for review" }).click();
    await expectVisible(record.getByText("Pending review"), "submitted listing status");
    await page.screenshot({ path: path.join(screenshotDir, "agent-listing-submitted.png"), fullPage: true });
    await logoutProfessional(true);
  });

  await scenario("administrator reviews and publishes through UI", async () => {
    await login(demoAccountByKey.admin.email, "/admin");
    await page.getByRole("button", { name: /Listing approval/ }).click();
    await page.locator(".review-queue > button").filter({ hasText: listingTitle }).click();
    await page.locator(".admin-decision select[name=status]").selectOption("approved");
    await page.locator(".admin-decision textarea[name=reason]").fill("Property details, fees, media, and availability passed the local publication review.");
    await page.getByRole("button", { name: "Record decision" }).click();
    await expectVisible(page.getByText("Decision recorded."), "admin publication confirmation");
    await page.screenshot({ path: path.join(screenshotDir, "admin-listing-review.png"), fullPage: true });
    await logoutAdmin();
  });

  await scenario("member saves enquires and books inspection through UI", async () => {
    await login(demoAccountByKey.renter.email, "/my-nestora");
    await open(`/properties/${listingId}`);
    await expectVisible(page.getByRole("heading", { name: listingTitle, level: 1 }), "public approved listing");
    await page.getByRole("button", { name: `Save ${listingTitle}` }).click();
    await expectVisible(page.getByRole("button", { name: `Remove ${listingTitle} from saved` }), "saved listing state");
    const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    await page.locator(".inquiry-panel input[name=date]").fill(tomorrow);
    await page.getByRole("button", { name: "Request an inspection" }).click();
    await expectVisible(page.getByRole("heading", { name: "Request received" }), "inspection request confirmation");
    await captureResponsiveListing();
    await open(`/tours/${listingId}`);
    await expectVisible(page.locator(".tour-canvas"), "interactive panorama canvas");
    await page.waitForTimeout(1800);
    const tourShot = path.join(screenshotDir, "virtual-tour-desktop.png");
    await page.screenshot({ path: tourShot, fullPage: true });
    const canvasShot = path.join(screenshotDir, "virtual-tour-canvas.png");
    await page.locator(".tour-canvas").screenshot({ path: canvasShot });
    const stats = await sharp(canvasShot).stats();
    assert(stats.channels.some((channel) => channel.stdev > 8), "virtual tour canvas rendered as a blank surface");
    await open(`/messages?property=${listingId}`);
    await page.locator(".message-composer input[name=message]").fill(`Is ${listingTitle} available for an evening viewing?`);
    await page.getByRole("button", { name: "Send message" }).click();
    await expectVisible(page.locator(".message-history").getByText(`Is ${listingTitle} available for an evening viewing?`, { exact: true }), "member enquiry message");
    await logoutFromHeader();
  });

  await scenario("agent receives lead replies confirms inspection and generates marketing", async () => {
    await login(demoAccountByKey.agent.email, "/workspace/agent");
    await page.getByRole("button", { name: "Leads" }).click();
    const lead = page.locator(".workspace-record").filter({ hasText: listingTitle }).first();
    await expectVisible(lead, "agent lead receipt");
    await lead.locator("select[name=stage]").selectOption("qualified");
    await lead.locator("input[name=nextAction]").fill("Confirm the preferred viewing time");
    await lead.getByRole("button", { name: "Update" }).click();
    await page.getByRole("button", { name: "Inspections" }).click();
    const inspection = page.locator(".workspace-record").filter({ hasText: listingTitle }).first();
    await expectVisible(inspection, "agent inspection receipt");
    await inspection.locator("select[name=status]").selectOption("confirmed");
    await inspection.getByRole("button", { name: "Save inspection" }).click();
    await open("/messages");
    const conversation = page.locator(".conversation-list nav > button").filter({ hasText: `Is ${listingTitle}` }).first();
    await expectVisible(conversation, "customer conversation in agent inbox");
    await conversation.click();
    const reply = `Yes, ${listingTitle} is available. Your preferred inspection has been confirmed.`;
    await page.locator(".message-composer input[name=message]").fill(reply);
    await page.getByRole("button", { name: "Send message" }).click();
    await expectVisible(page.locator(".message-history").getByText(reply, { exact: true }), "agent reply");
    await open("/workspace/agent");
    await page.getByRole("button", { name: "Marketing", exact: true }).click();
    await page.locator(".marketing-form select[name=kind]").selectOption("rental_flyer");
    await page.locator(".marketing-form select[name=listingId]").selectOption({ label: listingTitle });
    await page.locator(".marketing-form input[name=qrTarget]").fill(`/properties/${listingId}`);
    await page.getByRole("button", { name: "Generate material" }).click();
    const material = page.locator(".workspace-record").filter({ hasText: listingTitle }).first();
    await material.getByRole("link", { name: "Download" }).first().waitFor({ state: "visible", timeout: 60_000 }).catch(() => { throw new Error("generated marketing PDF was not visible"); });
    const downloadPromise = page.waitForEvent("download");
    await material.getByRole("link", { name: "Download" }).click({ noWaitAfter: true, timeout: 60_000 });
    const download = await downloadPromise;
    await download.saveAs(path.join(dataDir, `local-rental-flyer-${suffix}.pdf`));
    const marketing = await page.evaluate(async () => (await fetch("/api/workspace/marketing?workspace=agent", { cache: "no-store" })).json());
    qrTarget = marketing.materials.find((item) => item.listing_title === listingTitle)?.qr_target;
    assert(qrTarget?.includes("/r/"), "generated material did not receive an attributable QR target");
    await open(qrTarget);
    await page.waitForURL(`**/properties/${listingId}`);
    await open("/workspace/agent");
    await page.getByRole("button", { name: "Marketing", exact: true }).click();
    await expectVisible(page.locator(".workspace-record").filter({ hasText: listingTitle }).getByText(/1 QR opens/), "QR attribution count");
    await logoutProfessional();
  });

  await scenario("member receives reply and state persists after reauthentication", async () => {
    await login(demoAccountByKey.renter.email, "/my-nestora");
    await open("/messages");
    const conversation = page.locator(".conversation-list nav > button").filter({ hasText: "Your preferred inspection" }).first();
    await expectVisible(conversation, "agent reply in member inbox");
    await conversation.click();
    await expectVisible(page.locator(".message-history").getByText(/preferred inspection has been confirmed/), "member-visible agent reply");
    await open("/my-nestora");
    await page.locator(".my-tabs").waitFor({ state: "visible", timeout: 60_000 });
    await page.getByRole("button", { name: "Saved", exact: true }).click();
    await expectVisible(page.locator(".account-list").getByText(listingTitle, { exact: true }), "saved listing after reauthentication");
    await page.getByRole("button", { name: "Inspections" }).click();
    await expectVisible(page.locator(".account-list").filter({ hasText: listingTitle }), "persisted inspection after reauthentication");
  });
} catch (error) {
  fatalError = error;
} finally {
  await browser.close();
}

const evidence = { generatedAt: new Date().toISOString(), baseUrl, listingId, listingTitle, qrTarget, results };
await fs.writeFile(path.join(dataDir, "local-product-browser-qa-results.json"), JSON.stringify(evidence, null, 2));
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

async function logoutProfessional(checkInvalidation = false) {
  const response = page.waitForResponse((item) => item.url().endsWith("/api/auth/logout") && item.request().method() === "POST");
  await page.locator(".pro-sidebar__bottom button").filter({ hasText: "Logout" }).click();
  await response;
  await page.waitForURL("**/login**", { waitUntil: "domcontentloaded" });
  if (checkInvalidation) { await page.goto("/workspace/agent", { waitUntil: "domcontentloaded" }); await page.waitForURL("**/login**", { waitUntil: "domcontentloaded" }); }
}
async function logoutAdmin() { const response = page.waitForResponse((item) => item.url().endsWith("/api/auth/logout")); await page.locator(".admin-signout").click(); await response; await page.waitForURL("**/login**", { waitUntil: "domcontentloaded" }); }
async function logoutFromHeader() { await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" })); await open("/login"); }

async function open(pathname) {
  await page.goto(pathname, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (new URL(page.url()).pathname.startsWith("/properties/")) await page.locator('.inquiry-panel[data-inquiry-ready="true"]').waitFor({ state: "attached" });
}

async function uploadMedia(role, filePath, sceneLabel = "") {
  const form = page.locator(".media-upload-form");
  await form.locator("select[name=mediaRole]").selectOption(role);
  if (sceneLabel) await form.locator("input[name=sceneLabel]").fill(sceneLabel);
  await form.locator("input[type=file]").setInputFiles(filePath);
  const filename = path.basename(filePath);
  await form.getByRole("button", { name: "Upload" }).click();
  await expectVisible(page.locator(".media-list").getByText(filename), `${role} upload`);
}

async function captureResponsiveListing() {
  const sizes = [[320, "320"], [360, "360"], [390, "390"], [430, "430"], [768, "tablet"], [1440, "desktop"]];
  for (const [width, label] of sizes) {
    await page.setViewportSize({ width, height: width < 600 ? 860 : 1000 });
    await open(`/properties/${listingId}`);
    await page.locator('.inquiry-panel[data-inquiry-ready="true"]').waitFor({ state: "attached" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `${label}px property page has ${overflow}px horizontal clipping`);
    await loadLazyMedia();
    await page.screenshot({ path: path.join(screenshotDir, `public-listing-${label}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}

async function loadLazyMedia() {
  await page.evaluate(async () => {
    for (let top = 0; top < document.documentElement.scrollHeight; top += 650) {
      window.scrollTo(0, top);
      await new Promise((resolve) => window.setTimeout(resolve, 45));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);
}

async function expectVisible(locator, label) { await locator.waitFor({ state: "visible", timeout: 20_000 }).catch(() => { throw new Error(`${label} was not visible`); }); }
function assert(condition, message) { if (!condition) throw new Error(message); }

async function resolveBrowserExecutable() {
  if (process.env.NESTORA_CHROME_PATH) return process.env.NESTORA_CHROME_PATH;
  const systemChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  try { await fs.access(systemChrome); return systemChrome; } catch { return undefined; }
}
