#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Pool } from "pg";

const execFileAsync = promisify(execFile);
const containerName = process.env.ACS_PG_ACCEPTANCE_CONTAINER ?? "acs-postgres-acceptance";
const image = process.env.ACS_PG_ACCEPTANCE_IMAGE ?? "postgres:17.6-alpine";
const host = process.env.ACS_PG_ACCEPTANCE_HOST ?? "127.0.0.1";
let port = Number(process.env.ACS_PG_ACCEPTANCE_PORT ?? "0");
const database = process.env.ACS_PG_ACCEPTANCE_DATABASE ?? "acs_acceptance";
const user = process.env.ACS_PG_ACCEPTANCE_USER ?? "postgres";
const password = process.env.ACS_PG_ACCEPTANCE_PASSWORD ?? `acs_${process.pid}_${Date.now()}`;
let connectionString = "";
const pgTestFiles = [
  "tests/acs-v2-imp-01b.test.mjs",
  "tests/acs-v2-imp-03d-postgres.test.mjs",
  "tests/acs-v2-imp-03e-gate-a-postgres.test.mjs",
  "tests/acs-v2-imp-03e2-postgres.test.mjs",
  "tests/acs-v2-imp-03f-fix-02-postgres.test.mjs",
  "tests/acs-v2-val-01-postgres.test.mjs",
  "tests/acs-v2-val-03-postgres.test.mjs",
  "tests/epic-17-imp-03a-slice-2-postgres.test.mjs",
  "tests/s59-post-15-5-aees-sh-shared-state.test.mjs",
];

let containerStarted = false;

function safeUrl(value) {
  try {
    const parsed = new URL(value);
    return `postgresql://${parsed.hostname}:${parsed.port || "default"}${parsed.pathname}`;
  } catch {
    return "<invalid-url>";
  }
}

function fail(stage, cause, detail = {}) {
  const error = new Error(`POSTGRES_ACCEPTANCE_FAILED stage=${stage} cause=${cause}`);
  error.diagnostic = { stage, cause, environment: { host, port, database, user, image }, ...detail };
  throw error;
}

async function run(command, args, options = {}) {
  try {
    return await execFileAsync(command, args, { encoding: "utf8", ...options });
  } catch (error) {
    const detail = String(error.stderr || error.stdout || error.message || "command failed").trim();
    error.commandDetail = detail.replaceAll(password, "<redacted>");
    throw error;
  }
}

async function dockerAvailable() {
  try {
    const result = await run("docker", ["version", "--format", "{{.Server.Version}}"]);
    return result.stdout.trim();
  } catch (error) {
    fail("provisioning", "docker_unavailable", { detail: error.commandDetail ?? "docker daemon is unavailable" });
  }
}

async function removeStaleContainer() {
  await run("docker", ["rm", "-f", containerName]).catch(() => undefined);
}

async function provision() {
  await dockerAvailable();
  await removeStaleContainer();
  try {
    await run("docker", [
      "run", "--detach", "--rm", "--name", containerName,
      "--publish", `${host}:${port}:5432`,
      "--env", `POSTGRES_DB=${database}`,
      "--env", `POSTGRES_USER=${user}`,
      "--env", `POSTGRES_PASSWORD=${password}`,
      image,
    ]);
    containerStarted = true;
    const published = await run("docker", ["inspect", containerName, "--format", "{{(index (index .NetworkSettings.Ports \"5432/tcp\") 0).HostPort}}"]);
    port = Number(published.stdout.trim());
    if (!Number.isInteger(port) || port <= 0) fail("provisioning", "published_port_missing");
    connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  } catch (error) {
    fail("provisioning", "container_start_failed", { detail: error.commandDetail });
  }
}

async function waitForReady(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastCause = "no_response";
  while (Date.now() < deadline) {
    const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 1_000 });
    try {
      const result = await pool.query("SELECT version() AS server_version, 1 AS ok, current_database() AS database, current_user AS user");
      await pool.end();
      return result.rows[0];
    } catch (error) {
      if (error?.code === "ECONNREFUSED") lastCause = "tcp_unreachable";
      else if (error?.code === "28P01") lastCause = "authentication_failed";
      else if (error?.code === "3D000") lastCause = "database_missing";
      else if (error?.code === "ETIMEDOUT") lastCause = "readiness_timeout";
      else lastCause = error?.code ?? (error?.message || "query_failed").split("\n", 1)[0];
      await pool.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  fail("readiness", lastCause, { detail: lastCause });
}

async function validateWritable() {
  const pool = new Pool({ connectionString, max: 1 });
  try {
    const result = await pool.query("CREATE TEMP TABLE acs_acceptance_write_probe (ok integer); INSERT INTO acs_acceptance_write_probe VALUES (1); SELECT ok FROM acs_acceptance_write_probe");
    const row = result.at(-1)?.rows?.[0];
    if (row?.ok !== 1) fail("writable", "write_probe_result_invalid");
    return true;
  } catch (error) {
    fail("writable", error?.code ?? "write_probe_failed", { detail: error?.message });
  } finally {
    await pool.end().catch(() => undefined);
  }
}

async function migrate() {
  const { PostgresSharedAuthoritativeState, SHARED_STATE_SCHEMA_VERSION } = await import("../dist/index.js");
  const state = new PostgresSharedAuthoritativeState({ connectionString });
  try {
    const version = await state.migrate();
    const health = await state.health();
    if (version !== SHARED_STATE_SCHEMA_VERSION || !health.reachable || !health.writable || !health.schemaCurrent) {
      fail("migration", "schema_not_current", { schemaVersion: version, health });
    }
    return version;
  } catch (error) {
    if (error?.diagnostic) throw error;
    fail("migration", error?.code ?? "migration_failed", { detail: error?.message });
  } finally {
    await state.close().catch(() => undefined);
  }
}

async function acceptance() {
  const result = await run(process.execPath, ["--test", ...pgTestFiles], {
    env: { ...process.env, ACS_SH_DATABASE_URL: connectionString },
  }).catch((error) => {
    fail("test", "acceptance_suite_failed", { detail: error.commandDetail, exitCode: error.code });
  });
  const output = `${result.stdout}\n${result.stderr}`;
  const summary = output.match(/ℹ pass (\d+)[\s\S]*?ℹ fail (\d+)[\s\S]*?ℹ cancelled (\d+)[\s\S]*?ℹ skipped (\d+)/);
  if (!summary) fail("test", "summary_missing", { detail: output.slice(-2000) });
  const [, passed, failed, cancelled, skipped] = summary.map(Number);
  if (failed !== 0 || cancelled !== 0 || skipped !== 0) {
    fail("test", skipped !== 0 ? "required_acceptance_skipped" : "acceptance_failed", { passed, failed, cancelled, skipped });
  }
  return { passed, failed, cancelled, skipped };
}

async function cleanup() {
  if (containerStarted) await removeStaleContainer();
}

try {
  const dockerVersion = await dockerAvailable();
  await provision();
  const ready = await waitForReady();
  const writable = await validateWritable();
  const schemaVersion = await migrate();
  const tests = await acceptance();
  console.log(JSON.stringify({
    status: "PASS",
    endpoint: safeUrl(connectionString),
    image,
    dockerVersion,
    readiness: { authenticated: true, query: ready },
    writable,
    schemaVersion,
    tests,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    status: "BLOCKED",
    message: error.message,
    ...(error.diagnostic ?? { environment: { host, port, database, user, image } }),
  }, null, 2));
  process.exitCode = 1;
} finally {
  await cleanup();
}
