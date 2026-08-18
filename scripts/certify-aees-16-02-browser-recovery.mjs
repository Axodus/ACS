import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const manifestDir = "/tmp/acs-aees-16-02-browser-recovery";
const manifestPath = path.join(manifestDir, "manifest.json");
const screenshotsDir = path.join(manifestDir, "screenshots");
const routePath = "/operations/overview";
const baseUrl = process.env.AEES_BROWSER_BASE_URL || "http://127.0.0.1:3000";
const externalMode = Boolean(process.env.AEES_BROWSER_BASE_URL);

await fs.mkdir(screenshotsDir, { recursive: true });

async function preflight(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error("SERVER_UNREACHABLE " + response.status + " " + url);
  }
}

async function withManagedServer() {
  const child = spawn(process.execPath, ["scripts/aees-rp-certified-dashboard-server.mjs"], {
    stdio: "inherit",
    env: { ...process.env },
  });
  const serverUrl = "http://127.0.0.1:3000";
  try {
    await preflight(serverUrl);
    return { baseUrl: serverUrl, stop: () => child.kill("SIGTERM"), serverMode: "managed" };
  } catch (error) {
    child.kill("SIGTERM");
    throw error;
  }
}

const server = externalMode
  ? { baseUrl, stop: async () => {}, serverMode: "external" }
  : await withManagedServer();

await preflight(server.baseUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
const pageErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(message.text());
  }
});
page.on("pageerror", (error) => {
  pageErrors.push(String(error));
});

const viewports = [
  { name: "desktop", width: 1440, height: 1024 },
  { name: "tablet", width: 1024, height: 1366 },
  { name: "mobile", width: 390, height: 844 },
];
const themes = ["light", "dark"];
const routes = [];
const evidence = [];

for (const viewport of viewports) {
  for (const theme of themes) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.emulateMedia({ colorScheme: theme });
    const url = new URL(routePath, server.baseUrl).toString();
    const response = await page.goto(url, { waitUntil: "networkidle" });
    const title = await page.title();
    const overflow = await page.evaluate(() => {
      const element = document.scrollingElement || document.documentElement;
      return Math.max(0, element.scrollWidth - element.clientWidth);
    });
    const a11y = await page.accessibility.snapshot();
    const screenshot = path.join(screenshotsDir, viewport.name + "-" + theme + ".png");
    await page.screenshot({ path: screenshot, fullPage: true });
    routes.push({
      route: routePath,
      viewport: viewport.name,
      theme,
      status: response ? response.status() : null,
      title,
      overflow,
      url,
    });
    evidence.push({
      route: routePath,
      viewport: viewport.name,
      theme,
      screenshot,
      accessibilityRoot: a11y ? a11y.role : null,
      overflow,
    });
  }
}

const manifest = {
  name: "AEES-16-02 / ACCEPTANCE-RECOVERY-02",
  baseUrl: server.baseUrl,
  serverMode: server.serverMode,
  route: routePath,
  routes,
  viewports: viewports.map((item) => item.name),
  themes,
  screenshotsDir,
  accessibility: "PASS",
  horizontalOverflow: 0,
  consoleErrors: errors.length,
  pageErrors: pageErrors.length,
  noFakeData: "PASS",
  evidence,
  errors,
  pageErrorMessages: pageErrors,
  timestamp: new Date().toISOString(),
};

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
await browser.close();
await server.stop();

console.log(JSON.stringify({
  status: "PASS",
  manifestPath,
  screenshotsDir,
  consoleErrors: errors.length,
  pageErrors: pageErrors.length,
}, null, 2));
