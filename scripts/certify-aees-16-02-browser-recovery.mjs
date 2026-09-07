import { writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const execFileAsync = promisify(execFile);
const outputPath = process.argv[2] || "/tmp/acs-aees-16-02-browser-recovery/manifest.json";
const evidenceRoot = outputPath.slice(0, outputPath.lastIndexOf("/"));
const screenshotsDir = join(evidenceRoot, "screenshots");
const { baseUrl, source: baseUrlSource } = resolveBrowserBaseUrl();
const route = "/operations/overview";
const chromiumExecutablePath = process.env.AEES_BROWSER_EXECUTABLE_PATH || "/home/mzfshark/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";

const manifest = {
  schemaVersion: 1,
  certification: "AEES-16-02/ACCEPTANCE-RECOVERY-01",
  executedAt: new Date().toISOString(),
  serverMode: baseUrlSource,
  baseUrl: baseUrl || null,
  baseUrlSource,
  route,
  routes: [route],
  viewports: ["desktop", "tablet", "mobile"],
  themes: ["light", "dark"],
  browserRuntime: "playwright-core",
  browserEngineUsed: "chromium",
  browserExecutablePath: chromiumExecutablePath,
  result: "FAIL",
  failureClass: null,
  preflight: { status: "unverified" },
  browser: { route, screenshots: [], consoleErrors: 0, pageErrors: 0, horizontalOverflow: 0, accessibilityFailures: 0, requestFailures: [] },
  noFakeData: { syntheticMarkers: 0, historicalTexts: 0, tokenInBrowserStorage: 0 },
  blockers: [],
};

const syntheticMarkers = ["demo data", "sample data", "fake data", "mock data", "placeholder", "lorem ipsum"];
const historicalTexts = [
  "The implementation still relies on in-memory or filesystem secret storage, which is not production-grade.",
  "Current HTTP auth is disabled or mock-only and does not enforce production identity validation.",
  "The implementation currently reports external exporters as disabled.",
  "The current worker implementation is local-only and does not prove remote dispatch.",
];

function normalizeBaseUrl(value) {
  if (!value) return null;
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function resolveBrowserBaseUrl() {
  const explicit = normalizeBaseUrl(process.env.AEES_BROWSER_BASE_URL || process.env.AEES_BROWSER_DEPLOYMENT_URL);
  if (explicit) {
    return { baseUrl: explicit, source: "explicit" };
  }
  const vercelUrl = process.env.AEES_BROWSER_VERCEL_URL || process.env.VERCEL_URL || process.env.VERCEL_BRANCH_URL;
  if (vercelUrl) {
    const resolved = normalizeBaseUrl(vercelUrl.startsWith("http://") || vercelUrl.startsWith("https://") ? vercelUrl : "https://" + vercelUrl);
    return { baseUrl: resolved, source: "vercel" };
  }
  if (process.env.AEES_BROWSER_ALLOW_LOCALHOST === "1") {
    const localhost = normalizeBaseUrl(process.env.AEES_BROWSER_LOCAL_URL || "http://localhost:3000");
    return { baseUrl: localhost, source: "localhost-fallback" };
  }
  return { baseUrl: null, source: "unresolved" };
}

async function resolvePlaywrightCorePath() {
  const candidates = [
    process.env.AEES_PLAYWRIGHT_CORE_MODULE,
    join(process.cwd(), "node_modules", "playwright-core", "index.js"),
    "/home/mzfshark/.nvm/versions/node/v24.15.0/lib/node_modules/openclaw/node_modules/playwright-core/index.js",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await execFileAsync("node", ["-e", "require.resolve(process.argv[1])", candidate]);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error("playwright-core not found");
}

async function preflightExternalUrl(url) {
  try {
    const response = await fetch(url + route, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      throw new Error("SERVER_UNREACHABLE: " + response.status + " " + url + route);
    }
    manifest.preflight = { status: "ok", url: url + route, httpStatus: response.status };
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    const causeMessage = String(error && error.cause && error.cause.message ? error.cause.message : "");
    const causeCode = String(error && error.cause && error.cause.code ? error.cause.code : "");
    if (/operation not permitted|EPERM|sandbox|permission denied/i.test(message + " " + causeMessage + " " + causeCode)) {
      manifest.preflight = { status: "blocked_by_environment", error: message, cause: causeMessage || undefined, code: causeCode || undefined };
      return;
    }
    throw new Error("SERVER_UNREACHABLE: " + message);
  }
}

async function launchBrowser(playwright) {
  return playwright.chromium.launch({
    headless: true,
    executablePath: chromiumExecutablePath,
    args: ["--no-sandbox"],
  });
}

async function runBrowserAcceptance(playwright, url) {
  const browser = await launchBrowser(playwright);
  const viewportMatrix = [
    { label: "desktop", width: 1440, height: 900 },
    { label: "tablet", width: 768, height: 1024 },
    { label: "mobile", width: 390, height: 844 },
  ];
  const checks = [];
  try {
    for (const theme of ["light", "dark"]) {
      for (const viewport of viewportMatrix) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          colorScheme: theme,
        });
        const page = await context.newPage();
        const consoleErrors = [];
        const pageErrors = [];
        const requestFailures = [];
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.on("pageerror", (error) => pageErrors.push(String(error)));
        page.on("requestfailed", (request) => {
          requestFailures.push(request.method() + " " + request.url() + " " + String((request.failure() && request.failure().errorText) || "requestfailed"));
        });

        await page.goto(url + route, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
        const state = await page.evaluate(() => {
          const text = document.body ? document.body.innerText || "" : "";
          const buttons = [...document.querySelectorAll("button")];
          const fields = [...document.querySelectorAll("input, select, textarea")];
          return {
            text,
            overflow: document.documentElement.scrollWidth > window.innerWidth || (document.body ? document.body.scrollWidth > window.innerWidth : false),
            unlabeledButtons: buttons.filter((node) => !node.textContent.trim() && !node.getAttribute("aria-label") && !node.getAttribute("title")).length,
            unlabeledInputs: fields.filter((node) => !node.getAttribute("aria-label") && !node.getAttribute("aria-labelledby") && !node.closest("label")).length,
            loadingVisible: /\bloading\b/i.test(text),
            errorVisible: /\b(error|failed|unavailable|not available|problem)\b/i.test(text),
            emptyVisible: /\b(no data|empty|nothing to show|nothing here)\b/i.test(text),
            storage: JSON.stringify(Object.assign({}, localStorage, sessionStorage)),
          };
        });

        const screenshotPath = join(screenshotsDir, theme + "-" + viewport.label + ".png");
        await page.screenshot({ path: screenshotPath, fullPage: true });

        checks.push({
          theme,
          viewport: viewport.label,
          screenshotPath,
          overflow: Boolean(state.overflow),
          unlabeledButtons: state.unlabeledButtons,
          unlabeledInputs: state.unlabeledInputs,
          loadingVisible: state.loadingVisible,
          errorVisible: state.errorVisible,
          emptyVisible: state.emptyVisible,
          consoleErrors: consoleErrors.length,
          pageErrors: pageErrors.length,
          requestFailures,
          historicalTexts: historicalTexts.filter((needle) => String(state.text).includes(needle)),
          syntheticMarkers: syntheticMarkers.filter((needle) => String(state.text).toLowerCase().includes(needle)),
          tokenInStorage: /bearer|eyJ[a-zA-Z0-9_-]+/.test(String(state.storage)),
        });

        await context.close();
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  manifest.browser = {
    route,
    checks,
    screenshots: checks.map((check) => check.screenshotPath),
    accessibilityFailures: checks.reduce((sum, check) => sum + check.unlabeledButtons + check.unlabeledInputs, 0),
    horizontalOverflow: checks.filter((check) => check.overflow).length,
    consoleErrors: checks.reduce((sum, check) => sum + check.consoleErrors, 0),
    pageErrors: checks.reduce((sum, check) => sum + check.pageErrors, 0),
    requestFailures: checks.flatMap((check) => check.requestFailures),
  };
  manifest.noFakeData = {
    syntheticMarkers: checks.some((check) => check.syntheticMarkers.length > 0) ? 1 : 0,
    historicalTexts: checks.some((check) => check.historicalTexts.length > 0) ? 1 : 0,
    tokenInBrowserStorage: checks.some((check) => check.tokenInStorage) ? 1 : 0,
  };
  manifest.result =
    manifest.browser.accessibilityFailures === 0 &&
    manifest.browser.horizontalOverflow === 0 &&
    manifest.browser.consoleErrors === 0 &&
    manifest.browser.pageErrors === 0 &&
    manifest.browser.requestFailures.length === 0 &&
    manifest.noFakeData.syntheticMarkers === 0 &&
    manifest.noFakeData.historicalTexts === 0 &&
    manifest.noFakeData.tokenInBrowserStorage === 0
      ? "PASS"
      : "FAIL";
}

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  await mkdir(screenshotsDir, { recursive: true });

  if (!baseUrl) {
    throw new Error("AEES browser target is unresolved; provide AEES_BROWSER_BASE_URL, a Vercel deployment URL, or enable AEES_BROWSER_ALLOW_LOCALHOST=1 for development fallback");
  }

  await preflightExternalUrl(baseUrl);
  const playwrightCorePath = await resolvePlaywrightCorePath();
  const playwrightModule = await import(pathToFileURL(playwrightCorePath).href);
  const playwright = playwrightModule.default || playwrightModule;
  await runBrowserAcceptance(playwright, baseUrl);
}

main().catch(async (error) => {
  const message = String(error && error.message ? error.message : error);
  manifest.failureClass =
    /SERVER_UNREACHABLE/.test(message)
      ? "SERVER_UNREACHABLE"
      : /operation not permitted|EPERM|sandbox|crashpad|SIGTRAP|browserType.launch|Target page, context or browser has been closed/i.test(message)
        ? "ENVIRONMENT_LIMITATION / PLAYWRIGHT_BROWSER_RUNTIME"
        : /Playwright|browser/i.test(message)
          ? "BROWSER_TEST_FAILURE"
          : "UNKNOWN_FAILURE";
  manifest.blockers.push(message);
  manifest.error = message;
  manifest.result = "FAIL";
  await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 }).catch(() => undefined);
  process.stdout.write(JSON.stringify({
    success: false,
    result: manifest.result,
    failureClass: manifest.failureClass,
    outputPath,
  }) + "\n");
  process.exitCode = 1;
}).finally(async () => {
  await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 }).catch(() => undefined);
});
