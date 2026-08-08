import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const distIndex = resolve(import.meta.dirname, "../dist/index.html");

test("build artifact is a static Vite SPA", () => {
  assert.ok(
    existsSync(distIndex),
    "dist/index.html is missing - run `pnpm build` first",
  );
  const html = readFileSync(distIndex, "utf8");
  assert.match(html, /id="root"/);
  assert.match(html, /src="\/assets\//);
});
