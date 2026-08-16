import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { createServer as createHttpServer, request as createHttpRequest } from "node:http";
import { access, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "../..");
const staticRoot = join(repoRoot, "static");
const distRoot = process.env.ACS_AEES_F_DIST_ROOT ?? join(repoRoot, "dist");
const evidenceRoot = process.env.ACS_AEES_F_EVIDENCE_ROOT ?? "/tmp/acs-epic15-5-aees-f-evidence";
const manifestPath = join(evidenceRoot, "manifest.json");
const signingKey = "aees-f-worker-service-key-with-at-least-thirty-two-bytes";
const issuer = "https://identity.test/aees-f-worker";
const audience = "acs-runtime-worker";
const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];
const routeMatrix = [
  { app: "control-plane", path: "/agents" },
  { app: "control-plane", path: "/agents/dev-agent-sandbox" },
  { app: "control-plane", path: "/credentials" },
  { app: "control-plane", path: "/executions" },
  { app: "control-plane", path: "/workers" },
  { app: "control-plane", path: "/operations" },
  { app: "control-plane", path: "/readiness" },
  { app: "tenant-admin", path: "/admin/tenants" },
  { app: "tenant-admin", path: "/admin/tenants/tenant-dev" },
  { app: "tenant-admin", path: "/admin/tenants/tenant-dev/members" },
  { app: "tenant-admin", path: "/admin/tenants/tenant-dev/governance" },
  { app: "tenant-admin", path: "/admin/tenants/tenant-dev/entitlements" },
  { app: "tenant-admin", path: "/admin/tenants/tenant-dev/limits" },
  { app: "tenant-admin", path: "/admin/tenants/tenant-dev/audit" },
];

const { issueSignedWorkerToken } = await import(pathToFileURL(join(distRoot, "index.js")).href);

function log(message, details) {
  process.stdout.write(`[AEES-F] ${message}${details ? ` ${JSON.stringify(details)}` : ""}\n`);
}

function slug(value) {
  return value.replaceAll(/[^a-zA-Z0-9]+/g, "-").replaceAll(/^-+|-+$/g, "").toLowerCase() || "route";
}

async function reservePort() {
  const server = createNetServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("unable to reserve a TCP port");
  await new Promise((resolveClose) => server.close(resolveClose));
  return address.port;
}

function spawnProcess(command, args, { cwd = repoRoot, environment = {}, detached = false } = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...environment },
    stdio: ["ignore", "pipe", "pipe"],
    detached,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  return { child, stdout: () => stdout, stderr: () => stderr };
}

async function runProcess(command, args, options, timeoutMs = 90_000) {
  const runtime = spawnProcess(command, args, options);
  const exitCode = await Promise.race([
    new Promise((resolveExit, reject) => {
      runtime.child.once("error", reject);
      runtime.child.once("exit", resolveExit);
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`command timed out: ${command} ${args.join(" ")}`)), timeoutMs)),
  ]);
  if (exitCode !== 0) throw new Error(`command failed (${exitCode}): ${command} ${args.join(" ")}\n${runtime.stderr()}`);
  return runtime;
}

async function startJsonProcess(entrypoint, environment, service, timeoutMs = 60_000) {
  const runtime = spawnProcess(process.execPath, [entrypoint], { environment, detached: true });
  const ready = await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => reject(new Error(`timed out starting ${service}; stdout=${runtime.stdout()}; stderr=${runtime.stderr()}`)), timeoutMs);
    const inspect = () => {
      for (const line of runtime.stdout().split(/\r?\n/)) {
        if (!line.startsWith("{")) continue;
        try {
          const value = JSON.parse(line);
          if (value.success === true && value.service === service) {
            clearTimeout(timeout);
            resolveReady(value);
            return;
          }
        } catch { /* partial line */ }
      }
    };
    runtime.child.stdout.on("data", inspect);
    runtime.child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`${service} exited before ready (${code}/${signal}); stderr=${runtime.stderr()}`));
    });
    inspect();
  });
  return { ...runtime, ready };
}

async function stopProcess(runtime, signal = "SIGTERM") {
  if (!runtime?.child || runtime.child.exitCode !== null || runtime.child.signalCode !== null) return;
  try { process.kill(-runtime.child.pid, signal); } catch { runtime.child.kill(signal); }
  await new Promise((resolveExit) => {
    const timer = setTimeout(() => {
      try { process.kill(-runtime.child.pid, "SIGKILL"); } catch { runtime.child.kill("SIGKILL"); }
      resolveExit();
    }, 8_000);
    runtime.child.once("exit", () => { clearTimeout(timer); resolveExit(); });
  });
}

function workerToken(workerId, instanceId) {
  return issueSignedWorkerToken({
    issuer,
    audience,
    signingKey,
    workerId,
    instanceId,
    capabilities: ["engine:openclaw", "isolation:sandbox", "deployment:sandbox", "target:local-wsl"],
    expiresAt: Date.now() + 20 * 60_000,
  });
}

async function startWorker(root, baseUrl, workerId, instanceId, { failure = false, delayMs = 6_000 } = {}) {
  const runtimeRoot = join(root, workerId, "runtime-root");
  const stateRoot = join(runtimeRoot, ".acs", "state");
  const configRoot = join(runtimeRoot, ".acs", "config");
  const artifactsRoot = join(runtimeRoot, ".acs", "artifacts");
  const workspaceRoot = join(runtimeRoot, ".acs", "workspace");
  await Promise.all([stateRoot, configRoot, artifactsRoot, workspaceRoot].map((path) => mkdir(path, { recursive: true })));
  await writeFile(join(configRoot, "openclaw.json"), "{}\n", "utf8");
  const entrypoint = failure
    ? join(repoRoot, "tests", "fixtures", "aees-e-failure-worker-process.mjs")
    : join(distRoot, "workers", "remote-worker-entrypoint.js");
  return startJsonProcess(entrypoint, {
    ACS_TEST_DIST_URL: pathToFileURL(join(distRoot, "index.js")).href,
    ACS_ROOT: repoRoot,
    ACS_CONTROL_PLANE_URL: baseUrl,
    ACS_WORKER_TOKEN: workerToken(workerId, instanceId),
    ACS_WORKER_ID: workerId,
    ACS_WORKER_INSTANCE_ID: instanceId,
    ACS_WORKER_NAME: workerId,
    ACS_WORKER_VERSION: "1.0.0-aees-f",
    ACS_WORKER_TARGET_ID: "local-wsl",
    ACS_WORKER_HEARTBEAT_INTERVAL_MS: "2000",
    ACS_WORKER_POLL_INTERVAL_MS: "1000",
    ACS_WORKER_LEASE_RENEW_INTERVAL_MS: "3000",
    ACS_WORKER_REQUEST_TIMEOUT_MS: "30000",
    ACS_WORKER_EXECUTION_DELAY_MS: String(delayMs),
    NO_PROXY: "127.0.0.1,localhost",
    no_proxy: "127.0.0.1,localhost",
    HTTP_PROXY: "",
    HTTPS_PROXY: "",
    ALL_PROXY: "",
    NODE_USE_ENV_PROXY: "0",
    ACS_RUNTIME_ROOT: runtimeRoot,
    ACS_STATE_ROOT: stateRoot,
    ACS_CONFIG_ROOT: configRoot,
    ACS_ARTIFACTS_ROOT: artifactsRoot,
    ACS_WORKSPACE_ROOT: workspaceRoot,
  }, failure ? "acs-aees-e-failure-worker" : "acs-remote-worker");
}

async function waitFor(check, label, timeoutMs = 75_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      last = await check();
    } catch (error) {
      last = { transportError: error instanceof Error ? error.message : String(error) };
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
      continue;
    }
    if (last) return last;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`timed out waiting for ${label}; last=${JSON.stringify(last)}`);
}

function processEvents(runtime) {
  return `${runtime.stdout()}\n${runtime.stderr()}`.split(/\r?\n/).flatMap((line) => {
    if (!line.trim().startsWith("{")) return [];
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

async function waitForProcessEvent(runtime, category, jobId, timeoutMs = 120_000) {
  return waitFor(() => processEvents(runtime).find((event) => event.category === category && (!jobId || event.jobId === jobId)), `${category} process event`, timeoutMs);
}

async function api(baseUrl, path, options = {}) {
  const payload = options.body ? Buffer.from(JSON.stringify(options.body), "utf8") : undefined;
  const method = options.method ?? "GET";
  let response;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await rawHttpRequest(baseUrl + path, {
        method,
        headers: {
          "x-acs-actor-id": "system",
          "x-acs-actor-type": "system",
          ...(payload ? { "content-type": "application/json", "content-length": String(payload.byteLength) } : {}),
        },
        payload,
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
    }
  }
  if (!response) throw new Error(`${method} ${path} failed after transport retries`, { cause: lastError });
  const body = response.status === 204 || response.data.byteLength === 0
    ? undefined
    : JSON.parse(response.data.toString("utf8"));
  return { status: response.status, body, headers: response.headers };
}

async function rawHttpRequest(url, { method = "GET", headers = {}, payload } = {}) {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = createHttpRequest(new URL(url), { method, headers }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.once("end", () => resolveRequest({
        status: response.statusCode ?? 502,
        headers: response.headers,
        data: Buffer.concat(chunks),
      }));
    });
    request.once("error", (error) => rejectRequest(new Error(`${method} ${url} failed: ${error.message}`, { cause: error })));
    request.setTimeout(30_000, () => request.destroy(new Error(`timed out after 30000ms`)));
    if (payload) request.write(payload);
    request.end();
  });
}

async function buildSpa(viteRoot, outDir, environment) {
  const viteBin = join(viteRoot, "node_modules", "vite", "bin", "vite.js");
  await access(viteBin, fsConstants.R_OK);
  await runProcess(process.execPath, [viteBin, "build", "--outDir", outDir, "--emptyOutDir"], { cwd: viteRoot, environment });
}

function mimeType(filePath) {
  return ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" })[extname(filePath)] ?? "application/octet-stream";
}

async function startSpaServer(buildRoot, port, backendUrl) {
  const root = normalize(resolve(buildRoot));
  const server = createHttpServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? "/", `http://127.0.0.1:${port}`).pathname);
      if (pathname.startsWith("/api/v1")) {
        const chunks = [];
        if (request.method !== "GET" && request.method !== "HEAD") {
          for await (const chunk of request) chunks.push(chunk);
        }
        const target = new URL(pathname + new URL(request.url ?? "/", `http://127.0.0.1:${port}`).search, backendUrl);
        const upstream = await new Promise((resolveUpstream, rejectUpstream) => {
          const requestBody = chunks.length ? Buffer.concat(chunks) : undefined;
          const upstreamRequest = createHttpRequest(target, {
            method: request.method,
            headers: {
              ...(request.headers.authorization ? { authorization: request.headers.authorization } : {}),
              ...(request.headers["content-type"] ? { "content-type": request.headers["content-type"] } : {}),
              ...(requestBody ? { "content-length": String(requestBody.byteLength) } : {}),
              ...(request.headers["x-correlation-id"] ? { "x-correlation-id": request.headers["x-correlation-id"] } : {}),
              ...(request.headers["x-acs-actor-id"] ? { "x-acs-actor-id": request.headers["x-acs-actor-id"] } : {}),
              ...(request.headers["x-acs-actor-type"] ? { "x-acs-actor-type": request.headers["x-acs-actor-type"] } : {}),
            },
          }, (upstreamResponse) => {
            const responseChunks = [];
            upstreamResponse.on("data", (chunk) => responseChunks.push(chunk));
            upstreamResponse.once("end", () => resolveUpstream({
              status: upstreamResponse.statusCode ?? 502,
              headers: upstreamResponse.headers,
              data: Buffer.concat(responseChunks),
            }));
          });
          upstreamRequest.once("error", rejectUpstream);
          if (requestBody) upstreamRequest.write(requestBody);
          upstreamRequest.end();
        });
        response.writeHead(upstream.status, {
          "content-type": upstream.headers["content-type"] ?? "application/json; charset=utf-8",
          ...(upstream.headers["retry-after"] ? { "retry-after": upstream.headers["retry-after"] } : {}),
          ...(upstream.headers["x-request-id"] ? { "x-request-id": upstream.headers["x-request-id"] } : {}),
        });
        response.end(upstream.data);
        return;
      }
      const relative = pathname.replace(/^\/+/, "");
      let filePath = normalize(resolve(root, relative || "index.html"));
      if (!filePath.startsWith(root)) throw new Error("invalid path");
      try {
        const info = await stat(filePath);
        if (info.isDirectory()) filePath = join(filePath, "index.html");
      } catch {
        filePath = join(root, "index.html");
      }
      const data = await readFile(filePath);
      response.writeHead(200, { "content-type": mimeType(filePath), "cache-control": "no-store" });
      response.end(data);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolveListen);
  });
  return server;
}

async function accessibilityCheck(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
    };
    const buttons = [...document.querySelectorAll("button")].filter(visible);
    const inputs = [...document.querySelectorAll("input, select, textarea")].filter(visible);
    const unnamedButtons = buttons.filter((element) => !(element.getAttribute("aria-label") || element.textContent?.trim())).length;
    const unlabeledInputs = inputs.filter((element) => {
      if (element.getAttribute("aria-label") || element.getAttribute("aria-labelledby")) return false;
      const id = element.getAttribute("id");
      if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) return false;
      return !element.closest("label");
    }).length;
    const dialogs = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter(visible);
    const unnamedDialogs = dialogs.filter((element) => !(element.getAttribute("aria-label") || element.getAttribute("aria-labelledby"))).length;
    return {
      headings: document.querySelectorAll("h1, h2, h3").length,
      landmarks: document.querySelectorAll("main, nav, header, footer, [role='main'], [role='navigation']").length,
      buttons: buttons.length,
      inputs: inputs.length,
      unnamedButtons,
      unlabeledInputs,
      unnamedDialogs,
      status: document.querySelector("h1") && unnamedButtons === 0 && unlabeledInputs === 0 && unnamedDialogs === 0 ? "PASS" : "FAIL",
    };
  });
}

async function inspectRoute(browser, route, viewport, origins) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width <= 768 });
  const page = await context.newPage();
  const consoleMessages = [];
  const failedResponses = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleMessages.push({ text: message.text(), location: message.location() ?? null });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() });
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const origin = route.app === "control-plane" ? origins.controlPlane : origins.tenantAdmin;
  const url = origin + route.path;
  const screenshot = join(evidenceRoot, "screenshots", `${route.app}-${slug(route.path)}-${viewport.width}x${viewport.height}.png`);
  let failure;
  let heading;
  let overflow = false;
  let accessibility = { status: "FAIL" };
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (!response?.ok()) throw new Error(`route returned HTTP ${response?.status()}`);
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 30_000 });
    if (route.app === "tenant-admin") {
      await page.locator(".admin-skeleton").first().waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
    }
    await page.waitForTimeout(400);
    heading = (await page.locator("h1").first().textContent())?.trim();
    overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    accessibility = await accessibilityCheck(page);
    await page.screenshot({ path: screenshot, fullPage: true });
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
  }
  await context.close();
  const ignoredConsoleErrors = consoleMessages.filter((entry) => {
    const location = entry.location?.url?.toLowerCase() ?? "";
    return location.includes("fonts.googleapis.com") || location.includes("fonts.gstatic.com") || location.endsWith("/favicon.ico");
  });
  const consoleErrors = consoleMessages.filter((entry) => !ignoredConsoleErrors.includes(entry));
  const ignoredResponses = failedResponses.filter((entry) => {
    const target = entry.url.toLowerCase();
    return target.includes("fonts.googleapis.com") || target.includes("fonts.gstatic.com") || target.endsWith("/favicon.ico");
  });
  const unexpectedResponses = failedResponses.filter((entry) => !ignoredResponses.includes(entry));
  return {
    ...route,
    viewport,
    url,
    heading,
    screenshot,
    horizontalOverflow: overflow,
    accessibility,
    consoleErrors,
    failedResponses: unexpectedResponses,
    ignoredExternalErrors: [...ignoredConsoleErrors, ...ignoredResponses],
    pageErrors,
    status: failure || overflow || accessibility.status !== "PASS" || consoleErrors.length || unexpectedResponses.length || pageErrors.length ? "FAIL" : "PASS",
    ...(failure ? { failure } : {}),
  };
}

async function screenshot(page, name) {
  const target = join(evidenceRoot, "journeys", `${slug(name)}.png`);
  await page.screenshot({ path: target, fullPage: true });
  return target;
}

async function runJourneys(browser, origins, backendUrl, runtime) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const journeys = {};
  const mutations = [];
  const runtimeEvidence = {};
  let worker = runtime.worker;
  try {
    await page.goto(origins.controlPlane + "/credentials");
    await page.getByRole("heading", { name: "Secret references" }).waitFor();
    const browserApiProbe = await page.evaluate(async (url) => {
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 8_000);
        const response = await fetch(url, { signal: controller.signal });
        window.clearTimeout(timer);
        return { ok: response.ok, status: response.status, text: await response.text() };
      } catch (error) {
        return { ok: false, status: 0, text: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
      }
    }, origins.controlPlane + "/api/v1/health");
    if (!browserApiProbe.ok) throw new Error(`browser Product API probe failed: ${JSON.stringify(browserApiProbe)}`);
    await page.getByLabel("Credential id").fill("cred-aees-f");
    await page.getByLabel("Provider").fill("openai");
    await page.getByLabel("Purpose").fill("model:inference");
    await page.getByLabel("Secret value").fill("aees-f-browser-secret-never-expose");
    await page.getByRole("button", { name: "Store credential" }).click();
    const credentialFeedback = page.getByTestId("credential-operation-feedback");
    await credentialFeedback.waitFor({ timeout: 30_000 });
    const credentialFeedbackText = (await credentialFeedback.innerText()).trim();
    if (!credentialFeedbackText.includes("stored as write-only")) {
      throw new Error(`credential mutation feedback: ${credentialFeedbackText}; body=${(await page.locator("body").innerText()).slice(0, 4000)}`);
    }
    const pageText = await page.locator("body").innerText();
    if (pageText.includes("aees-f-browser-secret-never-expose")) throw new Error("secret plaintext rendered after write");
    mutations.push({ operation: "credential.create", credentialId: "cred-aees-f", plaintextRendered: false });
    const credentialCard = page.locator("article").filter({ hasText: "cred-aees-f" });
    await credentialCard.getByRole("button", { name: "Rotate" }).click();
    const rotationDialog = page.getByRole("dialog", { name: "Rotate cred-aees-f" });
    const replacementInput = rotationDialog.getByLabel("Replacement secret value");
    await replacementInput.waitFor();
    if (!await replacementInput.evaluate((element) => document.activeElement === element)) {
      throw new Error("rotation dialog did not focus its labelled secret input");
    }
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => document.activeElement?.textContent?.trim()) !== "Cancel") {
      throw new Error("rotation dialog keyboard order did not reach the safe cancel action");
    }
    await page.keyboard.press("Enter");
    await rotationDialog.waitFor({ state: "detached" });
    journeys.keyboard = { status: "PASS", flow: "dialog focus -> Tab -> safe cancel via Enter" };

    const agentId = `aees-f-agent-${Date.now().toString(36)}`;
    await page.goto(origins.controlPlane + "/agents/new");
    await page.getByRole("heading", { name: "Create Agent" }).waitFor();
    await page.getByLabel("Agent ID").fill(agentId);
    await page.getByLabel("Name").fill("AEES F Browser Agent");
    await page.getByLabel("Status").selectOption("active");
    await page.getByLabel("Role").selectOption("role.executor");
    await page.getByLabel("Profile").selectOption("profile.default");
    await page.locator("label").filter({ hasText: "Model provider" }).locator("select").selectOption("axodus");
    await page.locator("label").filter({ hasText: /^Model(?:No model|Axodus|Only models)/ }).locator("select").selectOption("axodus-multi");
    await page.locator("fieldset").filter({ hasText: "Capabilities" }).locator("label").filter({ hasText: "deployment.sandbox" }).locator("input").check();
    await page.locator("fieldset").filter({ hasText: "Skills" }).locator("label").first().locator("input").check();
    await page.locator("fieldset").filter({ hasText: "Tools" }).locator("label").first().locator("input").check();
    await page.locator("label").filter({ hasText: /^Credential connections/ }).locator("input").fill("cred-aees-f");
    await page.getByRole("button", { name: "Create agent" }).click();
    await page.waitForURL(new RegExp(`/agents/${agentId}$`), { timeout: 30_000 });
    await page.getByRole("heading", { name: "Prepare, deploy and execute" }).waitFor();
    mutations.push({ operation: "agent.create", agentId });
    const deploymentState = await page.evaluate(async (id) => {
      const [readinessResponse, planResponse] = await Promise.all([
        fetch(`/api/v1/agents/${id}/readiness`),
        fetch(`/api/v1/agents/${id}/deployment-plan`),
      ]);
      return {
        readiness: await readinessResponse.json(),
        plan: await planResponse.json(),
      };
    }, agentId);
    if (deploymentState.plan?.data?.eligible !== true) {
      throw new Error(`created Agent is not deployment eligible: ${JSON.stringify(deploymentState)}`);
    }
    await page.getByRole("button", { name: "Deploy sandbox" }).click();
    const deployFeedback = page.getByTestId("agent-operation-feedback");
    await deployFeedback.waitFor({ timeout: 45_000 });
    const deployFeedbackText = (await deployFeedback.innerText()).trim();
    if (!deployFeedbackText.includes("Sandbox deployment accepted")) {
      throw new Error(`sandbox deployment feedback: ${deployFeedbackText}`);
    }
    mutations.push({ operation: "agent.deploy", agentId, target: "sandbox" });
    await waitFor(async () => {
      await page.getByRole("button", { name: "Execute" }).isEnabled().catch(() => false);
      return page.getByRole("button", { name: "Execute" }).isEnabled();
    }, "execution button enablement", 30_000);
    await page.getByRole("button", { name: "Execute" }).click();
    const executionFeedback = page.getByTestId("agent-operation-feedback");
    await executionFeedback.waitFor({ timeout: 30_000 });
    const executionFeedbackText = (await executionFeedback.innerText()).trim();
    if (!executionFeedbackText.includes("Remote execution accepted")) {
      throw new Error(`remote execution feedback: ${executionFeedbackText}`);
    }
    mutations.push({ operation: "runtime.start", agentId });

    const queued = await waitFor(async () => {
      const response = await api(backendUrl, "/api/v1/runtime/jobs");
      return response.body.data.find((entry) => entry.agentId === agentId && entry.status === "queued");
    }, "durable queued job before worker dispatch");
    runtimeEvidence.jobId = queued.jobId;
    await page.goto(origins.controlPlane + `/executions/${queued.jobId}`);
    await page.getByRole("heading", { name: /Job / }).waitFor();
    runtimeEvidence.queuedScreenshot = await screenshot(page, "remote-job-queued");
    await page.goto("about:blank");
    worker = await startWorker(runtime.root, backendUrl, "worker-f-primary", "instance-f-primary", { delayMs: 30_000 });
    runtime.processes.push(worker);
    runtime.processEvidence.push({ role: "worker-primary", pid: worker.ready.processId, workerId: worker.ready.workerId });
    const runningEvent = await waitForProcessEvent(worker, "runtime.worker.running", queued.jobId);
    runtimeEvidence.workerId = worker.ready.workerId;
    runtimeEvidence.assignmentId = runningEvent.assignmentId;
    await stopProcess(worker, "SIGKILL");
    worker = null;
    await waitFor(async () => {
      const response = await api(backendUrl, `/api/v1/runtime/jobs/${queued.jobId}`);
      return response.body.data.status === "queued" ? response.body.data : undefined;
    }, "worker crash recovery queue", 150_000);
    const recoveredWorker = await startWorker(runtime.root, backendUrl, "worker-f-recovery", "instance-f-recovery", { delayMs: 100 });
    runtime.processes.push(recoveredWorker);
    runtime.processEvidence.push({ role: "worker-recovery", pid: recoveredWorker.ready.processId, workerId: recoveredWorker.ready.workerId });
    worker = recoveredWorker;
    await waitForProcessEvent(worker, "runtime.worker.result_committed", queued.jobId);
    await stopProcess(worker, "SIGTERM");
    worker = null;
    const completed = await waitFor(async () => {
      const response = await api(backendUrl, `/api/v1/runtime/jobs/${queued.jobId}`);
      return response.body.data.status === "succeeded" ? response.body.data : undefined;
    }, "recovered job durable completion");
    runtimeEvidence.finalStatus = completed.status;
    runtimeEvidence.attempt = completed.attempt;
    await page.goto(origins.controlPlane + `/executions/${queued.jobId}`);
    await page.getByRole("heading", { name: /Job / }).waitFor();
    await page.getByText(/recover/i).first().waitFor({ timeout: 30_000 });
    const recoveryShot = await screenshot(page, "worker-crash-recovery");
    journeys.A = { status: "PASS", flow: "secret -> agent create/configure -> readiness -> deploy", agentId };
    journeys.B = { status: "PASS", flow: "execute -> remote assignment -> durable result", jobId: queued.jobId };
    journeys.C = { status: "PASS", flow: "worker crash -> lease recovery -> reassignment -> completion", screenshot: recoveryShot };

    await page.goto("about:blank");
    const injected = await api(backendUrl, "/api/v1/runtimes/runtime-aees-f-failed/start", {
      method: "POST",
      body: { deploymentId: "deployment-aees-f-failed", agentId, targetId: "local-wsl", maxAttempts: 1, idempotencyKey: "aees-f:failed" },
    });
    if (injected.status !== 200) throw new Error(`failed incident injection: ${JSON.stringify(injected.body)}`);
    const failedJobId = injected.body.data.jobId;
    const failureWorker = await startWorker(runtime.root, backendUrl, "worker-f-failure", "instance-f-failure", { failure: true });
    runtime.processes.push(failureWorker);
    runtime.processEvidence.push({ role: "worker-failure", pid: failureWorker.ready.processId, workerId: failureWorker.ready.workerId });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 10_000));
    await stopProcess(failureWorker, "SIGTERM");
    const failed = await waitFor(async () => {
      const response = await api(backendUrl, `/api/v1/runtime/jobs/${failedJobId}`);
      return response.body.data.status === "failed" ? response.body.data : undefined;
    }, "failed workload terminal state");
    await page.goto(origins.controlPlane + `/executions/${failedJobId}`);
    await page.getByRole("heading", { name: /Job / }).waitFor();
    await page.getByText(/Recommended action/i).waitFor();
    journeys.D = { status: "PASS", flow: "failed job -> reason -> recommended action", jobId: failedJobId, failureCode: failed.error?.code, screenshot: await screenshot(page, "failed-job-diagnostics") };
    await page.goto(origins.controlPlane + "/operations");
    await page.getByRole("heading", { name: "Operations" }).waitFor();
    await page.getByText(/NO_ELIGIBLE_WORKERS|No eligible workers/i).first().waitFor({ timeout: 30_000 });
    journeys.E = { status: "PASS", flow: "worker outage -> readiness reason -> remediation", screenshot: await screenshot(page, "no-eligible-worker") };

    const tenantId = `tenant-f-${Date.now().toString(36)}`;
    await page.goto(origins.tenantAdmin + "/admin/tenants");
    await page.getByRole("heading", { name: "Tenants", exact: true }).waitFor();
    await page.getByLabel("Tenant id").fill(tenantId);
    await page.getByLabel("Display name").fill("AEES F Tenant");
    await page.getByRole("button", { name: "Create tenant" }).click();
    await page.getByText(tenantId).waitFor({ timeout: 30_000 });
    await page.getByRole("button", { name: "AEES F Tenant" }).click();
    await page.getByRole("button", { name: "governance", exact: true }).click();
    await page.waitForURL(new RegExp(`/admin/tenants/${tenantId}/governance$`));
    await page.getByRole("heading", { name: "Current policy", exact: true }).waitFor();
    journeys.F = { status: "PASS", flow: "tenant create -> detail -> governance", tenantId, screenshot: await screenshot(page, "tenant-administration") };
    mutations.push({ operation: "tenant.create", tenantId });

    const unauthorizedContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      extraHTTPHeaders: { "x-acs-actor-id": "aees-f-outsider", "x-acs-actor-type": "user" },
    });
    const unauthorizedPage = await unauthorizedContext.newPage();
    await unauthorizedPage.goto(origins.tenantAdmin + "/admin/tenants");
    await unauthorizedPage.getByRole("alert").filter({ hasText: /Forbidden|authority|authorized/i }).waitFor({ timeout: 30_000 });
    journeys.G = { status: "PASS", flow: "authenticated principal without platform authority -> coherent denial", screenshot: await screenshot(unauthorizedPage, "authorization-denied") };
    await unauthorizedContext.close();

    const errorContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ratePage = await errorContext.newPage();
    await ratePage.route("**/api/v1/runtime/jobs*", (route) => route.fulfill({ status: 429, contentType: "application/json", headers: { "retry-after": "3" }, body: JSON.stringify({ success: false, error: { code: "rate_limit_exceeded", message: "rate limit exceeded", retryable: true } }) }));
    await ratePage.goto(origins.controlPlane + "/executions");
    await ratePage.getByRole("alert").filter({ hasText: /rate limited/i }).waitFor();
    const outagePage = await errorContext.newPage();
    await outagePage.route("**/api/v1/system/operational-status*", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "dependency_unavailable", message: "dependency unavailable", retryable: true } }) }));
    await outagePage.goto(origins.controlPlane + "/operations");
    await outagePage.getByRole("alert").filter({ hasText: /dependency is unavailable/i }).waitFor();
    journeys.errorUX = { status: "PASS", scenarios: [403, 429, 503] };
    await errorContext.close();
  } finally {
    runtime.worker = worker;
    await context.close();
  }
  return { journeys, mutations, runtimeEvidence };
}

async function main() {
  await access(join(distRoot, "index.js"), fsConstants.R_OK);
  await rm(evidenceRoot, { recursive: true, force: true });
  await Promise.all(["screenshots", "journeys"].map((name) => mkdir(join(evidenceRoot, name), { recursive: true })));
  const root = await mkdtemp(join(tmpdir(), "acs-aees-f-browser-"));
  const [backendPort, controlPlanePort, tenantAdminPort] = await Promise.all([reservePort(), reservePort(), reservePort()]);
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  const origins = {
    controlPlane: `http://127.0.0.1:${controlPlanePort}`,
    tenantAdmin: `http://127.0.0.1:${tenantAdminPort}`,
  };
  const runtime = { root, processes: [], processEvidence: [], worker: null };
  let controlPlaneServer;
  let tenantAdminServer;
  let browser;
  const manifest = {
    generatedAt: new Date().toISOString(),
    status: "BLOCKED",
    topology: { backendUrl, ...origins, processes: [], runtimeStore: join(root, "runtime.sqlite"), classification: "MULTI_PROCESS_SINGLE_HOST" },
    viewports,
    routeMatrix,
    routes: [],
    journeys: {},
    mutations: [],
    runtimeEvidence: {},
    summary: { routes: 0, passed: 0, failed: 0, screenshots: 0, accessibilityChecks: 0, accessibilityFailures: 0, horizontalOverflowFailures: 0, pageErrors: 0, consoleErrors: 0 },
    sensitiveDataReview: { forbiddenPatterns: ["Bearer ", "Vault token", "aees-f-browser-secret-never-expose", "private key"], matches: 0, status: "NOT_RUN" },
    caveats: ["Browser topology proves independent processes and shared state on one host; multi-host browser topology is not claimed."],
  };
  try {
    const controlPlaneRuntimeRoot = join(root, "control-plane", "runtime-root");
    const controlPlaneStateRoot = join(controlPlaneRuntimeRoot, ".acs", "state");
    const controlPlaneConfigRoot = join(controlPlaneRuntimeRoot, ".acs", "config");
    const controlPlaneArtifactsRoot = join(controlPlaneRuntimeRoot, ".acs", "artifacts");
    const controlPlaneWorkspaceRoot = join(controlPlaneRuntimeRoot, ".acs", "workspace");
    await Promise.all([controlPlaneStateRoot, controlPlaneConfigRoot, controlPlaneArtifactsRoot, controlPlaneWorkspaceRoot]
      .map((path) => mkdir(path, { recursive: true })));
    await writeFile(join(controlPlaneConfigRoot, "openclaw.json"), "{}\n", "utf8");
    const controlPlane = await startJsonProcess(join(distRoot, "workers", "runtime-control-plane-entrypoint.js"), {
      ACS_ROOT: repoRoot,
      ACS_HTTP_HOST: "127.0.0.1",
      ACS_HTTP_PORT: String(backendPort),
      ACS_ALLOWED_ORIGINS: `${origins.controlPlane},${origins.tenantAdmin}`,
      ACS_DISPATCH_MODE: "remote",
      ACS_RUNTIME_DATABASE_PATH: join(root, "runtime.sqlite"),
      ACS_RUNTIME_RECOVERY_SCAN_INTERVAL_MS: "500",
      ACS_WORKER_LEASE_TTL_MS: "30000",
      ACS_WORKER_STALE_AFTER_MS: "60000",
      ACS_WORKER_IDENTITY_MODE: "signed_jwt",
      ACS_WORKER_TOKEN_ISSUER: issuer,
      ACS_WORKER_TOKEN_AUDIENCE: audience,
      ACS_WORKER_TOKEN_SIGNING_KEY: signingKey,
      ACS_RATE_LIMIT_PRINCIPAL_PER_WINDOW: "10000",
      ACS_RATE_LIMIT_ADMIN_MUTATION_PER_WINDOW: "10000",
      ACS_RATE_LIMIT_EXECUTION_START_PER_WINDOW: "10000",
      ACS_RATE_LIMIT_SYSTEM_ADMIN_PER_WINDOW: "10000",
      ACS_RATE_LIMIT_RUNTIME_WORKER_PER_WINDOW: "10000",
      ACS_RUNTIME_ROOT: controlPlaneRuntimeRoot,
      ACS_STATE_ROOT: controlPlaneStateRoot,
      ACS_CONFIG_ROOT: controlPlaneConfigRoot,
      ACS_ARTIFACTS_ROOT: controlPlaneArtifactsRoot,
      ACS_WORKSPACE_ROOT: controlPlaneWorkspaceRoot,
      ACS_SECRET_CATALOG_PATH: join(root, "secret-catalog.sqlite"),
      ACS_ECONOMIC_DATABASE_PATH: join(root, "economic.sqlite"),
      ACS_RATE_LIMIT_DATABASE_PATH: join(root, "rate-limit.sqlite"),
    }, "acs-runtime-control-plane");
    runtime.processes.push(controlPlane);
    manifest.topology.processes.push({ role: "control-plane", pid: controlPlane.ready.processId });
    runtime.processEvidence = manifest.topology.processes;

    const controlPlaneBuild = join(root, "control-plane-ui");
    const tenantAdminBuild = join(root, "tenant-admin-ui");
    await buildSpa(appRoot, controlPlaneBuild, {
      VITE_ACS_API_BASE_URL: origins.controlPlane + "/api/v1",
      VITE_ACS_TENANT_ADMIN_URL: origins.tenantAdmin + "/admin/tenants",
      VITE_ACS_TENANT_ID: "tenant-dev",
      VITE_ACS_ENVIRONMENT: "aees-f-acceptance",
    });
    await buildSpa(staticRoot, tenantAdminBuild, {
      VITE_ACS_API_BASE_URL: origins.tenantAdmin,
      VITE_ACS_CONTROL_PLANE_URL: origins.controlPlane + "/agents",
    });
    controlPlaneServer = await startSpaServer(controlPlaneBuild, controlPlanePort, backendUrl);
    tenantAdminServer = await startSpaServer(tenantAdminBuild, tenantAdminPort, backendUrl);

    log("probing backend", { backendUrl });
    const backendProbe = await api(backendUrl, "/api/v1/health");
    if (backendProbe.status !== 200) throw new Error(`Node backend probe failed: ${JSON.stringify(backendProbe.body)}`);
    log("probing browser gateway", { controlPlane: origins.controlPlane });
    const gatewayProbe = await rawHttpRequest(origins.controlPlane + "/api/v1/health");
    if (gatewayProbe.status !== 200) throw new Error(`Node gateway probe failed: HTTP ${gatewayProbe.status} ${gatewayProbe.data.toString("utf8")}`);

    browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage", "--no-sandbox"] });
    manifest.topology.browser = { name: "chromium", version: browser.version() };

    const journeyEvidence = await runJourneys(browser, origins, backendUrl, runtime);
    manifest.journeys = journeyEvidence.journeys;
    manifest.mutations = journeyEvidence.mutations;
    manifest.runtimeEvidence = journeyEvidence.runtimeEvidence;

    for (const viewport of viewports) {
      for (const route of routeMatrix) {
        const record = await inspectRoute(browser, route, viewport, origins);
        manifest.routes.push(record);
        manifest.summary.routes += 1;
        manifest.summary.screenshots += 1;
        manifest.summary.accessibilityChecks += 1;
        if (record.status === "PASS") manifest.summary.passed += 1; else manifest.summary.failed += 1;
        if (record.accessibility.status !== "PASS") manifest.summary.accessibilityFailures += 1;
        if (record.horizontalOverflow) manifest.summary.horizontalOverflowFailures += 1;
        manifest.summary.pageErrors += record.pageErrors.length;
        manifest.summary.consoleErrors += record.consoleErrors.length;
        log(`${route.app} ${route.path} ${viewport.width}x${viewport.height}`, { status: record.status });
      }
    }

    const serialized = JSON.stringify({ routes: manifest.routes, journeys: manifest.journeys, mutations: manifest.mutations });
    manifest.sensitiveDataReview.matches = manifest.sensitiveDataReview.forbiddenPatterns.filter((pattern) => serialized.includes(pattern)).length;
    manifest.sensitiveDataReview.status = manifest.sensitiveDataReview.matches === 0 ? "PASS" : "FAIL";
    const journeyPass = ["A", "B", "C", "D", "E", "F", "G", "keyboard"].every((id) => manifest.journeys[id]?.status === "PASS");
    manifest.status = manifest.summary.failed === 0 && journeyPass && manifest.sensitiveDataReview.status === "PASS" ? "PASS" : "FAIL";
  } catch (error) {
    manifest.status = "BLOCKED";
    manifest.failure = { message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined };
    manifest.processDiagnostics = runtime.processes.map((processRuntime) => ({
      pid: processRuntime.child.pid,
      exitCode: processRuntime.child.exitCode,
      signalCode: processRuntime.child.signalCode,
      stdout: processRuntime.stdout().slice(-4_000),
      stderr: processRuntime.stderr().slice(-4_000),
    }));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (controlPlaneServer) await new Promise((resolveClose) => controlPlaneServer.close(resolveClose));
    if (tenantAdminServer) await new Promise((resolveClose) => tenantAdminServer.close(resolveClose));
    for (const processRuntime of [...runtime.processes].reverse()) await stopProcess(processRuntime).catch(() => {});
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await rm(root, { recursive: true, force: true }).catch(() => {});
  }
  log("result", { status: manifest.status, manifest: manifestPath });
  process.exitCode = manifest.status === "PASS" ? 0 : manifest.status === "FAIL" ? 1 : 2;
}

await main();
