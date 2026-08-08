#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = process.cwd();
const manifestPath = join(repoRoot, "engines", "agentsai.manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const sourcePath = resolve(repoRoot, manifest.source.path);

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

const stage = git(repoRoot, "ls-files", "--stage", "--", manifest.source.path);
if (!stage.startsWith("160000 ")) {
  throw new Error(`${manifest.source.path} is not tracked as a Gitlink`);
}

const revision = git(sourcePath, "rev-parse", "HEAD");
if (revision !== manifest.source.revision) {
  throw new Error(`engine revision mismatch: manifest=${manifest.source.revision} actual=${revision}`);
}

const dirty = git(sourcePath, "status", "--porcelain", "--untracked-files=all");
if (dirty) {
  throw new Error(`engine source checkout is dirty:\n${dirty}`);
}

const prohibited = [
  ".env",
  "openclaw.json",
  ".acs",
  "runtime.db",
  "runtime.sqlite",
  "logs",
  "credentials",
  "workspace",
];
const present = prohibited.filter((name) => existsSync(join(sourcePath, name)));
if (present.length > 0) {
  throw new Error(`prohibited runtime content exists in engine checkout: ${present.join(", ")}`);
}

process.stdout.write(`${JSON.stringify({
  gitlink: true,
  path: manifest.source.path,
  repository: manifest.source.repository,
  revision,
  protocol: manifest.protocol,
  source_only: manifest.runtime_policy.source_only,
}, null, 2)}\n`);
