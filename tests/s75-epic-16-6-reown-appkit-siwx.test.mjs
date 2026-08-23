import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("canonical standalone declares one compatible Reown AppKit and wagmi dependency matrix", async () => {
  const packageJson = JSON.parse(await source(".design/app-standalone/package.json"));
  assert.equal(packageJson.dependencies["@reown/appkit"], "^1.8.23");
  assert.equal(packageJson.dependencies["@reown/appkit-adapter-wagmi"], "^1.8.23");
  assert.equal(packageJson.dependencies["@reown/appkit-siwx"], "^1.8.23");
  assert.equal(packageJson.dependencies.wagmi, "2.19.5");
  assert.equal(packageJson.dependencies["@wagmi/core"], "2.22.1");
  assert.equal(packageJson.dependencies["@wagmi/connectors"], "6.2.0");
});

test("AppKit uses required SIWX with a Product API nonce and server exchange", async () => {
  const appkit = await source(".design/app-standalone/src/auth/reown-appkit-runtime.tsx");
  assert.match(appkit, /new DefaultSIWX/);
  assert.match(appkit, /new InformalMessenger/);
  assert.match(appkit, /required:\s*true/);
  assert.match(appkit, /productApi\.createSiwxNonce\(\)/);
  assert.match(appkit, /productApi\.exchangeSiwxArtifact\(\{\s*message:\s*session\.message,\s*signature:\s*session\.signature/s);
});

test("browser wallet state is not treated as ACS authority", async () => {
  const control = await source(".design/app-standalone/src/auth/ConfiguredAccountControl.tsx");
  const api = await source(".design/app-standalone/src/api/product-api.ts");
  assert.match(control, /wallet\.isConnected\s*\?\s*"WALLET ONLY"/);
  assert.match(api, /exchangeSiwxArtifact\(artifact:\s*\{\s*readonly message: string;\s*readonly signature: string\s*\}\)/s);
  assert.doesNotMatch(api, /exchangeSiwxArtifact[^]*trusted:/);
  assert.doesNotMatch(api, /window\.__ACS_AUTH__/);
});

test("unconfigured AppKit does not eagerly load wallet runtime dependencies", async () => {
  const boundary = await source(".design/app-standalone/src/auth/reown-appkit.tsx");
  const control = await source(".design/app-standalone/src/auth/AccountControl.tsx");
  assert.match(boundary, /lazy\(async \(\) =>/);
  assert.match(boundary, /import\("\.\/reown-appkit-runtime"\)/);
  assert.doesNotMatch(boundary, /from "@reown\//);
  assert.match(control, /import\("\.\/ConfiguredAccountControl"\)/);
  assert.doesNotMatch(control, /from "@reown\//);
});

test("ACS application session is typed, short-lived locally, and isolated from Reown storage", async () => {
  const store = await source(".design/app-standalone/src/auth/acs-session-store.ts");
  assert.match(store, /interface StoredAcsSession/);
  assert.match(store, /window\.sessionStorage/);
  assert.match(store, /expiresAt <= Date\.now\(\)/);
  assert.doesNotMatch(store, /window\.localStorage/);
});

test("account UI keeps wallet, ACS session, membership and suspension states distinct", async () => {
  const context = await source(".design/app-standalone/src/auth/acs-account-context-value.ts");
  const control = await source(".design/app-standalone/src/auth/ConfiguredAccountControl.tsx");
  for (const state of ["DISCONNECTED", "AUTHENTICATING", "AUTHENTICATED", "NO_TENANT_MEMBERSHIP", "SUSPENDED", "UNAVAILABLE"]) {
    assert.match(context, new RegExp(`\\"${state}\\"`));
  }
  assert.match(control, /NO_TENANT_MEMBERSHIP/);
  assert.match(control, /WALLET ONLY/);
});

test("production AppKit remains explicitly unsupported until production acceptance", async () => {
  const config = await source(".design/app-standalone/src/auth/reown-appkit-config.ts");
  const template = await source(".design/app-standalone/.env.production.example");
  assert.match(config, /environment === "production"/);
  assert.match(config, /status: "UNSUPPORTED", reasonCode: "PRODUCTION_NOT_ELIGIBLE"/);
  assert.match(template, /VITE_REOWN_ENABLED=false/);
});

test("browser templates expose only the public Reown project identifier", async () => {
  const templates = await Promise.all([
    source(".design/app-standalone/.env.example"),
    source(".design/app-standalone/.env.local.example"),
    source(".design/app-standalone/.env.development.example"),
    source(".design/app-standalone/.env.production.example"),
  ]);
  const combined = templates.join("\n");
  assert.match(combined, /VITE_REOWN_PROJECT_ID=/);
  assert.doesNotMatch(combined, /VITE_(?:REOWN|ACS)_(?:SECRET|TOKEN|PRIVATE_KEY|PASSWORD)=/);
});

test("canonical UI composes account providers and renders the bounded header control", async () => {
  const main = await source(".design/app-standalone/src/main.tsx");
  const app = await source(".design/app-standalone/src/App.tsx");
  assert.match(main, /<ReownAppKitProvider>/);
  assert.match(main, /<AcsAccountProvider>/);
  assert.match(app, /<AccountControl dark=\{dark\} \/>/);
});

test("final browser matrix contains every required viewport and theme pair", async () => {
  const milestone = await source("docs/epics/epic-16/milestones/AEES-16-06.md");
  for (const pair of ["desktop/light", "desktop/dark", "tablet/light", "tablet/dark", "mobile/light", "mobile/dark"]) {
    assert.match(milestone, new RegExp(pair.replace("/", "\\/")));
  }
});
