import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const baseUrl = process.env.ACS_BROWSER_BASE_URL ?? "http://127.0.0.1:3000";
const evidenceRoot = process.env.ACS_BROWSER_EVIDENCE_ROOT
  ?? path.join(os.tmpdir(), "acs-s75-account-browser-evidence");
const routes = ["/", "/economics", "/operations/overview"];
const matrix = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
].flatMap((viewport) => ["light", "dark"].map((theme) => ({ ...viewport, theme })));

await mkdir(path.join(evidenceRoot, "screenshots"), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-sandbox"],
});
const records = [];

try {
  for (const entry of matrix) {
    const context = await browser.newContext({
      viewport: { width: entry.width, height: entry.height },
      colorScheme: entry.theme,
      hasTouch: entry.width <= 768,
    });
    try {
      for (const route of routes) {
        const page = await context.newPage();
        const consoleErrors = [];
        const pageErrors = [];
        const requestFailures = [];
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.on("pageerror", (error) => pageErrors.push(error.message));
        page.on("requestfailed", (request) => {
          requestFailures.push({ url: request.url(), error: request.failure()?.errorText ?? "unknown" });
        });

        const url = new URL(route, baseUrl).toString();
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.locator(".domain-header h1, main h1, h1").first().waitFor({ state: "visible", timeout: 20_000 });

        const expectedThemeClass = entry.theme;
        const app = page.locator(".app");
        if (!(await app.evaluate((element, theme) => element.classList.contains(String(theme)), expectedThemeClass))) {
          await page.getByRole("button", { name: "Toggle theme" }).click();
        }

        const account = page.locator("button.account-control");
        await account.waitFor({ state: "visible", timeout: 10_000 });
        const accountText = (await account.innerText()).trim();
        const accountDisabled = await account.isDisabled();
        const accountReason = await account.getAttribute("title");
        const themeApplied = await app.evaluate((element, theme) => element.classList.contains(String(theme)), expectedThemeClass);
        const horizontalOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        const keyboardTargets = await page.locator("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])").count();
        const screenshot = path.join(
          evidenceRoot,
          "screenshots",
          `${entry.name}-${entry.theme}-${route === "/" ? "root" : route.slice(1).replaceAll("/", "-")}.png`,
        );
        await page.screenshot({ path: screenshot, fullPage: true });

        const passed = response?.ok() === true
          && themeApplied
          && !horizontalOverflow
          && accountDisabled
          && accountText.includes("NOT_CONFIGURED")
          && keyboardTargets > 0
          && consoleErrors.length === 0
          && pageErrors.length === 0
          && requestFailures.length === 0;
        records.push({
          route,
          viewport: entry.name,
          theme: entry.theme,
          httpStatus: response?.status() ?? null,
          themeApplied,
          horizontalOverflow,
          accountText,
          accountDisabled,
          accountReason,
          keyboardTargets,
          consoleErrors,
          pageErrors,
          requestFailures,
          screenshot,
          status: passed ? "PASS" : "FAIL",
        });
        await page.close();
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const manifest = {
  checkedAt: new Date().toISOString(),
  baseUrl,
  stateUnderTest: "NOT_CONFIGURED",
  matrix: matrix.map(({ name, theme, width, height }) => ({ name, theme, width, height })),
  routes,
  summary: {
    checks: records.length,
    passed: records.filter((record) => record.status === "PASS").length,
    failed: records.filter((record) => record.status === "FAIL").length,
    horizontalOverflowFailures: records.filter((record) => record.horizontalOverflow).length,
    consoleErrors: records.reduce((total, record) => total + record.consoleErrors.length, 0),
    pageErrors: records.reduce((total, record) => total + record.pageErrors.length, 0),
    requestFailures: records.reduce((total, record) => total + record.requestFailures.length, 0),
  },
  records,
};
manifest.status = manifest.summary.failed === 0 ? "PASS" : "FAIL";

await writeFile(path.join(evidenceRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`[S75 browser] ${manifest.status} — ${manifest.summary.passed}/${manifest.summary.checks} checks\n`);
process.exitCode = manifest.status === "PASS" ? 0 : 1;
