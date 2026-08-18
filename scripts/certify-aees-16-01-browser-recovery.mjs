import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const outputPath = process.argv[2] || "/tmp/acs-aees-16-01-browser-recovery/manifest.json";
const distRoot = process.env.ACS_TEST_DIST_ROOT || "../dist";
const evidenceRoot = outputPath.slice(0, outputPath.lastIndexOf("/"));
const externalBaseUrl = normalizeBaseUrl(process.env.AEES_BROWSER_BASE_URL);
const browserEnginePreference = process.env.AEES_BROWSER_ENGINE || "chromium";
const useSudoLaunch = process.env.AEES_BROWSER_USE_SUDO === "1";
const chromiumExecutablePath = process.env.AEES_BROWSER_EXECUTABLE_PATH || "/home/mzfshark/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const firefoxExecutablePath = "/home/mzfshark/.cache/ms-playwright/firefox-1538/firefox/firefox";
const browserExecutablePath = process.env.AEES_BROWSER_EXECUTABLE_PATH || (browserEnginePreference === "firefox" ? firefoxExecutablePath : chromiumExecutablePath);
const playwrightCorePath = await resolvePlaywrightCorePath();
const playwrightModule = await import(pathToFileURL(playwrightCorePath).href);
const playwright = playwrightModule.default || playwrightModule;
const { chromium, firefox } = playwright;

const root = await mkdtemp(join(tmpdir(), "acs-aees-16-01-browser-"));
const children = new Set();
let backend;
let preview;

const manifest = {
  schemaVersion: 1,
  certification: "AEES-16-01/ACCEPTANCE-RECOVERY-02",
  executedAt: new Date().toISOString(),
  serverMode: externalBaseUrl ? "external" : "managed",
  baseUrl: externalBaseUrl || null,
  route: "/operations/overview",
  requestUrl: "/api/v1/dashboard",
  routes: ["/operations/overview"],
  viewports: ["desktop", "tablet", "mobile"],
  themes: ["light", "dark"],
  browserRuntime: "playwright-core",
  browserEnginePreference,
  managedServerLaunchMode: useSudoLaunch ? "sudo" : "direct",
  browserEngineUsed: null,
  browserFallbackUsed: false,
  browserExecutablePath,
  result: "FAIL",
  failureClass: null,
  endpoint: {},
  browser: {},
  noFakeData: {},
  blockers: [],
};

const historicalTexts = [
  "The implementation still relies on in-memory or filesystem secret storage, which is not production-grade.",
  "Current HTTP auth is disabled or mock-only and does not enforce production identity validation.",
  "The implementation currently reports external exporters as disabled.",
  "The current worker implementation is local-only and does not prove remote dispatch.",
  "The current secret store is in-memory or filesystem based and not production-grade.",
  "The current governance policy only allows sandbox deployments.",
];

const syntheticMarkers = [
  "demo data",
  "sample data",
  "fake data",
  "mock data",
  "placeholder",
  "lorem ipsum",
];

function normalizeBaseUrl(value) {
  if (!value) return null;
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function waitFor(label, probe, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 30000);
  let last;
  while (Date.now() < deadline) {
    try {
      if (await probe()) return;
    } catch (error) {
      last = error;
    }
    await delay(200);
  }
  throw new Error(label + " did not become ready: " + String(last || "timeout"));
}

async function freePort() {
  return new Promise(function (resolve, reject) {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", function () {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("could not allocate port"));
      server.close(function () { resolve(address.port); });
    });
  });
}

function startStructured(command, args, environment, label, cwd) {
  return new Promise(function (resolve, reject) {
    const child = spawn(command, args, {
      cwd: cwd || process.cwd(),
      env: Object.assign({}, process.env, environment),
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.add(child);
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(function () {
      reject(new Error(label + " startup timed out: " + stderr));
    }, 30000);
    child.stdout.on("data", function (chunk) {
      stdout += chunk.toString("utf8");
      const newline = stdout.indexOf("\n");
      if (newline < 0) return;
      clearTimeout(timeout);
      try {
        resolve(Object.assign({ child: child, stderr: function () { return stderr; } }, JSON.parse(stdout.slice(0, newline))));
      } catch (error) {
        reject(error);
      }
    });
    child.stderr.on("data", function (chunk) {
      stderr += chunk.toString("utf8");
    });
    child.once("exit", function (code) {
      children.delete(child);
      if (code && stdout.indexOf("\n") < 0) reject(new Error(label + " exited " + code + ": " + stderr));
    });
  });
}

function startUnstructured(command, args, environment, cwd) {
  const child = spawn(command, args, {
    cwd: cwd || process.cwd(),
    env: Object.assign({}, process.env, environment || {}),
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.add(child);
  let stderr = "";
  child.stderr.on("data", function (chunk) {
    stderr += chunk.toString("utf8");
  });
  child.once("exit", function () {
    children.delete(child);
  });
  return { child: child, stderr: function () { return stderr; } };
}

async function stopChild(entry) {
  if (!entry || !entry.child || entry.child.exitCode !== null) return;
  entry.child.kill("SIGTERM");
  await Promise.race([
    new Promise(function (resolve) { entry.child.once("exit", resolve); }),
    delay(5000),
  ]);
  if (entry.child.exitCode === null) entry.child.kill("SIGKILL");
}

async function buildStatic(staticRoot, apiBase) {
  await mkdir(evidenceRoot, { recursive: true });
  try {
    await execFileAsync("rsync", [
      "-a",
      "--delete",
      "--exclude",
      "node_modules",
      "--exclude",
      "dist",
      "--exclude",
      "*.tsbuildinfo",
      "static/",
      staticRoot + "/",
    ]);
  } catch {
    await execFileAsync("cp", ["-a", "static/.", staticRoot]);
  }
  await symlink(join(process.cwd(), "static", "node_modules"), join(staticRoot, "node_modules"), "dir");
  await execFileAsync("npm", ["--prefix", staticRoot, "run", "build"], {
    env: Object.assign({}, process.env, { VITE_ACS_API_BASE_URL: apiBase }),
  });
}

function launchWithOptionalSudo(command, args, environment) {
  if (!useSudoLaunch) return { command: command, args: args, environment: environment };
  return {
    command: "sudo",
    args: ["-n", command, ...args],
    environment: {},
  };
}

async function resolvePlaywrightCorePath() {
  const candidates = [
    process.env.AEES_PLAYWRIGHT_CORE_MODULE,
    join(process.cwd(), "node_modules", "playwright-core", "index.js"),
    "/home/mzfshark/.nvm/versions/node/v24.15.0/lib/node_modules/openclaw/node_modules/playwright-core/index.js",
  ].filter(Boolean);
  let last;
  for (const candidate of candidates) {
    try {
      await execFileAsync("node", ["-e", "require.resolve(process.argv[1])", candidate]);
      return candidate;
    } catch (error) {
      last = error;
    }
  }
  throw new Error("playwright-core not found: " + String(last || "unknown"));
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, timeoutMs || 5000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }
    return {
      response: { ok: response.ok, status: response.status },
      payload: payload,
      text: text,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function preflightBaseUrl(baseUrl) {
  try {
    const response = await fetch(baseUrl + "/operations/overview", { signal: AbortSignal.timeout(5000) });
    if (!response.ok && response.status >= 500) {
      throw new Error("SERVER_UNREACHABLE: " + response.status + " " + baseUrl);
    }
  } catch (error) {
    throw new Error("SERVER_UNREACHABLE: " + String(error && error.message ? error.message : error));
  }
}

function hasAny(text, needles) {
  const lower = text.toLowerCase();
  return needles.filter(function (needle) {
    return lower.includes(needle.toLowerCase());
  });
}

function hasMonetaryShape(text) {
  return /(?:\\$|€|£|USD|EUR|GBP)\\s?\\d|\\d\\s?(?:USD|EUR|GBP)|\\b\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?\\b\\s?(?:USD|EUR|GBP)/i.test(text);
}

async function collectEndpointEvidence(browserBaseUrl) {
  const result = await fetchJson(browserBaseUrl + "/api/v1/dashboard");
  if (result.response.status >= 400 || !result.response.ok) {
    throw new Error("PRODUCT_ACCEPTANCE_FAILURE: /api/v1/dashboard returned " + result.response.status);
  }
  const serialized = JSON.stringify(result.payload);
  manifest.endpoint = {
    requestUrl: "/api/v1/dashboard",
    status: result.response.status,
    historicalBlockerCount: result.payload.data && result.payload.data.historicalBlockerScan ? result.payload.data.historicalBlockerScan.count : undefined,
    historicalTextsPresent: historicalTexts.filter(function (needle) { return serialized.includes(needle); }),
    syntheticMarkersPresent: syntheticMarkers.filter(function (needle) { return serialized.toLowerCase().includes(needle.toLowerCase()); }),
    warningCodes: result.payload.data && result.payload.data.operationalCaveats ? result.payload.data.operationalCaveats.map(function (entry) { return entry.code; }) : [],
    composition: result.payload.data ? result.payload.data.composition : undefined,
  };
}

async function launchBrowser(engineName, executablePath) {
  const cacheHome = process.env.XDG_CACHE_HOME || "/tmp/acs-aees-browser-cache";
  const common = {
    headless: true,
    executablePath: executablePath,
    env: { XDG_CACHE_HOME: cacheHome },
  };
  if (engineName === "firefox") {
    return await firefox.launch(Object.assign({}, common, { args: ["-headless"] }));
  }
  return await chromium.launch(Object.assign({}, common, { args: ["--no-sandbox"] }));
}

async function runThemeWithEngine(browserBaseUrl, themeName, screenshotsDir, engineName) {
  const viewportMatrix = [
    { label: "desktop", width: 1440, height: 900 },
    { label: "tablet", width: 768, height: 1024 },
    { label: "mobile", width: 390, height: 844 },
  ];
  const executablePath = engineName === "firefox" ? firefoxExecutablePath : chromiumExecutablePath;
  const browser = await launchBrowser(engineName, executablePath);
  const screenshots = [];
  const checks = [];
  let consoleErrors = 0;
  let pageErrors = 0;
  let requestFailures = [];
  let non2xxResponses = [];
  try {
    for (const viewport of viewportMatrix) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: themeName,
      });
      const page = await context.newPage();
      const pageConsoleErrors = [];
      const pageErrorsList = [];
      const requestFailuresList = [];
      const responseFailures = [];

      page.on("console", function (message) {
        if (message.type() === "error") pageConsoleErrors.push(message.text());
      });
      page.on("pageerror", function (error) {
        pageErrorsList.push(String(error));
      });
      page.on("requestfailed", function (request) {
        requestFailuresList.push(request.method() + " " + request.url() + " " + String((request.failure() && request.failure().errorText) || "requestfailed"));
      });
      page.on("response", function (response) {
        if (response.status() >= 400) {
          const url = response.url();
          if (/favicon|fonts|\\.ico($|\\?)/i.test(url)) return;
          responseFailures.push(response.status() + " " + url);
        }
      });

      await page.goto(browserBaseUrl + "/operations/overview", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(function () { return undefined; });
      await page.waitForTimeout(500);

      const state = await page.evaluate(function () {
        const bodyText = document.body ? document.body.innerText || "" : "";
        const buttons = [...document.querySelectorAll("button")];
        const fields = [...document.querySelectorAll("input, select, textarea")];
        const images = [...document.images];
        return {
          text: bodyText,
          overflow: document.documentElement.scrollWidth > window.innerWidth || (document.body ? document.body.scrollWidth > window.innerWidth : false),
          unlabeledButtons: buttons.filter(function (node) { return !node.textContent.trim() && !node.getAttribute("aria-label") && !node.getAttribute("title"); }).length,
          unlabeledInputs: fields.filter(function (node) { return !node.getAttribute("aria-label") && !node.getAttribute("aria-labelledby") && !node.closest("label"); }).length,
          missingImageAlt: images.filter(function (node) { return !node.hasAttribute("alt"); }).length,
          loadingVisible: /\\bloading\\b/i.test(bodyText),
          errorVisible: /\\b(error|failed|unavailable|not available|problem)\\b/i.test(bodyText),
          emptyVisible: /\\b(no data|empty|nothing to show|nothing here)\\b/i.test(bodyText),
          storage: JSON.stringify(Object.assign({}, localStorage, sessionStorage)),
        };
      });

      const screenshot = join(screenshotsDir, themeName + "-" + viewport.label + "-" + viewport.width + "x" + viewport.height + ".png");
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots.push(screenshot);

      const historicalTextsPresent = hasAny(String(state.text), historicalTexts);
      const syntheticMarkersPresent = hasAny(String(state.text), syntheticMarkers);
      const monetaryShape = hasMonetaryShape(String(state.text));
      const tokenInStorage = /bearer|eyJ[a-zA-Z0-9_-]+/.test(String(state.storage));

      checks.push({
        theme: themeName,
        viewport: viewport.label,
        width: viewport.width,
        height: viewport.height,
        overflow: Boolean(state.overflow),
        unlabeledButtons: Number(state.unlabeledButtons || 0),
        unlabeledInputs: Number(state.unlabeledInputs || 0),
        missingImageAlt: Number(state.missingImageAlt || 0),
        historicalTextsPresent: historicalTextsPresent,
        syntheticMarkersPresent: syntheticMarkersPresent,
        monetaryShape: Boolean(monetaryShape),
        loadingVisible: Boolean(state.loadingVisible),
        errorVisible: Boolean(state.errorVisible),
        emptyVisible: Boolean(state.emptyVisible),
        consoleErrors: pageConsoleErrors.length,
        pageErrors: pageErrorsList.length,
        requestFailures: requestFailuresList,
        non2xxResponses: responseFailures,
        tokenInStorage: tokenInStorage,
      });

      consoleErrors += pageConsoleErrors.length;
      pageErrors += pageErrorsList.length;
      requestFailures = requestFailures.concat(requestFailuresList);
      non2xxResponses = non2xxResponses.concat(responseFailures);
      await context.close();
    }
  } finally {
    await browser.close().catch(function () { return undefined; });
  }

  return {
    route: "/operations/overview",
    theme: themeName,
    screenshots: screenshots,
    checks: checks,
    accessibilityFailures: checks.reduce(function (sum, check) { return sum + check.unlabeledButtons + check.unlabeledInputs + check.missingImageAlt; }, 0),
    horizontalOverflow: checks.filter(function (check) { return check.overflow; }).length,
    consoleErrors: consoleErrors,
    pageErrors: pageErrors,
    requestFailures: requestFailures,
    non2xxResponses: non2xxResponses,
    tokenInStorage: checks.some(function (check) { return check.tokenInStorage; }) ? 1 : 0,
  };
}

async function runThemes(browserBaseUrl, screenshotsDir) {
  const themeRuns = [];
  try {
    themeRuns.push(await runThemeWithEngine(browserBaseUrl, "light", screenshotsDir, browserEnginePreference));
    themeRuns.push(await runThemeWithEngine(browserBaseUrl, "dark", screenshotsDir, browserEnginePreference));
    manifest.browserEngineUsed = browserEnginePreference;
  } catch (error) {
    if (browserEnginePreference === "chromium") {
      const message = String(error instanceof Error ? error.message : error);
      if (/browserType.launch|Target page, context or browser has been closed|crashpad|sandbox_host_linux|SIGTRAP/i.test(message)) {
        manifest.browserEngineUsed = "firefox";
        manifest.browserFallbackUsed = true;
        themeRuns.push(await runThemeWithEngine(browserBaseUrl, "light", screenshotsDir, "firefox"));
        themeRuns.push(await runThemeWithEngine(browserBaseUrl, "dark", screenshotsDir, "firefox"));
        return themeRuns;
      }
    }
    throw error;
  }
  return themeRuns;
}

async function runExternalTopology(browserBaseUrl, screenshotsDir) {
  await preflightBaseUrl(browserBaseUrl);
  await collectEndpointEvidence(browserBaseUrl);
  return await runThemes(browserBaseUrl, screenshotsDir);
}

async function runManagedTopology(staticRoot, screenshotsDir) {
  const backendPort = Number(process.env.AEES_BROWSER_BACKEND_PORT || 8098);
  const staticPort = Number(process.env.AEES_BROWSER_STATIC_PORT || 4173);
  const browserBaseUrl = "http://127.0.0.1:" + staticPort;
  const apiBase = "http://127.0.0.1:" + backendPort;
  const backendLaunch = launchWithOptionalSudo(
    process.execPath,
    useSudoLaunch
      ? ["scripts/aees-rp-certified-dashboard-server.mjs", distRoot, String(backendPort), "127.0.0.1", "http://127.0.0.1:" + staticPort]
      : ["scripts/aees-rp-certified-dashboard-server.mjs"],
    useSudoLaunch
      ? {}
      : {
          ACS_TEST_DIST_ROOT: distRoot,
          ACS_RP_PORT: String(backendPort),
          ACS_RP_HOST: "127.0.0.1",
          ACS_RP_BROWSER_ORIGIN: "http://127.0.0.1:" + staticPort,
        }
  );
  backend = await startStructured(backendLaunch.command, backendLaunch.args, backendLaunch.environment, "certified dashboard backend");
  await waitFor("dashboard API", async function () {
    return (await fetch(apiBase + "/api/v1/dashboard")).ok;
  });
  await collectEndpointEvidence(apiBase);
  await buildStatic(staticRoot, apiBase);
  const previewLaunch = launchWithOptionalSudo(process.execPath, [join(process.cwd(), "static", "node_modules", "vite", "bin", "vite.js"), "preview", "--host", "127.0.0.1", "--port", String(staticPort)], {});
  preview = startUnstructured(previewLaunch.command, previewLaunch.args, previewLaunch.environment, staticRoot);
  await waitFor("static overview", async function () {
    try {
      const response = await fetch(browserBaseUrl + "/operations/overview");
      return response.ok;
    } catch {
      return false;
    }
  });
  return await runThemes(browserBaseUrl, screenshotsDir);
}

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  const screenshotsDir = join(evidenceRoot, "screenshots");
  await mkdir(screenshotsDir, { recursive: true });
  const staticRoot = join(root, "static");
  let themeRuns;

  try {
    if (externalBaseUrl) {
      themeRuns = await runExternalTopology(externalBaseUrl, screenshotsDir);
    } else {
      themeRuns = await runManagedTopology(staticRoot, screenshotsDir);
    }

    manifest.browser = {
      route: "/operations/overview",
      requestUrl: "/api/v1/dashboard",
      themeRuns: themeRuns,
      accessibilityFailures: themeRuns.reduce(function (sum, run) { return sum + run.accessibilityFailures; }, 0),
      horizontalOverflow: themeRuns.reduce(function (sum, run) { return sum + run.horizontalOverflow; }, 0),
      consoleErrors: themeRuns.reduce(function (sum, run) { return sum + run.consoleErrors; }, 0),
      pageErrors: themeRuns.reduce(function (sum, run) { return sum + run.pageErrors; }, 0),
      requestFailures: themeRuns.flatMap(function (run) { return run.requestFailures; }),
      non2xxResponses: themeRuns.flatMap(function (run) { return run.non2xxResponses; }),
      screenshots: themeRuns.flatMap(function (run) { return run.screenshots; }),
    };

    manifest.noFakeData = {
      tokenInBrowserStorage: themeRuns.some(function (run) { return run.tokenInStorage; }) ? 1 : 0,
      monetaryShapes: themeRuns.some(function (run) { return run.checks.some(function (check) { return check.monetaryShape; }); }) ? 1 : 0,
      historicalTexts: themeRuns.some(function (run) { return run.checks.some(function (check) { return check.historicalTextsPresent.length > 0; }); }) ? 1 : 0,
      syntheticMarkers: themeRuns.some(function (run) { return run.checks.some(function (check) { return check.syntheticMarkersPresent.length > 0; }); }) ? 1 : 0,
    };

    manifest.result = manifest.endpoint.status === 200 &&
      themeRuns.length === 2 &&
      manifest.browser.accessibilityFailures === 0 &&
      manifest.browser.horizontalOverflow === 0 &&
      manifest.browser.consoleErrors === 0 &&
      manifest.browser.pageErrors === 0 &&
      manifest.browser.requestFailures.length === 0 &&
      manifest.noFakeData.tokenInBrowserStorage === 0 &&
      manifest.noFakeData.historicalTexts === 0 &&
      manifest.noFakeData.syntheticMarkers === 0
      ? "PASS"
      : "FAIL";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    manifest.failureClass = /SERVER_UNREACHABLE/.test(message)
      ? "SERVER_UNREACHABLE"
      : /listen EPERM|operation not permitted|EADDRINUSE|bind/i.test(message)
        ? "ENVIRONMENT_LIMITATION"
        : /Target page, context or browser has been closed|sandbox_host_linux|crashpad|SIGTRAP|browserType.launch/i.test(message)
          ? "ENVIRONMENT_LIMITATION"
          : /PRODUCT_ACCEPTANCE_FAILURE/.test(message)
            ? "PRODUCT_ACCEPTANCE_FAILURE"
            : /Playwright|browser/i.test(message)
              ? "BROWSER_TEST_FAILURE"
              : "UNKNOWN_FAILURE";
    manifest.blockers.push(message);
    manifest.error = message;
    manifest.result = "FAIL";
    process.exitCode = 1;
  } finally {
    await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 }).catch(function () { return undefined; });
    process.stdout.write(JSON.stringify({
      success: manifest.result === "PASS",
      result: manifest.result,
      failureClass: manifest.failureClass,
      serverMode: manifest.serverMode,
      baseUrl: manifest.baseUrl,
      outputPath: outputPath,
    }) + "\n");
    await Promise.allSettled([stopChild(preview), stopChild(backend)]);
    for (const child of children) child.kill("SIGKILL");
  }
}

await main();
