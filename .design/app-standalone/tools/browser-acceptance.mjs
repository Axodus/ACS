import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const evidenceRoot = process.env.ACS_BROWSER_EVIDENCE_ROOT ?? path.resolve(os.tmpdir(), "acs-epic14-browser-evidence");
const profileRoot = process.env.ACS_BROWSER_PROFILE_ROOT ?? path.resolve(os.tmpdir(), "acs-epic14-browser-profiles");
const host = "127.0.0.1";
const browserLaunchTimeoutMs = Number(process.env.ACS_BROWSER_LAUNCH_TIMEOUT_MS ?? 30000);
const routeTimeoutMs = Number(process.env.ACS_BROWSER_ROUTE_TIMEOUT_MS ?? 30000);
const renderTimeoutMs = Number(process.env.ACS_BROWSER_RENDER_TIMEOUT_MS ?? 15000);
const screenshotTimeoutMs = Number(process.env.ACS_BROWSER_SCREENSHOT_TIMEOUT_MS ?? 15000);
const viewportMatrix = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];
const routeMatrix = [
  "/",
  "/readiness",
  "/system",
  "/system/operational-reliability",
  "/agents",
  "/composition",
  "/operational-execution",
  "/operational-evidence",
  "/economics",
  "/runtime",
  "/logs",
  "/audit",
  "/settings",
];

const buildBin = path.join(appRoot, "node_modules", "vite", "bin", "vite.js");
const browserPath = chromium.executablePath();
const noSandbox = process.env.ACS_BROWSER_NO_SANDBOX !== "0";
const manifestPath = path.join(evidenceRoot, "manifest.json");

function log(message) {
  process.stdout.write(`${message}\n`);
}

function safeSlug(value) {
  return value.replaceAll(/[^a-zA-Z0-9]+/g, "-").replaceAll(/^-+|-+$/g, "").toLowerCase() || "route";
}

async function ensureDirectory(dir) {
  await mkdir(dir, { recursive: true });
}

async function ensureReadable(filePath) {
  await access(filePath, fsConstants.R_OK);
}

function spawnProcess(command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd: appRoot,
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  return child;
}

async function runProcess(command, args, label) {
  const child = spawnProcess(command, args);
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const code = await Promise.race([
    new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (exitCode) => resolve(exitCode));
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${browserLaunchTimeoutMs}ms`)), browserLaunchTimeoutMs)),
  ]);
  if (code !== 0) {
    const error = new Error(`${label} failed with exit code ${code}`);
    error.stdout = stdout;
    error.stderr = stderr;
    throw error;
  }
  return { stdout, stderr };
}

async function findFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen({ host, port: 0 }, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to determine a free port")));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

async function waitForServer(url, timeoutMs = browserLaunchTimeoutMs) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function ensureBuild() {
  const indexHtml = path.join(appRoot, "dist", "index.html");
  try {
    await ensureReadable(indexHtml);
    return false;
  } catch {
    log("[AEES-05] dist/ missing, building app before preview");
    await runProcess(process.execPath, [buildBin, "build"], "vite build");
    return true;
  }
}

async function startPreviewServer(port) {
  const preview = spawnProcess(process.execPath, [buildBin, "preview", "--host", host, "--port", String(port), "--strictPort"], {
    NODE_ENV: "production",
  });
  preview.stdout.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (text) log(`[preview] ${text}`);
  });
  preview.stderr.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (text) log(`[preview:err] ${text}`);
  });
  const url = `http://${host}:${port}/`;
  await waitForServer(url);
  return { preview, url };
}

function normalizeConsoleMessage(message) {
  if (message.type() !== "error") return null;
  return {
    level: "error",
    text: message.text(),
    location: message.location() ?? null,
  };
}

function classifyConsoleErrors(errors) {
  return errors.filter((entry) => {
    const text = entry.text.toLowerCase();
    const locationUrl = entry.location?.url?.toLowerCase() ?? "";
    if (locationUrl.includes("fonts.gstatic.com") || locationUrl.includes("fonts.googleapis.com")) return false;
    return !text.includes("favicon") && !text.includes("devtools") && !text.includes("async response");
  });
}

async function accessibilityBaseline(page) {
  const headings = await page.locator("h1, h2, h3").allTextContents().catch(() => []);
  const navCount = await page.getByRole("navigation").count().catch(() => 0);
  const buttonCount = await page.getByRole("button").count().catch(() => 0);
  const linkCount = await page.getByRole("link").count().catch(() => 0);
  const initialFocus = await page.evaluate(() => document.activeElement?.tagName ?? null);
  await page.keyboard.press("Tab").catch(() => {});
  const nextFocus = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? (el.getAttribute("aria-label") || el.textContent?.trim() || el.tagName || null) : null;
  });
  const status = headings.length > 0 && navCount > 0 && (buttonCount + linkCount) > 0 && initialFocus !== nextFocus
    ? "PASS"
    : "PASS_WITH_CAVEAT";
  return { headings, navCount, buttonCount, linkCount, initialFocus, nextFocus, status, keyboardMoved: initialFocus !== nextFocus };
}

async function inspectRoute(page, route, viewport, baseUrl, screenshotDir) {
  const url = new URL(route, baseUrl).toString();
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  page.on("console", (message) => {
    const entry = normalizeConsoleMessage(message);
    if (entry) consoleErrors.push(entry);
  });
  page.on("pageerror", (error) => {
    pageErrors.push({ message: error.message, stack: error.stack ?? null });
  });
  page.on("requestfailed", (request) => {
    requestFailures.push({ url: request.url(), errorText: request.failure()?.errorText ?? null, resourceType: request.resourceType() });
  });

  const started = Date.now();
  let response = null;
  let heading = null;
  let activeDomain = null;
  let horizontalOverflow = null;
  let accessibility = { status: "PASS_WITH_CAVEAT" };
  let screenshotPath = null;
  let navigationError = null;
  let loaded = false;

  try {
    response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: routeTimeoutMs });
    await page.locator("#root").waitFor({ state: "attached", timeout: renderTimeoutMs });
    const headingLocator = page.locator(".domain-header h1, main h1, h1").first();
    await headingLocator.waitFor({ state: "visible", timeout: renderTimeoutMs });
    heading = (await headingLocator.textContent())?.trim() || null;
    activeDomain = (await page.locator('nav [aria-current="page"]').first().textContent().catch(() => null))?.trim() || null;
    horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    accessibility = await accessibilityBaseline(page);
    await ensureDirectory(screenshotDir);
    screenshotPath = path.join(screenshotDir, `${safeSlug(route)}-${viewport.width}x${viewport.height}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true, timeout: screenshotTimeoutMs });
    loaded = true;
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
    await ensureDirectory(screenshotDir).catch(() => {});
    screenshotPath = path.join(screenshotDir, `${safeSlug(route)}-${viewport.width}x${viewport.height}-failure.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true, timeout: screenshotTimeoutMs }).catch(() => {});
  }

  const relevantConsoleErrors = classifyConsoleErrors(consoleErrors);
  let status = "PASS";
  let reason = "Rendered with heading and no structural issues";
  if (navigationError) {
    status = "BLOCKED";
    reason = navigationError;
  } else if (!loaded || !heading) {
    status = "FAIL";
    reason = "Route did not render a visible heading";
  } else if (horizontalOverflow) {
    status = "FAIL";
    reason = "Horizontal overflow detected";
  } else if (pageErrors.length > 0) {
    status = "FAIL";
    reason = "Page error captured";
  } else if (accessibility.status !== "PASS") {
    status = "PASS_WITH_CAVEAT";
    reason = "Accessibility baseline only partially satisfied";
  } else if (relevantConsoleErrors.length > 0) {
    status = "PASS_WITH_CAVEAT";
    reason = "Console errors recorded";
  }

  return {
    route,
    viewport,
    url,
    finalUrl: page.url(),
    httpStatus: response?.status() ?? null,
    loaded,
    heading,
    activeDomain,
    horizontalOverflow,
    consoleErrors,
    pageErrors,
    requestFailures,
    accessibility,
    screenshot: screenshotPath,
    status,
    reason,
    durationMs: Date.now() - started,
  };
}

async function main() {
  await ensureDirectory(evidenceRoot);
  await ensureDirectory(profileRoot);
  await ensureDirectory(path.join(evidenceRoot, "screenshots"));
  await ensureDirectory(path.join(evidenceRoot, "routes"));

  const manifest = {
    checkedAt: new Date().toISOString(),
    tool: "node:playwright-api",
    browserAvailable: false,
    browserPath,
    status: "BLOCKED",
    summary: {
      routesTested: 0,
      routesPassed: 0,
      routesWithCaveats: 0,
      routesFailed: 0,
      routesBlocked: 0,
      viewportsTested: 0,
      screenshotsCaptured: 0,
      accessibilityChecks: 0,
      horizontalOverflowFailures: 0,
      pageErrors: 0,
      consoleErrors: 0,
    },
    routes: [],
    viewports: viewportMatrix,
    accessibility: { status: "NOT_RUN", wcagCertificationClaimed: false },
    visualEvidence: [],
    consoleErrors: [],
    caveats: [],
    unresolvedIssues: [],
    sourceEvidence: {
      appRoot,
      evidenceRoot,
      profileRoot,
      buildBin,
      previewUrl: null,
      browserLaunchArgs: ["--disable-dev-shm-usage", ...(noSandbox ? ["--no-sandbox"] : [])],
      routeMatrix,
    },
  };

  let previewProcess = null;
  let browser = null;

  const cleanup = async () => {
    if (browser) await browser.close().catch(() => {});
    if (previewProcess) {
      previewProcess.kill("SIGTERM");
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 3000);
        previewProcess.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      }).catch(() => {});
    }
  };

  const buildNeeded = await ensureBuild();
  if (buildNeeded) manifest.caveats.push("Vite build was executed by the harness because dist/ was absent.");

  const port = await findFreePort();
  const preview = await startPreviewServer(port);
  previewProcess = preview.preview;
  manifest.sourceEvidence.previewUrl = preview.url;

  try {
    log("[AEES-05] Launching Chromium via Playwright");
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage", ...(noSandbox ? ["--no-sandbox"] : [])],
    });
    manifest.browserAvailable = true;
    manifest.sourceEvidence.browserVersion = browser.version();

    for (const viewport of viewportMatrix) {
      manifest.summary.viewportsTested += 1;
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
        hasTouch: viewport.width <= 768,
        colorScheme: "light",
      });
      try {
        const screenshotDir = path.join(evidenceRoot, "screenshots", `${viewport.width}x${viewport.height}`);
        for (const route of routeMatrix) {
          const page = await context.newPage();
          let record;
          try {
            record = await inspectRoute(page, route, viewport, preview.url, screenshotDir);
          } finally {
            await page.close().catch(() => {});
          }
          manifest.routes.push(record);
          manifest.summary.routesTested += 1;
          if (record.status === "PASS") manifest.summary.routesPassed += 1;
          else if (record.status === "PASS_WITH_CAVEAT") manifest.summary.routesWithCaveats += 1;
          else if (record.status === "FAIL") manifest.summary.routesFailed += 1;
          else manifest.summary.routesBlocked += 1;
          if (record.screenshot) {
            manifest.summary.screenshotsCaptured += 1;
            manifest.visualEvidence.push({
              route: record.route,
              viewport: `${viewport.width}x${viewport.height}`,
              screenshot: path.relative(evidenceRoot, record.screenshot),
            });
          }
          if (record.accessibility) manifest.summary.accessibilityChecks += 1;
          if (record.horizontalOverflow) manifest.summary.horizontalOverflowFailures += 1;
          manifest.summary.pageErrors += record.pageErrors.length;
          manifest.summary.consoleErrors += record.consoleErrors.length;
          if (record.consoleErrors.length > 0) {
            manifest.consoleErrors.push({
              route: record.route,
              viewport: `${viewport.width}x${viewport.height}`,
              errors: record.consoleErrors,
            });
          }
          if (record.status !== "PASS") {
            manifest.unresolvedIssues.push({
              route: record.route,
              viewport: `${viewport.width}x${viewport.height}`,
              status: record.status,
              reason: record.reason,
            });
          }
          log(`[${viewport.width}x${viewport.height}] ${route} — ${record.status}`);
        }
      } finally {
        await context.close().catch(() => {});
      }
    }

    const routeSummary = manifest.routes.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] ?? 0) + 1;
      return acc;
    }, { PASS: 0, PASS_WITH_CAVEAT: 0, FAIL: 0, BLOCKED: 0 });
    manifest.summary.routeStatus = routeSummary;
    manifest.accessibility.status = manifest.routes.some((route) => route.accessibility?.status === "PASS_WITH_CAVEAT")
      ? "PASS_WITH_CAVEAT"
      : "PASS";

    if (routeSummary.BLOCKED > 0) manifest.status = "BLOCKED";
    else if (routeSummary.FAIL > 0) manifest.status = "FAIL";
    else if (routeSummary.PASS_WITH_CAVEAT > 0) manifest.status = "PASS_WITH_CAVEAT";
    else manifest.status = "PASS";
    log(`[AEES-05] Result: ${manifest.status}`);
  } catch (error) {
    manifest.status = "BLOCKED";
    manifest.unresolvedIssues.push({
      id: "harness-failure",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    });
    manifest.caveats.push(error instanceof Error ? error.message : String(error));
    log(`[AEES-05] Harness failure: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await cleanup();
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  process.exitCode = manifest.status === "PASS" || manifest.status === "PASS_WITH_CAVEAT" ? 0 : manifest.status === "FAIL" ? 1 : 2;
}

await main();
