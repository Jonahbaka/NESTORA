import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { demoAccountByKey } from "../lib/demo-accounts.js";

const baseURL = String(process.env.NESTORA_E2E_BASE_URL || "http://localhost:3040").replace(/\/$/, "");
const password = process.env.NESTORA_E2E_PASSWORD;
if (!password) throw new Error("NESTORA_E2E_PASSWORD is required.");
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseURL)) throw new Error("Commercial browser QA is restricted to a local Nestora origin.");

const output = path.resolve("docs", "qa", "evidence");
const screenshots = path.join(output, "screenshots", "commercial-workspace");
await fs.mkdir(screenshots, { recursive: true });
await fs.mkdir(path.join(output, "data"), { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: await resolveBrowserExecutable() });
const failures = [];
const results = [];

try {
  for (const [key, destination] of [["agent", "/workspace/agent"], ["developer", "/workspace/developer"], ["agency", "/workspace/agency"], ["hotel", "/workspace/host"]]) {
    const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    const page = await context.newPage();
    monitor(page, key);
    await scenario(`${key} commercial workspace`, async () => {
      await login(page, demoAccountByKey[key].email, destination);
      for (const section of ["Marketing Studio", "Brand kits", "Template gallery", "Websites", "Subscription"]) {
        await page.getByRole("button", { name: section, exact: true }).click();
        await page.locator(".workspace-loading").waitFor({ state: "detached", timeout: 30_000 }).catch(() => null);
        await page.waitForTimeout(350);
        await assertHealthyPage(page, `${key} ${section}`);
      }
      await page.getByRole("button", { name: "Template gallery", exact: true }).click();
      await page.locator(".template-card").first().waitFor({ state: "visible" });
      const templateCount = await page.locator(".template-card").count();
      if (templateCount < 25) throw new Error(`${key} saw only ${templateCount} visual templates`);
      await page.screenshot({ path: path.join(screenshots, `${key}-template-gallery-desktop.png`), fullPage: true });
      await page.getByRole("button", { name: "Brand kits", exact: true }).click();
      await page.locator(".kit-card").first().waitFor({ state: "visible" });
      await page.screenshot({ path: path.join(screenshots, `${key}-brand-kits-desktop.png`), fullPage: true });
      await page.getByRole("button", { name: "Websites", exact: true }).click();
      await page.locator(".website-card").first().waitFor({ state: "visible" });
      await page.screenshot({ path: path.join(screenshots, `${key}-websites-desktop.png`), fullPage: true });
      await page.getByRole("button", { name: "Marketing Studio", exact: true }).click();
      await page.locator(".studio-canvas").waitFor({ state: "visible" });
      await page.screenshot({ path: path.join(screenshots, `${key}-marketing-studio-desktop.png`), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(screenshots, `${key}-marketing-studio-mobile.png`), fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      if (key === "agent") await verifyAgentMutations(page);
      await logout(page);
    });
    await context.close();
  }

  if (failures.length) throw new Error(`Observed failed browser activity:\n${failures.join("\n")}`);
  await fs.writeFile(path.join(output, "data", "commercial-workspace-browser-qa-results.json"), JSON.stringify({ generatedAt: new Date().toISOString(), baseURL, results, failures }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}

async function verifyAgentMutations(page) {
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Shape", exact: true }).click();
  await page.getByRole("button", { name: "QR code", exact: true }).click();
  const saveResponsePromise = page.waitForResponse((response) => response.url().includes("/api/workspace/marketing") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  const saveResponse = await saveResponsePromise;
  if (!saveResponse.ok()) throw new Error(`save design returned ${saveResponse.status()}: ${await saveResponse.text()}`);
  await page.getByText("Draft saved successfully.").waitFor({ state: "visible" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".studio-canvas").waitFor({ state: "visible" });
  if (await page.locator(".studio-canvas [style*='position: absolute']").count() < 3) throw new Error("saved design layers did not persist after reload");

  const exports = await page.evaluate(async () => {
    const workspace = await (await fetch("/api/workspace/marketing?workspace=agent", { cache: "no-store" })).json();
    const design = workspace.latestDraft;
    const files = [];
    for (const format of ["pdf", "png", "jpeg"]) {
      const response = await fetch("/api/workspace/marketing?workspace=agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "export", format, designId: design.id, name: design.name, kind: design.kind, canvasWidth: design.canvasWidth, canvasHeight: design.canvasHeight, brandKitId: design.brandKitId, elements: design.elements, dynamicBindings: design.dynamicBindings || {} }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `${format} export failed`);
      const download = await fetch(payload.downloadUrl);
      const bytes = new Uint8Array(await download.arrayBuffer());
      files.push({ format, status: download.status, type: download.headers.get("content-type"), size: bytes.length, signature: Array.from(bytes.slice(0, 4)) });
    }
    return files;
  });
  for (const file of exports) {
    if (file.status !== 200 || file.size < 1000) throw new Error(`${file.format} export was empty or unavailable`);
    if (file.format === "pdf" && file.signature.join(",") !== "37,80,68,70") throw new Error("PDF signature is invalid");
    if (file.format === "png" && file.signature.join(",") !== "137,80,78,71") throw new Error("PNG signature is invalid");
    if (file.format === "jpeg" && file.signature.slice(0, 2).join(",") !== "255,216") throw new Error("JPEG signature is invalid");
  }

  await page.getByRole("button", { name: "Template gallery", exact: true }).click();
  await page.locator(".template-card").first().getByRole("button", { name: "Use template", exact: true }).click();
  await page.locator(".studio-canvas").waitFor({ state: "visible" });
  await assertHealthyPage(page, "duplicated template editor");

  await page.getByRole("button", { name: "Brand kits", exact: true }).click();
  const firstKit = page.locator(".kit-card").first();
  const kitName = await firstKit.locator("strong").innerText();
  await firstKit.getByRole("button", { name: "Edit" }).click();
  const brandForm = page.locator(".brand-kit-manager > form");
  await brandForm.locator("textarea[name=contactFooter]").fill("Fictional QA brand · Abuja · +234 800 000 0000");
  await brandForm.getByRole("button", { name: "Save brand kit" }).click();
  await page.getByText("Brand kit updated.").waitFor({ state: "visible" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText(kitName, { exact: true }).waitFor({ state: "visible" });

  await page.getByRole("button", { name: "Websites", exact: true }).click();
  const site = await page.evaluate(async () => (await (await fetch("/api/workspace/websites?workspace=agent", { cache: "no-store" })).json()).websites[0]);
  for (const action of ["unpublish", "publish"]) {
    const response = await page.evaluate(async ({ action, websiteId }) => { const result = await fetch("/api/workspace/websites?workspace=agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, websiteId }) }); return { status: result.status, body: await result.json() }; }, { action, websiteId: site.id });
    if (response.status !== 200) throw new Error(`${action} website failed: ${response.body.error}`);
  }
  const publicStatus = await page.evaluate(async (slug) => (await fetch(`/api/sites/${slug}`, { cache: "no-store" })).status, site.subdomain);
  if (publicStatus !== 200) throw new Error(`published public site returned ${publicStatus}`);
}

async function login(page, email, destination) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.locator(".auth-submit").click();
  await page.waitForURL(`**${destination}`, { waitUntil: "domcontentloaded" });
  await page.locator(".pro-user").waitFor({ state: "visible" });
}

async function logout(page) {
  await page.locator(".pro-sidebar__bottom button").filter({ hasText: "Logout" }).click();
  await page.waitForURL("**/login", { waitUntil: "domcontentloaded" });
}

async function assertHealthyPage(page, label) {
  const text = await page.locator("body").innerText();
  for (const forbidden of ["Workspace unavailable", "Workspace data is temporarily unavailable"]) if (text.includes(forbidden)) throw new Error(`${label} displayed ${forbidden}`);
}

function monitor(page, role) {
  page.on("pageerror", (error) => failures.push(`${role} pageerror ${page.url()} ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) failures.push(`${role} console ${page.url()} ${message.text()}`); });
  page.on("response", (response) => { if (response.status() >= 500) failures.push(`${role} ${response.status()} ${response.request().method()} ${response.url()}`); });
}

async function scenario(name, run) {
  const started = Date.now();
  try { await run(); results.push({ name, status: "pass", durationMs: Date.now() - started }); }
  catch (error) { results.push({ name, status: "fail", durationMs: Date.now() - started, error: error.message }); throw error; }
}

async function resolveBrowserExecutable() {
  if (process.env.NESTORA_CHROME_PATH) return process.env.NESTORA_CHROME_PATH;
  const systemChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  try { await fs.access(systemChrome); return systemChrome; } catch { return undefined; }
}
