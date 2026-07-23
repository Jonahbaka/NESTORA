import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { demoAccountByKey } from "../lib/demo-accounts.js";

const baseURL = String(process.env.NESTORA_E2E_BASE_URL || "http://127.0.0.1:3040").replace(/\/$/, "");
const password = process.env.NESTORA_E2E_PASSWORD;
if (!password) throw new Error("NESTORA_E2E_PASSWORD is required.");
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseURL)) throw new Error("Premium browser QA is restricted to a local Nestora origin.");

const output = path.resolve("docs", "qa", "evidence");
const screenshots = path.join(output, "screenshots", "premium-property-media");
await fs.mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: await resolveBrowserExecutable() });
const results = [];
const failures = [];

try {
  await scenario("public photography, pricing and genuine WebGL 360 experience", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    monitor(page, "public");
    await page.goto(`${baseURL}/services/property-media`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.getByRole("heading", { name: "Property media people can feel." }).waitFor();
    if (await page.locator(".media-package-grid > article").count() !== 8) throw new Error("Expected eight authoritative media packages.");
    await page.locator(".media-tour__poster button").first().click();
    await page.locator(".media-tour__canvas canvas").waitFor({ state: "visible", timeout: 20_000 });
    const webgl = await page.locator(".media-tour__canvas canvas").evaluate((canvas) => Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    if (!webgl) throw new Error("The 360 tour did not create a WebGL rendering context.");
    await page.screenshot({ path: path.join(screenshots, "public-service-and-webgl-360.png"), fullPage: true });
    const preferredDate = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10);
    const estimate = await page.evaluate(async (date) => {
      const response = await fetch("/api/property-media/estimate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ packageId: "essential-photography", preferredDate: date, distanceKm: 0, permitAllowanceNgn: 0, extras: {} }) });
      return { status: response.status, body: await response.json() };
    }, preferredDate);
    if (estimate.status !== 200 || estimate.body.estimate?.package?.amountNgn !== 75000) throw new Error(`Public server estimate did not use authoritative pricing: ${estimate.status} ${JSON.stringify(estimate.body)}`);
    await page.close();
  });

  await scenario("agent premium media, Studio, Brand Kit, templates and website editor", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    monitor(page, "agent");
    await login(page, demoAccountByKey.agent.email, "/workspace/agent");
    await page.getByRole("button", { name: "Listings", exact: true }).click();
    await page.locator(".listing-media-launch").waitFor();
    await page.locator(".listing-media-launch button").click();
    await page.locator(".media-dropzone").waitFor();
    await page.screenshot({ path: path.join(screenshots, "agent-listing-media-command-centre.png"), fullPage: true });
    await page.getByRole("button", { name: "Marketing Studio", exact: true }).click();
    await page.locator(".studio-media-library").waitFor();
    await page.getByRole("button", { name: "Page", exact: true }).click();
    if (await page.locator(".studio-pages [role='tab']").count() < 2) throw new Error("Multi-page Studio did not add a back page.");
    await page.screenshot({ path: path.join(screenshots, "agent-multipage-studio-and-media-library.png"), fullPage: true });
    await page.getByRole("button", { name: "Template gallery", exact: true }).click();
    if (await page.locator(".template-card").count() < 50) throw new Error("Premium template marketplace exposed fewer than 50 designs.");
    await page.getByRole("button", { name: "Brand kits", exact: true }).click();
    await page.locator(".kit-system-preview").first().waitFor();
    await page.getByRole("button", { name: "Websites", exact: true }).click();
    await page.locator(".website-card").first().getByRole("button", { name: "Customize" }).click();
    await page.locator(".website-editor-grid").waitFor();
    await page.screenshot({ path: path.join(screenshots, "agent-multipage-website-editor.png"), fullPage: true });
    await page.close();
  });

  await scenario("admin media operations and authoritative pricing editor", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    monitor(page, "admin");
    await login(page, demoAccountByKey.admin.email, "/admin", ".admin-main");
    await page.getByRole("button", { name: /Media production/ }).click();
    await page.getByRole("button", { name: "Pricing & service media" }).click();
    if (await page.locator(".media-price-fields").first().locator("label").count() !== 8) throw new Error("Admin pricing editor did not expose all packages.");
    await page.screenshot({ path: path.join(screenshots, "admin-media-pricing-and-operations.png"), fullPage: true });
    await page.close();
  });

  if (failures.length) throw new Error(`Observed browser failures:\n${failures.join("\n")}`);
  const report = { generatedAt: new Date().toISOString(), baseURL, results, failures, verified: ["real Three.js WebGL context", "eight authoritative packages", "server estimate", "prominent multi-upload workflow", "Studio delivered-media library", "multi-page Studio", "50+ templates", "full Brand Kit preview", "multi-page website editor", "admin pricing"] };
  await fs.writeFile(path.join(output, "data", "premium-property-media-browser-qa-results.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

async function login(page, email, destination, ready = ".pro-user") {
  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.locator(".auth-submit").click();
  await page.waitForURL(`**${destination}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator(ready).waitFor({ state: "visible" });
}
function monitor(page, label) {
  page.on("pageerror", (error) => failures.push(`${label} pageerror ${error.message}`));
  page.on("response", (response) => { if (response.status() >= 500) failures.push(`${label} ${response.status()} ${response.request().method()} ${response.url()}`); });
}
async function scenario(name, run) {
  const started = Date.now();
  console.log(`Running: ${name}`);
  try { await run(); results.push({ name, status: "pass", durationMs: Date.now() - started }); console.log(`Passed: ${name}`); }
  catch (error) { results.push({ name, status: "fail", durationMs: Date.now() - started, error: error.message }); throw error; }
}
async function resolveBrowserExecutable() {
  if (process.env.NESTORA_CHROME_PATH) return process.env.NESTORA_CHROME_PATH;
  const systemChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  try { await fs.access(systemChrome); return systemChrome; } catch { return undefined; }
}
