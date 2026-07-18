import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { demoAccountByKey } from "../lib/demo-accounts.js";

const baseUrl = String(process.env.NESTORA_E2E_BASE_URL || "http://localhost:3040").replace(/\/$/, "");
const password = process.env.NESTORA_E2E_PASSWORD;
if (!password) throw new Error("NESTORA_E2E_PASSWORD is required.");
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseUrl)) throw new Error("Operations browser QA is restricted to a local Nestora origin.");

const root = process.cwd();
const screenshotDir = path.join(root, "docs", "qa", "evidence", "screenshots", "local-operations");
const dataDir = path.join(root, "docs", "qa", "evidence", "data");
await fs.mkdir(screenshotDir, { recursive: true });
await fs.mkdir(dataDir, { recursive: true });

const results = [];
const suffix = Date.now().toString(36).slice(-7);
const invitationEmail = `agency-invite-${suffix}@example.test`;
const routingRuleName = `Abuja rental routing ${suffix}`;
let fatalError = null;
let currentScenario = "initialization";

const browser = await chromium.launch({ headless: true, executablePath: process.env.NESTORA_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(30_000);
page.setDefaultNavigationTimeout(60_000);
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) results.push({ name: "browser console", status: "warning", detail: `${currentScenario} | ${message.text()}` });
});
page.on("pageerror", (error) => results.push({ name: "page error", status: "warning", detail: `${currentScenario} | ${page.url()} | ${error.message}` }));
page.on("response", (response) => {
  if (response.status() < 400) return;
  if (response.status() === 401 && response.url().endsWith("/api/auth/session")) return;
  results.push({ name: "failed request", status: "warning", detail: `${currentScenario} | ${response.status()} ${response.request().method()} ${response.url()}` });
});

try {
  await scenario("agency manages team access invitations and routing through UI", async () => {
    await login(demoAccountByKey.agency.email, "/workspace/agency");
    await page.getByRole("button", { name: "Team & routing", exact: true }).click();
    await expectVisible(page.getByRole("heading", { name: "Team and lead routing" }), "agency team operations");

    const agentMember = page.locator(".team-row").filter({ hasText: demoAccountByKey.agent.email }).first();
    await expectVisible(agentMember, "agency agent membership");
    await agentMember.getByLabel(`Role for ${demoAccountByKey.agent.name}`).selectOption("sales");
    await agentMember.getByRole("button", { name: "Save" }).click();
    await expectVisible(page.getByText("Changes saved."), "team member update notice");
    const updatedMember = page.locator(".team-row").filter({ hasText: demoAccountByKey.agent.email }).first();
    await updatedMember.getByLabel(`Role for ${demoAccountByKey.agent.name}`).selectOption("agent");
    await updatedMember.getByRole("button", { name: "Save" }).click();

    await page.getByRole("button", { name: "Invite", exact: true }).click();
    const inviteForm = page.locator(".workspace-form").filter({ has: page.getByRole("button", { name: "Queue invitation" }) });
    await inviteForm.locator("input[name=email]").fill(invitationEmail);
    await inviteForm.locator("select[name=role]").selectOption("agent");
    await inviteForm.getByRole("button", { name: "Queue invitation" }).click();
    await expectVisible(page.locator(".rule-row").filter({ hasText: invitationEmail }), "pending agency invitation");

    await page.getByRole("button", { name: "Routing rule", exact: true }).click();
    const routingForm = page.locator(".workspace-form").filter({ has: page.getByRole("button", { name: "Create rule" }) });
    await routingForm.locator("input[name=name]").fill(routingRuleName);
    await routingForm.locator("select[name=source]").selectOption("listing");
    await routingForm.locator("select[name=listingCategory]").selectOption("rent");
    await routingForm.locator("select[name=strategy]").selectOption("fixed");
    await routingForm.locator("select[name=assigneeUserId]").selectOption({ label: demoAccountByKey.agent.name });
    await routingForm.locator("input[name=priority]").fill("20");
    await routingForm.getByRole("button", { name: "Create rule" }).click();
    await expectVisible(page.locator(".rule-row").filter({ hasText: routingRuleName }), "new agency routing rule");
    await page.screenshot({ path: path.join(screenshotDir, "agency-team-and-routing.png"), fullPage: true });
  });

  await scenario("agency assigns a lead and accesses shared listings inspections and marketing through UI", async () => {
    await page.getByRole("button", { name: "Lead desk", exact: true }).click();
    const lead = page.locator(".workspace-record").filter({ has: page.locator('select[name="ownerUserId"]') }).first();
    await expectVisible(lead, "agency lead record");
    await lead.locator('select[name="ownerUserId"]').selectOption({ label: `${demoAccountByKey.agent.name} · Agent` });
    await lead.locator('select[name="stage"]').selectOption("qualified");
    await lead.locator('select[name="priority"]').selectOption("high");
    await lead.locator('input[name="nextAction"]').fill("Share the verified fee schedule and confirm inspection availability.");
    await lead.getByRole("button", { name: "Update" }).click();
    await expectVisible(page.getByText("Changes saved."), "agency lead assignment notice");

    await page.getByRole("button", { name: "Listings", exact: true }).click();
    await expectVisible(page.getByRole("heading", { name: "Listings and media" }), "agency listings access");
    const listing = page.locator(".listing-record").first();
    await expectVisible(listing, "agency listing record");
    const listingTitle = (await listing.locator(".record-primary strong").innerText()).trim();
    const previewHref = await listing.getByRole("link", { name: "Preview" }).getAttribute("href");
    const listingId = previewHref.split("/properties/")[1].split("?")[0];

    await page.getByRole("button", { name: "Inspections", exact: true }).click();
    await expectVisible(page.getByRole("heading", { name: "Inspections", exact: true }), "agency inspection access");
    await expectVisible(page.locator(".workspace-record").first(), "agency inspection record");

    await page.getByRole("button", { name: "Marketing", exact: true }).click();
    await page.locator('.marketing-form select[name="kind"]').selectOption("rental_flyer");
    await page.locator('.marketing-form select[name="listingId"]').selectOption({ label: listingTitle });
    await page.locator('.marketing-form input[name="qrTarget"]').fill(`/properties/${listingId}`);
    await page.getByRole("button", { name: "Generate material" }).click();
    await expectVisible(page.locator(".workspace-record").filter({ hasText: listingTitle }).getByRole("link", { name: "Download" }).first(), "agency marketing PDF");
    await page.screenshot({ path: path.join(screenshotDir, "agency-leads-inspections-and-marketing.png"), fullPage: true });
    await logoutProfessional();
  });

  await scenario("administrator resolves a listing report and approves verification through UI", async () => {
    await login(demoAccountByKey.admin.email, "/admin");
    await page.getByRole("button", { name: /Listing reports/ }).click();
    const report = page.locator(".review-queue > button").filter({ hasText: "The Courtyard Residence - Demonstration" }).first();
    await expectVisible(report, "open listing report");
    await report.click();
    await page.locator('.admin-decision select[name="status"]').selectOption("resolved");
    await page.locator('.admin-decision textarea[name="reason"]').fill("The disclosed service charge was reviewed against the listing record and the report is resolved.");
    await page.getByRole("button", { name: "Record decision" }).click();
    await expectVisible(page.getByText("Decision recorded."), "listing report decision");

    await page.getByRole("button", { name: /Verification/ }).click();
    const verification = page.locator(".review-queue > button").filter({ hasText: demoAccountByKey.agent.name }).first();
    await expectVisible(verification, "agent verification case");
    await verification.click();
    await page.locator('.admin-decision select[name="status"]').selectOption("approved");
    await page.locator('.admin-decision textarea[name="reason"]').fill("Identity and professional profile evidence meet the local commercial-readiness review criteria.");
    await page.getByRole("button", { name: "Record decision" }).click();
    await expectVisible(page.getByText("Decision recorded."), "verification decision");
  });

  await scenario("administrator suspends and reinstates user access with durable audit evidence through UI", async () => {
    await page.getByRole("button", { name: /User access/ }).click();
    let user = page.locator(".review-queue > button").filter({ hasText: demoAccountByKey.developer.email }).first();
    await expectVisible(user, "developer user access record");
    await user.click();
    await page.locator('.admin-decision select[name="status"]').selectOption("suspended");
    await page.locator('.admin-decision textarea[name="reason"]').fill("Temporary access review performed during the local administration workflow test.");
    await page.getByRole("button", { name: "Record decision" }).click();
    await expectVisible(page.getByText("Decision recorded."), "user suspension decision");

    user = page.locator(".review-queue > button").filter({ hasText: demoAccountByKey.developer.email }).first();
    await expectVisible(user, "suspended developer user record");
    await user.click();
    await page.locator('.admin-decision select[name="status"]').selectOption("active");
    await page.locator('.admin-decision textarea[name="reason"]').fill("Access reinstated after the local administration workflow review completed successfully.");
    await page.getByRole("button", { name: "Record decision" }).click();
    await expectVisible(page.getByText("Decision recorded."), "user reinstatement decision");

    await page.getByRole("button", { name: "Audit log", exact: true }).click();
    await expectVisible(page.locator(".audit-list").getByText("moderation.user_status_changed", { exact: true }).first(), "user-status audit event");
    await expectVisible(page.locator(".audit-list").getByText("moderation.verification_reviewed", { exact: true }).first(), "verification audit event");
    await expectVisible(page.locator(".audit-list").getByText("moderation.report_reviewed", { exact: true }).first(), "report audit event");
    await page.screenshot({ path: path.join(screenshotDir, "admin-moderation-and-audit.png"), fullPage: true });
  });
} catch (error) {
  fatalError = error;
} finally {
  await browser.close();
}

const evidence = { generatedAt: new Date().toISOString(), baseUrl, invitationEmail, routingRuleName, results };
await fs.writeFile(path.join(dataDir, "local-agency-admin-browser-qa-results.json"), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
if (fatalError || results.some((item) => item.status === "fail" || item.status === "warning")) process.exitCode = 1;

async function scenario(name, run) {
  currentScenario = name;
  const started = Date.now();
  try { await run(); results.push({ name, status: "pass", durationMs: Date.now() - started }); }
  catch (error) { results.push({ name, status: "fail", durationMs: Date.now() - started, error: error.message }); throw error; }
}

async function login(email, destination) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.locator(".auth-submit").click();
  await page.waitForURL(`**${destination}`, { waitUntil: "domcontentloaded" });
  if (new URL(page.url()).pathname !== destination) throw new Error(`${email} landed on ${new URL(page.url()).pathname}`);
  await page.getByLabel("Open account").waitFor({ state: "attached" });
  await page.waitForTimeout(750);
}

async function logoutProfessional() {
  const response = page.waitForResponse((item) => item.url().endsWith("/api/auth/logout") && item.request().method() === "POST");
  await page.locator(".pro-sidebar__bottom button").filter({ hasText: "Sign out" }).click();
  await response;
  await page.waitForURL("**/login", { waitUntil: "domcontentloaded" });
}

async function expectVisible(locator, label) {
  await locator.waitFor({ state: "visible", timeout: 20_000 }).catch(() => { throw new Error(`${label} was not visible`); });
}
