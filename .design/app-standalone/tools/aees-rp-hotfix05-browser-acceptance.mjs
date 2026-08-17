import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const frontend = process.env.ACS_HOTFIX05_FRONTEND ?? "http://127.0.0.1:3000/";
const apiEndpoint = process.env.ACS_HOTFIX05_DASHBOARD_API ?? "http://127.0.0.1:8788/api/v1/dashboard";
const evidenceRoot = process.env.ACS_HOTFIX05_EVIDENCE_ROOT ?? "/tmp/acs-aees-rp-hotfix05-evidence";
const screenshotRoot = path.join(evidenceRoot, "screenshots");
const manifestPath = path.join(evidenceRoot, "manifest.json");
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "compact-desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];
const regressionRoutes = [
  "/agents",
  "/executions",
  "/workers",
  "/composition",
  "/operations",
  "/administration",
  "/readiness",
  "/engines",
];

await mkdir(screenshotRoot, { recursive: true });

function sanitize(value) {
  return String(value)
    .replaceAll(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]")
    .replaceAll(/([?&](?:token|secret|password|key)=)[^&\s]+/gi, "$1[REDACTED]");
}

function slug(value) {
  return value.replaceAll(/[^a-zA-Z0-9]+/g, "-").replaceAll(/^-+|-+$/g, "").toLowerCase() || "root";
}

async function accessibilityAudit(page) {
  return page.evaluate(() => {
    const failures = [];
    if (!document.querySelector("main")) failures.push("missing main landmark");
    if (!document.querySelector("h1")) failures.push("missing h1");
    if (!document.querySelector("nav[aria-label]")) failures.push("navigation missing accessible label");
    for (const image of document.querySelectorAll("img")) if (!image.hasAttribute("alt")) failures.push("image missing alt");
    for (const button of document.querySelectorAll("button")) {
      const name = button.getAttribute("aria-label") || button.textContent?.trim();
      if (!name) failures.push("button missing accessible name");
    }
    for (const link of document.querySelectorAll("a")) {
      const name = link.getAttribute("aria-label") || link.textContent?.trim();
      if (!name) failures.push("link missing accessible name");
    }
    const ids = [...document.querySelectorAll("[id]")].map(node => node.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length) failures.push(`duplicate ids: ${[...new Set(duplicates)].join(",")}`);
    return { failures, headingCount: document.querySelectorAll("h1,h2,h3").length, labelledNavigationCount: document.querySelectorAll("nav[aria-label]").length };
  });
}

function attachRuntimeCapture(page, runtime) {
  page.on("console", message => {
    if (message.type() === "error") runtime.consoleErrors.push(sanitize(message.text()));
  });
  page.on("pageerror", error => runtime.pageErrors.push(sanitize(error.message)));
  page.on("requestfailed", request => runtime.requestFailures.push({ url: sanitize(request.url()), error: request.failure()?.errorText ?? "unknown" }));
  page.on("response", response => {
    if (response.status() >= 400) runtime.apiErrors.push({ url: sanitize(response.url()), status: response.status() });
    if (new URL(response.url()).pathname === "/api/v1/dashboard") runtime.dashboardRequests.push({ url: response.url(), status: response.status() });
  });
}

async function selectTheme(page, theme) {
  const isDark = await page.locator(".app").evaluate(node => node.classList.contains("dark"));
  if ((theme === "dark") !== isDark) await page.getByRole("button", { name: "Toggle theme" }).click();
}

async function inspect(page, route, viewport, theme, screenshotName) {
  const runtime = { consoleErrors: [], pageErrors: [], requestFailures: [], apiErrors: [], dashboardRequests: [] };
  attachRuntimeCapture(page, runtime);
  const dashboardResponse = route === "/" || route === "/administration"
    ? page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/dashboard" && response.status() === 200, { timeout: 30_000 })
    : null;
  const response = await page.goto(new URL(route, frontend).toString(), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator("main h1").first().waitFor({ state: "visible", timeout: 15_000 });
  if (dashboardResponse) await dashboardResponse;
  if (route === "/") {
    await page.locator(".dashboard-health h2").waitFor({ state: "visible", timeout: 15_000 });
    await page.waitForFunction(() => document.querySelector(".dashboard-health h2")?.textContent?.trim() !== "UNAVAILABLE", undefined, { timeout: 30_000 });
    await page.waitForFunction(() => ![...document.querySelectorAll(".dashboard-kpi > strong")].some(node => node.textContent?.trim() === "--"), undefined, { timeout: 30_000 });
  }
  if (route === "/administration") await page.getByText("Physical multi-host, host failover and cross-host worker recovery are not certified.", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(150);
  await selectTheme(page, theme);
  await page.waitForTimeout(150);
  const accessibility = await accessibilityAudit(page);
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  const heading = (await page.locator("main h1").first().textContent())?.trim() ?? null;
  const screenshot = path.join(screenshotRoot, `${screenshotName}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  return {
    route,
    url: page.url(),
    viewport,
    theme,
    httpStatus: response?.status() ?? null,
    heading,
    horizontalOverflow,
    accessibility,
    screenshot: path.relative(evidenceRoot, screenshot),
    ...runtime,
  };
}

const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage", "--no-sandbox"] });
const manifest = {
  checkedAt: new Date().toISOString(),
  status: "FAIL",
  frontend,
  dashboardApi: apiEndpoint,
  viewports,
  baselineScreenshots: ["baseline/desktop-light.png", "baseline/desktop-dark.png", "baseline/mobile-light.png", "baseline/mobile-dark.png"],
  dashboardStates: [],
  administrationStates: [],
  regressionRoutes: [],
  navigation: {},
  semanticChecks: {},
  sensitiveScan: {},
  summary: {},
};

try {
  for (const viewport of viewports) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport, colorScheme: theme, hasTouch: viewport.width <= 768 });
      const page = await context.newPage();
      manifest.dashboardStates.push(await inspect(page, "/", viewport, theme, `dashboard-${viewport.name}-${theme}`));
      await context.close();
    }
  }

  for (const viewport of [viewports[0], viewports[3]]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport, colorScheme: theme, hasTouch: viewport.width <= 768 });
      const page = await context.newPage();
      manifest.administrationStates.push(await inspect(page, "/administration", viewport, theme, `administration-${viewport.name}-${theme}`));
      await context.close();
    }
  }

  for (const route of regressionRoutes) {
    const context = await browser.newContext({ viewport: viewports[1], colorScheme: "light" });
    const page = await context.newPage();
    manifest.regressionRoutes.push(await inspect(page, route, viewports[1], "light", `route-${slug(route)}-light`));
    await context.close();
  }

  const mobileContext = await browser.newContext({ viewport: viewports[3], colorScheme: "dark", hasTouch: true });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(frontend, { waitUntil: "domcontentloaded" });
  await mobilePage.locator("main h1").first().waitFor({ state: "visible", timeout: 15_000 });
  const menu = mobilePage.getByRole("button", { name: "Open navigation" });
  const menuBox = await menu.boundingBox();
  await menu.click();
  const bodyLocked = await mobilePage.evaluate(() => document.body.style.overflow === "hidden");
  const drawerOpen = await mobilePage.locator(".sidebar.open").isVisible();
  const drawerShot = path.join(screenshotRoot, "navigation-drawer-mobile-dark.png");
  await mobilePage.screenshot({ path: drawerShot, fullPage: true });
  const overlay = mobilePage.getByRole("button", { name: "Close navigation overlay" });
  const overlayBox = await overlay.boundingBox();
  if (!overlayBox) throw new Error("mobile drawer overlay has no bounding box");
  await mobilePage.mouse.click(overlayBox.x + overlayBox.width - 24, overlayBox.y + Math.min(96, overlayBox.height / 2));
  const overlayClose = !(await mobilePage.locator(".sidebar.open").isVisible());
  await menu.click();
  await mobilePage.keyboard.press("Escape");
  const escapeClose = !(await mobilePage.locator(".sidebar.open").isVisible());
  await menu.click();
  await mobilePage.locator('a.domain-link[href="/agents"]').click();
  await mobilePage.waitForURL(/\/agents$/);
  const routeChangeClose = !(await mobilePage.locator(".sidebar.open").isVisible());
  manifest.navigation = {
    drawerOpen,
    overlayClose,
    escapeClose,
    routeChangeClose,
    bodyLocked,
    menuTouchTarget: menuBox ? { width: menuBox.width, height: menuBox.height, pass: menuBox.width >= 44 && menuBox.height >= 44 } : null,
    screenshot: path.relative(evidenceRoot, drawerShot),
  };
  await mobileContext.close();

  const semanticContext = await browser.newContext({ viewport: viewports[0], colorScheme: "dark" });
  const semanticPage = await semanticContext.newPage();
  await semanticPage.goto(frontend, { waitUntil: "domcontentloaded" });
  await semanticPage.getByText("Core operational signals are healthy.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 }).catch(async () => {
    await semanticPage.getByText(/Operational signals need review|customer-impacting execution|Operational health is unavailable/, { exact: false }).waitFor({ state: "visible", timeout: 30_000 });
  });
  const rootText = await semanticPage.locator("main").innerText();
  await semanticPage.goto(new URL("/administration", frontend).toString(), { waitUntil: "domcontentloaded" });
  await semanticPage.getByText("Physical multi-host, host failover and cross-host worker recovery are not certified.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const administrationText = await semanticPage.locator("main").innerText();
  const apiResponse = await semanticPage.request.get(apiEndpoint);
  const apiBody = await apiResponse.json();
  manifest.semanticChecks = {
    rootIsCustomerFacing: rootText.includes("Operational overview") && rootText.includes("Execution Activity") && rootText.includes("Requires Attention"),
    rootTechnicalCompositionAbsent: !rootText.includes("Active composition") && !rootText.includes("Critical blockers"),
    administrationReadinessPresent: administrationText.includes("Active composition") && administrationText.includes("Critical blockers") && administrationText.includes("Certified platform capability"),
    developmentProfilePreserved: apiBody?.data?.activeProfile?.activeProfile === "development" && apiBody?.data?.criticalBlockers?.length === 0,
    globalCaveatPreserved: apiBody?.data?.globalCaveats?.some?.(finding => finding.code === "GLOBAL_MULTI_HOST_NOT_CERTIFIED") === true && administrationText.includes("Physical multi-host"),
    activeDevelopmentCompositionTruthful: apiBody?.data?.activeComposition?.identity === "development" && apiBody?.data?.activeComposition?.secrets === "memory",
  };
  await semanticContext.close();

  const records = [...manifest.dashboardStates, ...manifest.administrationStates, ...manifest.regressionRoutes];
  const evidenceText = JSON.stringify({ records, semanticChecks: manifest.semanticChecks, navigation: manifest.navigation });
  const sensitivePatterns = {
    bearerTokens: /Bearer\s+[A-Za-z0-9._~+\/-]{12,}/gi,
    privateKeys: /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/g,
    credentials: /(?:password|client_secret|vault_token)\s*[:=]\s*["']?[^\s"']+/gi,
    secretPlaintext: /secretValue\s*[:=]/gi,
  };
  manifest.sensitiveScan = Object.fromEntries(Object.entries(sensitivePatterns).map(([name, pattern]) => [name, evidenceText.match(pattern)?.length ?? 0]));

  const accessibilityFailures = records.flatMap(record => record.accessibility.failures.map(failure => ({ route: record.route, viewport: record.viewport, theme: record.theme, failure })));
  const overflowFailures = records.filter(record => record.horizontalOverflow);
  const pageErrors = records.flatMap(record => record.pageErrors);
  const consoleErrors = records.flatMap(record => record.consoleErrors);
  const apiErrors = records.flatMap(record => record.apiErrors);
  const requestFailures = records.flatMap(record => record.requestFailures).filter(failure => !failure.url.includes("fonts.googleapis.com") && !failure.url.includes("fonts.gstatic.com"));
  const dashboardApiObserved = manifest.dashboardStates.some(record => record.dashboardRequests.some(request => request.status === 200));
  const semanticPass = Object.values(manifest.semanticChecks).every(Boolean);
  const navigationPass = manifest.navigation.drawerOpen && manifest.navigation.overlayClose && manifest.navigation.escapeClose && manifest.navigation.routeChangeClose && manifest.navigation.bodyLocked && manifest.navigation.menuTouchTarget?.pass;
  const sensitivePass = Object.values(manifest.sensitiveScan).every(count => count === 0);
  manifest.summary = {
    screenshotCount: records.length + 1,
    accessibilityFailures,
    horizontalOverflowFailures: overflowFailures.length,
    pageErrors,
    consoleErrors,
    apiErrors,
    requestFailures,
    dashboardApiObserved,
    semanticPass,
    navigationPass,
    sensitivePass,
  };
  manifest.status = accessibilityFailures.length === 0 && overflowFailures.length === 0 && pageErrors.length === 0 && consoleErrors.length === 0 && apiErrors.length === 0 && requestFailures.length === 0 && dashboardApiObserved && semanticPass && navigationPass && sensitivePass ? "PASS" : "FAIL";
} finally {
  await browser.close();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

process.stdout.write(`${JSON.stringify({ status: manifest.status, manifestPath, summary: manifest.summary }, null, 2)}\n`);
process.exitCode = manifest.status === "PASS" ? 0 : 1;
