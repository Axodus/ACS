import { execFile, spawn } from "node:child_process";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const outputPath = process.argv[2] ?? "/tmp/acs-aees-16-01-browser-recovery/manifest.json";
const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const evidenceRoot = outputPath.slice(0, outputPath.lastIndexOf("/"));
const root = await mkdtemp(join(tmpdir(), "acs-aees-16-01-browser-"));
const children = new Set();
let backend;
let preview;
let geckodriver;
let browserSessionId;
let manifest = {
  schemaVersion: 1,
  certification: "AEES-16-01_HOTFIX-01",
  executedAt: new Date().toISOString(),
  route: "/operations/overview",
  requestUrl: "/api/v1/dashboard",
  result: "FAIL",
  environmentLimitation: null,
  endpoint: {},
  browser: {},
  sensitiveScan: {},
};

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "0.0.0.0", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("could not allocate port"));
      server.close(() => resolve(address.port));
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(label, probe, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      if (await probe()) return;
    } catch (error) {
      last = error;
    }
    await delay(200);
  }
  throw new Error(`${label} did not become ready: ${String(last ?? "timeout")}`);
}

function startStructured(command, args, environment, label, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, ...environment }, stdio: ["ignore", "pipe", "pipe"] });
    children.add(child);
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => reject(new Error(`${label} startup timed out: ${stderr}`)), 30_000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      const newline = stdout.indexOf("\n");
      if (newline < 0) return;
      clearTimeout(timeout);
      try {
        resolve({ child, ...JSON.parse(stdout.slice(0, newline)), stderr: () => stderr });
      } catch (error) {
        reject(error);
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.once("exit", (code) => {
      children.delete(child);
      if (code && !stdout.includes("\n")) reject(new Error(`${label} exited ${code}: ${stderr}`));
    });
  });
}

function startUnstructured(command, args, environment = {}, cwd = process.cwd()) {
  const child = spawn(command, args, { cwd, env: { ...process.env, ...environment }, stdio: ["ignore", "pipe", "pipe"] });
  children.add(child);
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  child.once("exit", () => children.delete(child));
  return { child, stderr: () => stderr };
}

async function stopChild(entry) {
  if (!entry?.child || entry.child.exitCode !== null) return;
  entry.child.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => entry.child.once("exit", resolve)), delay(5_000)]);
  if (entry.child.exitCode === null) entry.child.kill("SIGKILL");
}

async function webdriver(port, path, body) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json();
  if (!response.ok || payload.value?.error) throw new Error(`WebDriver error: ${JSON.stringify(payload.value)}`);
  return payload.value;
}

function hasMonetaryShape(text) {
  return /(?:\$|€|£|USD|EUR|GBP)\s?\d|\d\s?(?:USD|EUR|GBP)|\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b\s?(?:USD|EUR|GBP)/i.test(text);
}

function hasAny(text, needles) {
  const lower = text.toLowerCase();
  return needles.filter((needle) => lower.includes(needle.toLowerCase()));
}

async function buildStatic(staticRoot, apiBase) {
  await mkdir(evidenceRoot, { recursive: true });
  try {
    await execFileAsync("rsync", ["-a", "--delete", "--exclude", "node_modules", "--exclude", "dist", "--exclude", "*.tsbuildinfo", "static/", `${staticRoot}/`]);
  } catch {
    await execFileAsync("cp", ["-a", "static/.", staticRoot]);
  }
  await symlink(join(process.cwd(), "static", "node_modules"), join(staticRoot, "node_modules"), "dir");
  await execFileAsync("npm", ["--prefix", staticRoot, "run", "build"], {
    env: { ...process.env, VITE_ACS_API_BASE_URL: apiBase },
  });
}

async function runTheme(themeName, themePreference, staticBase, driverPort, screenshotsDir, historicalTexts) {
  const themeLabel = themeName.toUpperCase();
  geckodriver = startUnstructured(process.env.AEES_GECKODRIVER ?? "/snap/bin/geckodriver", ["--host", "0.0.0.0", "--port", String(driverPort)]);
  await waitFor("geckodriver", async () => (await fetch(`http://127.0.0.1:${driverPort}/status`)).ok);
  const session = await webdriver(driverPort, "/session", {
    capabilities: {
      alwaysMatch: {
        browserName: "firefox",
        "moz:firefoxOptions": {
          args: ["-headless"],
          prefs: { "layout.css.prefers-color-scheme.content-override": themePreference },
        },
      },
    },
  });
  browserSessionId = session.sessionId;
  try {
    await webdriver(driverPort, `/session/${browserSessionId}/url`, { url: `${staticBase}/operations/overview` });
    await waitFor(`dashboard overview UI (${themeLabel})`, async () => {
      const text = await webdriver(driverPort, `/session/${browserSessionId}/execute/sync`, {
        script: "return document.body.innerText",
        args: [],
      });
      return String(text).includes("Dashboard Overview") && String(text).includes("No active critical blockers");
    });

    const viewports = [
      [1440, 900],
      [1024, 768],
      [768, 1024],
      [390, 844],
    ];
    const checks = [];
    const screenshots = [];

    for (const [width, height] of viewports) {
      await webdriver(driverPort, `/session/${browserSessionId}/window/rect`, { x: 0, y: 0, width, height });
      const state = await webdriver(driverPort, `/session/${browserSessionId}/execute/sync`, {
        script: `return {
          text: document.body.innerText,
          overflow: document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth,
          unlabeledButtons: [...document.querySelectorAll('button')].filter((node) => !node.textContent.trim() && !node.getAttribute('aria-label')).length,
          unlabeledInputs: [...document.querySelectorAll('input, select, textarea')].filter((node) => !node.getAttribute('aria-label') && !node.getAttribute('aria-labelledby') && !node.closest('label')).length,
          missingImageAlt: [...document.images].filter((node) => !node.hasAttribute('alt')).length,
          monetaryShape: /(?:\\$|€|£|USD|EUR|GBP)\\s?\\d|\\d\\s?(?:USD|EUR|GBP)|\\b\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?\\b\\s?(?:USD|EUR|GBP)/i.test(document.body.innerText),
          consoleErrors: (window.__AEES16_CONSOLE_ERRORS__ ?? []),
          pageErrors: (window.__AEES16_PAGE_ERRORS__ ?? []),
          url: location.href,
          storage: JSON.stringify({...localStorage, ...sessionStorage})
        }`,
        args: [],
      });
      const image = await webdriver(driverPort, `/session/${browserSessionId}/screenshot`);
      const screenshot = join(screenshotsDir, `${themeName}-${width}x${height}.png`);
      await writeFile(screenshot, Buffer.from(image, "base64"));
      screenshots.push(screenshot);
      checks.push({
        theme: themeName,
        width,
        height,
        overflow: Boolean(state.overflow),
        unlabeledButtons: Number(state.unlabeledButtons ?? 0),
        unlabeledInputs: Number(state.unlabeledInputs ?? 0),
        missingImageAlt: Number(state.missingImageAlt ?? 0),
        historicalTextsPresent: hasAny(String(state.text), historicalTexts),
        monetaryShape: Boolean(state.monetaryShape),
        consoleErrors: Array.isArray(state.consoleErrors) ? state.consoleErrors.length : 0,
        pageErrors: Array.isArray(state.pageErrors) ? state.pageErrors.length : 0,
        tokenInStorage: /bearer|eyJ[a-zA-Z0-9_-]+/.test(String(state.storage)),
      });
    }

    const evaluation = {
      route: "/operations/overview",
      theme: themeName,
      screenshots,
      viewports: checks,
      accessibilityFailures: checks.reduce((sum, check) => sum + check.unlabeledButtons + check.unlabeledInputs + check.missingImageAlt, 0),
      horizontalOverflow: checks.filter((check) => check.overflow).length,
      consoleErrors: checks.reduce((sum, check) => sum + check.consoleErrors, 0),
      pageErrors: checks.reduce((sum, check) => sum + check.pageErrors, 0),
      noFakeDataSignals: checks.filter((check) => check.monetaryShape || check.historicalTextsPresent.length).length,
      tokenInStorage: checks.some((check) => check.tokenInStorage) ? 1 : 0,
    };

    return evaluation;
  } finally {
    await webdriver(driverPort, `/session/${browserSessionId}`, {}).catch(() => undefined);
    browserSessionId = undefined;
    await stopChild(geckodriver);
    geckodriver = undefined;
  }
}

const historicalTexts = [
  "The implementation still relies on in-memory or filesystem secret storage, which is not production-grade.",
  "Current HTTP auth is disabled or mock-only and does not enforce production identity validation.",
  "The implementation currently reports external exporters as disabled.",
  "The current worker implementation is local-only and does not prove remote dispatch.",
  "The current secret store is in-memory or filesystem based and not production-grade.",
  "The current governance policy only allows sandbox deployments.",
];

try {
  const [backendPort, staticPort, driverPort] = await Promise.all([freePort(), freePort(), freePort()]);
  const staticBase = `http://127.0.0.1:${staticPort}`;
  const apiBase = `http://127.0.0.1:${backendPort}`;
  const staticRoot = join(root, "static");
  const screenshotsDir = join(evidenceRoot, "screenshots");
  await mkdir(screenshotsDir, { recursive: true });

  backend = await startStructured(process.execPath, ["scripts/aees-rp-certified-dashboard-server.mjs"], {
    ACS_TEST_DIST_ROOT: distRoot,
    ACS_RP_PORT: String(backendPort),
    ACS_RP_HOST: "0.0.0.0",
    ACS_RP_BROWSER_ORIGIN: staticBase,
  }, "certified dashboard backend");
  await waitFor("dashboard API", async () => (await fetch(`${apiBase}/api/v1/dashboard`)).ok);
  const response = await fetch(`${apiBase}/api/v1/dashboard`);
  const payload = await response.json();
  const serialized = JSON.stringify(payload);
  manifest.endpoint = {
    requestUrl: "/api/v1/dashboard",
    status: response.status,
    historicalBlockerCount: payload.data?.historicalBlockerScan?.count,
    historicalTextsPresent: historicalTexts.filter((text) => serialized.includes(text)),
    warningCodes: payload.data?.operationalCaveats?.map((entry) => entry.code) ?? [],
    composition: payload.data?.composition,
  };

  await buildStatic(staticRoot, apiBase);
  preview = startUnstructured(process.execPath, [join(process.cwd(), "static", "node_modules", "vite", "bin", "vite.js"), "preview", "--host", "0.0.0.0", "--port", String(staticPort)], {}, staticRoot);
  await waitFor("static overview", async () => (await fetch(`${staticBase}/operations/overview`)).ok);

  const themeRuns = [
    ["light", 1],
    ["dark", 2],
  ];
  const evaluations = [];
  for (const [themeName, themePreference] of themeRuns) {
    const evaluation = await runTheme(themeName, themePreference, staticBase, driverPort, screenshotsDir, historicalTexts);
    evaluations.push(evaluation);
  }

  manifest.browser = {
    route: "/operations/overview",
    requestUrl: "/api/v1/dashboard",
    themeRuns: evaluations,
    accessibilityFailures: evaluations.reduce((sum, run) => sum + run.accessibilityFailures, 0),
    horizontalOverflow: evaluations.reduce((sum, run) => sum + run.horizontalOverflow, 0),
    consoleErrors: evaluations.reduce((sum, run) => sum + run.consoleErrors, 0),
    pageErrors: evaluations.reduce((sum, run) => sum + run.pageErrors, 0),
    screenshots: evaluations.flatMap((run) => run.screenshots),
  };
  manifest.sensitiveScan = {
    tokenInBrowserStorage: evaluations.some((run) => run.tokenInStorage) ? 1 : 0,
    monetaryShapes: evaluations.some((run) => run.viewports.some((viewport) => viewport.monetaryShape)) ? 1 : 0,
    historicalTexts: evaluations.some((run) => run.viewports.some((viewport) => viewport.historicalTextsPresent.length > 0)) ? 1 : 0,
  };
  manifest.result = manifest.endpoint.status === 200
    && manifest.endpoint.historicalBlockerCount === 0
    && manifest.endpoint.historicalTextsPresent.length === 0
    && evaluations.length === 2
    && manifest.browser.accessibilityFailures === 0
    && manifest.browser.horizontalOverflow === 0
    && manifest.browser.consoleErrors === 0
    && manifest.browser.pageErrors === 0
    && manifest.sensitiveScan.tokenInBrowserStorage === 0
    && manifest.sensitiveScan.monetaryShapes === 0
    && manifest.sensitiveScan.historicalTexts === 0
    ? "PASS" : "FAIL";
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  manifest.environmentLimitation = /listen EPERM|operation not permitted|EADDRINUSE|bind/i.test(message)
    ? "ENVIRONMENT_LIMITATION\nnot attributable to EPIC-16 documentation changes"
    : null;
  manifest.error = message;
  manifest.result = "FAIL";
  process.exitCode = 1;
} finally {
  await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 }).catch(() => undefined);
  process.stdout.write(JSON.stringify({ success: manifest.result === "PASS", result: manifest.result, outputPath, environmentLimitation: manifest.environmentLimitation }) + "\n");
  await Promise.allSettled([stopChild(preview), stopChild(backend), stopChild(geckodriver)]);
  for (const child of children) child.kill("SIGKILL");
}
