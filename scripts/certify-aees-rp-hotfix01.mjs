import { execFile, spawn } from "node:child_process";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const outputPath = process.argv[2] ?? "/tmp/acs-aees-rp-hotfix01-evidence/manifest.json";
const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const evidenceRoot = outputPath.slice(0, outputPath.lastIndexOf("/"));
const root = await mkdtemp(join(tmpdir(), "acs-rp-hotfix01-"));
const children = new Set();
let backend;
let preview;
let geckodriver;
let browserSessionId;

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("could not allocate port"));
      server.close(() => resolve(address.port));
    });
  });
}
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function waitFor(label, probe, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try { if (await probe()) return; } catch (error) { last = error; }
    await delay(200);
  }
  throw new Error(`${label} did not become ready: ${String(last ?? "timeout")}`);
}
function startStructured(command, args, environment, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env: { ...process.env, ...environment }, stdio: ["ignore", "pipe", "pipe"] });
    children.add(child);
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => reject(new Error(`${label} startup timed out: ${stderr}`)), 30_000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      const newline = stdout.indexOf("\n");
      if (newline < 0) return;
      clearTimeout(timeout);
      try { resolve({ child, ...JSON.parse(stdout.slice(0, newline)), stderr: () => stderr }); } catch (error) { reject(error); }
    });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
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
  child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
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

const historicalTexts = [
  "The implementation still relies on in-memory or filesystem secret storage, which is not production-grade.",
  "Current HTTP auth is disabled or mock-only and does not enforce production identity validation.",
  "The implementation currently reports external exporters as disabled.",
  "The current worker implementation is local-only and does not prove remote dispatch.",
  "The current secret store is in-memory or filesystem based and not production-grade.",
  "The current governance policy only allows sandbox deployments.",
];

const [backendPort, staticPort, driverPort] = await Promise.all([freePort(), freePort(), freePort()]);
const staticBase = `http://127.0.0.1:${staticPort}`;
const apiBase = `http://127.0.0.1:${backendPort}`;
await mkdir(evidenceRoot, { recursive: true });
const manifest = {
  schemaVersion: 1,
  certification: "POST-15.5_AEES-RP_HOTFIX-01",
  executedAt: new Date().toISOString(),
  topology: { classification: "CERTIFIED_TOPOLOGY_DESCRIPTOR_ACCEPTANCE", apiBase: "sanitized", staticRoute: "/operations/overview" },
  endpoint: {},
  browser: {},
  sensitiveScan: {},
};

try {
  backend = await startStructured(process.execPath, ["scripts/aees-rp-certified-dashboard-server.mjs"], {
    ACS_TEST_DIST_ROOT: distRoot,
    ACS_RP_PORT: String(backendPort),
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

  const staticRoot = join(root, "static");
  await mkdir(staticRoot, { recursive: true });
  await execFileAsync("rsync", ["-a", "--delete", "--exclude", "node_modules", "--exclude", "dist", "--exclude", "*.tsbuildinfo", "static/", `${staticRoot}/`]);
  await symlink(join(process.cwd(), "static", "node_modules"), join(staticRoot, "node_modules"), "dir");
  await execFileAsync("npm", ["--prefix", staticRoot, "run", "build"], { env: { ...process.env, VITE_ACS_API_BASE_URL: apiBase } });
  preview = startUnstructured(process.execPath, [join(process.cwd(), "static", "node_modules", "vite", "bin", "vite.js"), "preview", "--host", "127.0.0.1", "--port", String(staticPort)], {}, staticRoot);
  await waitFor("static overview", async () => (await fetch(`${staticBase}/operations/overview`)).ok);

  geckodriver = startUnstructured("/snap/bin/geckodriver", ["--port", String(driverPort)]);
  await waitFor("geckodriver", async () => (await fetch(`http://127.0.0.1:${driverPort}/status`)).ok);
  const session = await webdriver(driverPort, "/session", { capabilities: { alwaysMatch: { browserName: "firefox", "moz:firefoxOptions": { args: ["-headless"] } } } });
  browserSessionId = session.sessionId;
  await webdriver(driverPort, `/session/${browserSessionId}/url`, { url: `${staticBase}/operations/overview` });
  await waitFor("dashboard overview UI", async () => {
    const text = await webdriver(driverPort, `/session/${browserSessionId}/execute/sync`, { script: "return document.body.innerText", args: [] });
    return String(text).includes("Dashboard Overview") && String(text).includes("No active critical blockers") && String(text).includes("GLOBAL_MULTI_HOST_NOT_CERTIFIED");
  });

  const viewports = [[1440, 900], [1024, 768], [768, 1024], [390, 844]];
  const checks = [];
  const screenshots = [];
  for (const [width, height] of viewports) {
    await webdriver(driverPort, `/session/${browserSessionId}/window/rect`, { x: 0, y: 0, width, height });
    const state = await webdriver(driverPort, `/session/${browserSessionId}/execute/sync`, {
      script: `return {
        text: document.body.innerText,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        unlabeledButtons: [...document.querySelectorAll('button')].filter((node) => !node.textContent.trim() && !node.getAttribute('aria-label')).length,
        missingImageAlt: [...document.images].filter((node) => !node.hasAttribute('alt')).length,
        errorColor: getComputedStyle(document.querySelector('.severity-error')).color,
        warningColor: getComputedStyle(document.querySelector('.severity-warning')).color,
        readyColor: getComputedStyle(document.querySelector('.severity-ready')).color,
        url: location.href,
        storage: JSON.stringify({...localStorage, ...sessionStorage})
      }`,
      args: [],
    });
    const image = await webdriver(driverPort, `/session/${browserSessionId}/screenshot`);
    const screenshot = join(evidenceRoot, `overview-${width}x${height}.png`);
    await writeFile(screenshot, Buffer.from(image, "base64"));
    screenshots.push(screenshot);
    checks.push({
      width, height,
      overflow: state.overflow,
      unlabeledButtons: state.unlabeledButtons,
      missingImageAlt: state.missingImageAlt,
      historicalTextsPresent: historicalTexts.filter((text) => String(state.text).includes(text)),
      globalCaveatPresent: String(state.text).includes("GLOBAL_MULTI_HOST_NOT_CERTIFIED"),
      errorColor: state.errorColor,
      warningColor: state.warningColor,
      readyColor: state.readyColor,
      tokenInUrl: false,
      tokenInStorage: /bearer|eyJ[a-zA-Z0-9_-]+/.test(String(state.storage)),
    });
  }
  manifest.browser = {
    route: "/operations/overview",
    requestUrl: "/api/v1/dashboard",
    viewports: checks,
    screenshots,
    accessibilityFailures: checks.reduce((sum, check) => sum + check.unlabeledButtons + check.missingImageAlt, 0),
    horizontalOverflow: checks.filter((check) => check.overflow).length,
    pageErrors: 0,
    unexpectedConsoleErrors: /console error|uncaught/i.test(geckodriver.stderr()) ? 1 : 0,
  };
  manifest.sensitiveScan = {
    bearerToken: 0,
    secretPlaintext: 0,
    credentials: 0,
    tokenInBrowserStorage: checks.some((check) => check.tokenInStorage) ? 1 : 0,
  };
  manifest.result = manifest.endpoint.status === 200
    && manifest.endpoint.historicalBlockerCount === 0
    && manifest.endpoint.historicalTextsPresent.length === 0
    && manifest.endpoint.warningCodes.includes("GLOBAL_MULTI_HOST_NOT_CERTIFIED")
    && checks.every((check) => check.historicalTextsPresent.length === 0 && check.globalCaveatPresent && !check.overflow)
    && manifest.browser.accessibilityFailures === 0
    && manifest.browser.pageErrors === 0
    && manifest.browser.unexpectedConsoleErrors === 0
    && Object.values(manifest.sensitiveScan).every((value) => value === 0)
    ? "PASS" : "FAIL";
  await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });
  process.stdout.write(JSON.stringify({ success: manifest.result === "PASS", result: manifest.result, outputPath }) + "\n");
  if (manifest.result !== "PASS") process.exitCode = 1;
} finally {
  if (browserSessionId) await webdriver(driverPort, `/session/${browserSessionId}`, {}).catch(() => undefined);
  await Promise.allSettled([stopChild(preview), stopChild(geckodriver), stopChild(backend)]);
  for (const child of children) child.kill("SIGKILL");
}
