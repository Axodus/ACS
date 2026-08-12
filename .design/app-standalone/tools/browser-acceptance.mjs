import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const APP_ROOT = resolve(import.meta.dirname, "..");
const DIST_ROOT = join(APP_ROOT, "dist");
const EVIDENCE_ROOT = join(APP_ROOT, "tmp", "epic-12", "browser-evidence");
const PROFILE_ROOT = join(APP_ROOT, "tmp", "epic-12", "profiles");
const REPORT_PATH = join(EVIDENCE_ROOT, "manifest.json");

const ROUTES = [
  "/",
  "/readiness",
  "/system",
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

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

const RESPONSIVE_ROUTES = ["/", "/readiness", "/system", "/agents"];

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

const browserCandidates = [
  process.env.ACS_BROWSER_PATH,
  "/home/mzfshark/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
  "/home/mzfshark/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/opt/google/chrome/chrome",
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
].filter(Boolean);

function nowIso() {
  return new Date().toISOString();
}

function findBrowser() {
  return browserCandidates.find(candidate => existsSync(candidate)) ?? null;
}

function routeSlug(route) {
  return route === "/" ? "dashboard" : route.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function runBrowser(browserPath, args, timeoutMs = 30000) {
  return new Promise(resolveResult => {
    const child = spawn(browserPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", chunk => {
      stdout += chunk;
    });
    child.stderr.on("data", chunk => {
      stderr += chunk;
    });
    child.on("error", error => {
      clearTimeout(timer);
      resolveResult({ ok: false, stdout, stderr: error.message, code: null, timedOut });
    });
    child.on("close", code => {
      clearTimeout(timer);
      resolveResult({ ok: code === 0, stdout, stderr, code, timedOut });
    });
  });
}

async function probeBrowser(browserPath) {
  const profile = join(PROFILE_ROOT, "probe");
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const commonArgs = [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profile}`,
  ];
  const first = await runBrowser(browserPath, [
    ...commonArgs,
    "--dump-dom",
    "data:text/html,<title>probe</title><h1>probe</h1>",
  ]);
  if (first.ok && first.stdout.includes("<h1>probe</h1>")) {
    return { ok: true, version: first.stdout, stderr: first.stderr };
  }
  const fallback = await runBrowser(browserPath, [
    ...commonArgs.map(arg => arg === "--headless=new" ? "--headless" : arg),
    "--dump-dom",
    "data:text/html,<title>probe</title><h1>probe</h1>",
  ]);
  if (fallback.ok && fallback.stdout.includes("<h1>probe</h1>")) {
    return { ok: true, version: fallback.stdout, stderr: fallback.stderr };
  }
  return {
    ok: false,
    version: "",
    stderr: `${first.stderr}\n${fallback.stderr}`.trim(),
  };
}

function startStaticServer() {
  return new Promise((resolveServer, rejectServer) => {
    const server = createServer((request, response) => {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname.includes("..")) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const requested = pathname === "/" ? "/index.html" : pathname;
      const filePath = join(DIST_ROOT, requested);
      const extension = extname(filePath);
      const isAsset = Boolean(extension);
      if (isAsset && existsSync(filePath)) {
        response.writeHead(200, {
          "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
          "Cache-Control": "no-store",
        });
        response.end(readFileSync(filePath));
        return;
      }
      if (isAsset) {
        response.writeHead(404).end("Not found");
        return;
      }
      const indexPath = join(DIST_ROOT, "index.html");
      if (!existsSync(indexPath)) {
        response.writeHead(500).end("dist/index.html is missing");
        return;
      }
      response.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
      response.end(readFileSync(indexPath));
    });
    server.on("error", rejectServer);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        rejectServer(new Error("Static server did not bind a TCP port"));
        return;
      }
      resolveServer({
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise(done => server.close(done)),
      });
    });
  });
}

function headingFromHtml(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return null;
  return match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function accessibilityChecks(html) {
  const checks = [
    { name: "document-language", passed: /<html[^>]*\blang=/i.test(html), note: "html lang attribute present" },
    { name: "main-landmark", passed: /<main\b|role=["']main["']/i.test(html), note: "main landmark present" },
    { name: "h1-heading", passed: /<h1\b/i.test(html), note: "h1 heading present" },
    { name: "navigation", passed: /<nav\b|role=["']navigation["']/i.test(html), note: "navigation landmark present" },
  ];
  const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const unnamedLinks = links.filter(([, attrs, content]) => {
    const text = content.replace(/<[^>]+>/g, "").trim();
    return !text && !/aria-label=/i.test(attrs) && !/title=/i.test(attrs);
  });
  checks.push({
    name: "link-accessible-names",
    passed: unnamedLinks.length === 0,
    note: `${unnamedLinks.length} unnamed links`,
  });
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
  const unnamedButtons = buttons.filter(([, attrs, content]) => {
    const text = content.replace(/<[^>]+>/g, "").trim();
    return !text && !/aria-label=/i.test(attrs) && !/title=/i.test(attrs);
  });
  checks.push({
    name: "button-accessible-names",
    passed: unnamedButtons.length === 0,
    note: `${unnamedButtons.length} unnamed buttons`,
  });
  return checks;
}

async function captureRoute(browserPath, baseUrl, route, profileName) {
  const profile = join(PROFILE_ROOT, profileName);
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const url = `${baseUrl}${route}`;
  const result = await runBrowser(browserPath, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profile}`,
    "--virtual-time-budget=5000",
    "--dump-dom",
    url,
  ]);
  if (!result.ok) {
    return {
      route,
      loaded: false,
      status: "blocked",
      reason: "browser exited before DOM capture",
      detail: result.stderr.slice(0, 500),
      heading: null,
    };
  }
  const rootPresent = result.stdout.includes('id="root"');
  const crashMarker = /Uncaught|ReferenceError|TypeError|Application error/i.test(result.stdout);
  const heading = headingFromHtml(result.stdout);
  const loaded = rootPresent && !crashMarker && heading !== null;
  const domPath = join(EVIDENCE_ROOT, "dom", `${routeSlug(route)}.html`);
  mkdirSync(join(EVIDENCE_ROOT, "dom"), { recursive: true });
  writeFileSync(domPath, result.stdout);
  return {
    route,
    loaded,
    status: loaded ? "pass" : "failed",
    reason: loaded ? null : "root, heading, or page script did not settle",
    heading,
    domEvidence: relativeEvidencePath(domPath),
  };
}

async function captureScreenshot(browserPath, baseUrl, route, viewport, profileName) {
  const profile = join(PROFILE_ROOT, profileName);
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const screenshotsDir = join(EVIDENCE_ROOT, "screenshots");
  mkdirSync(screenshotsDir, { recursive: true });
  const filePath = join(screenshotsDir, `${routeSlug(route)}-${viewport.name}-${viewport.width}x${viewport.height}.png`);
  const url = `${baseUrl}${route}`;
  const result = await runBrowser(browserPath, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profile}`,
    "--virtual-time-budget=5000",
    "--hide-scrollbars",
    `--window-size=${viewport.width},${viewport.height}`,
    `--screenshot=${filePath}`,
    url,
  ]);
  return {
    route,
    viewport: `${viewport.width}x${viewport.height}`,
    captured: result.ok && existsSync(filePath),
    path: result.ok && existsSync(filePath) ? relativeEvidencePath(filePath) : null,
    detail: result.ok ? null : result.stderr.slice(0, 300),
  };
}

function relativeEvidencePath(filePath) {
  return filePath.slice(APP_ROOT.length + 1).replaceAll("\\", "/");
}

function writeBlockedReport(detail, browserPath) {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const report = {
    checkedAt: nowIso(),
    tool: "node:headless-chrome-cli",
    browserAvailable: false,
    browserPath,
    productionReady: false,
    claim: "not_claimed",
    wcagCertification: "not_claimed",
    status: "BLOCKED_BY_ENVIRONMENT",
    summary: {
      routesTested: 0,
      routesPassed: 0,
      routesWithCaveats: 0,
      routesFailed: 0,
      viewportsTested: 0,
      accessibilityChecks: 0,
      browserProbe: "failed",
    },
    blocker: {
      code: "BROWSER_UNAVAILABLE",
      message: "No runnable headless browser could start in this environment.",
      detail,
    },
    routes: [],
    viewports: [],
    accessibility: {
      status: "BLOCKED",
      wcagCertification: "not_claimed",
      checks: [],
    },
    visualEvidence: [],
    consoleErrors: [],
    caveats: [
      "Browser smoke, visual evidence, responsive QA, and accessibility baseline could not be executed because no runnable browser was available.",
      "Static checks and documentation are not browser acceptance evidence.",
    ],
    unresolvedIssues: [
      {
        code: "BROWSER_ENVIRONMENT_BLOCKER",
        message: "Run the harness in an environment with a runnable Chromium, Chrome, Firefox, or Playwright browser before declaring S04 browser evidence.",
      },
    ],
    sourceEvidence: [relativeEvidencePath(REPORT_PATH)],
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function runAcceptance() {
  if (!existsSync(join(DIST_ROOT, "index.html"))) {
    throw new Error(`Missing ${relativeEvidencePath(join(DIST_ROOT, "index.html"))}; run the app build first.`);
  }
  const browserPath = findBrowser();
  if (!browserPath) {
    const report = writeBlockedReport("No browser binary was found in common locations or ACS_BROWSER_PATH.", null);
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  const probe = await probeBrowser(browserPath);
  if (!probe.ok) {
    const report = writeBlockedReport(probe.stderr || "Headless browser probe failed without stderr.", browserPath);
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const server = await startStaticServer();
  const routes = [];
  const screenshots = [];
  let criticalFailures = 0;

  try {
    for (const route of ROUTES) {
      const routeResult = await captureRoute(browserPath, server.baseUrl, route, `route-${routeSlug(route)}`);
      routes.push(routeResult);
      if (!routeResult.loaded) criticalFailures += 1;
      const screenshot = await captureScreenshot(browserPath, server.baseUrl, route, VIEWPORTS[0], `shot-${routeSlug(route)}`);
      screenshots.push(screenshot);
    }
    for (const route of RESPONSIVE_ROUTES) {
      for (const viewport of VIEWPORTS.slice(1)) {
        const screenshot = await captureScreenshot(browserPath, server.baseUrl, route, viewport, `shot-${routeSlug(route)}-${viewport.name}`);
        screenshots.push(screenshot);
      }
    }
  } finally {
    await server.close();
    rmSync(PROFILE_ROOT, { recursive: true, force: true });
  }

  const accessibilityChecksForRoutes = routes.map(route => ({
    route: route.route,
    loaded: route.loaded,
    checks: route.loaded && route.domEvidence
      ? accessibilityChecks(readFileSync(join(APP_ROOT, route.domEvidence), "utf8"))
      : [],
  }));
  const allChecks = accessibilityChecksForRoutes.flatMap(item => item.checks.map(check => ({ ...check, route: item.route })));
  const accessibility = {
    status: allChecks.length && allChecks.every(check => check.passed) ? "STATIC_DOM_ONLY" : "FAIL",
    wcagCertification: "not_claimed",
    checks: allChecks,
    caveats: [
      "Static DOM checks only; keyboard, focus, contrast, axe-core, and full WCAG checks are not claimed.",
      "Console error inspection is not available through the headless CLI mode used by this harness.",
    ],
  };

  const viewportResults = VIEWPORTS.map(viewport => ({
    viewport: `${viewport.width}x${viewport.height}`,
    routesTested: RESPONSIVE_ROUTES.length,
    screenshotsCaptured: screenshots.filter(shot => shot.viewport === `${viewport.width}x${viewport.height}` && shot.captured).length,
  }));
  const report = {
    checkedAt: nowIso(),
    tool: "node:headless-chrome-cli",
    browserAvailable: true,
    browserPath,
    productionReady: false,
    claim: "not_claimed",
    wcagCertification: "not_claimed",
    status: criticalFailures === 0 ? "PASS_WITH_CAVEATS" : "FAIL",
    summary: {
      routesTested: routes.length,
      routesPassed: routes.filter(route => route.status === "pass").length,
      routesWithCaveats: routes.filter(route => route.status === "caveat").length,
      routesFailed: routes.filter(route => route.status === "failed").length,
      viewportsTested: VIEWPORTS.length,
      accessibilityChecks: allChecks.length,
      browserProbe: "passed",
    },
    routes,
    viewports: viewportResults,
    accessibility,
    visualEvidence: screenshots.filter(shot => shot.captured),
    consoleErrors: [],
    caveats: [
      "Headless CLI mode captures rendered DOM and screenshots, but not full click-through, page console, layout overflow measurement, axe-core, keyboard, or focus checks.",
      "Screenshots are local evidence under tmp/epic-12/browser-evidence/ and are not committed.",
    ],
    unresolvedIssues: [],
    sourceEvidence: [relativeEvidencePath(REPORT_PATH)],
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(criticalFailures === 0 ? 0 : 1);
}

runAcceptance().catch(error => {
  const report = writeBlockedReport(error instanceof Error ? error.message : String(error), findBrowser());
  console.log(JSON.stringify(report, null, 2));
  process.exit(2);
});
