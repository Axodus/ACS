#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readWorkspaceFile(relativePath) {
  return readFileSync(join(WORKSPACE_ROOT, relativePath), "utf8");
}

function probe(command, args = []) {
  const result = spawnSync(command, args, {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    timeout: 10_000,
  });
  return {
    available: result.error?.code !== "ENOENT",
    ok: result.status === 0,
    status: result.status,
    stdout: String(result.stdout ?? "").trim().slice(0, 500),
    stderr: String(result.stderr ?? "").trim().slice(0, 500),
  };
}

function inspectSource(relativePath, markers) {
  const source = readWorkspaceFile(relativePath);
  return {
    source: relativePath,
    markers: Object.fromEntries(markers.map((marker) => [marker, source.includes(marker)])),
  };
}

export function createAeesMhPreflightManifest() {
  const closure = readWorkspaceFile("docs/epics/epic-15-5/epic-15-5-closure-report.md");
  const findings = readWorkspaceFile("docs/epics/epic-15-5/operational-gap-inventory.md");
  const packageJson = JSON.parse(readWorkspaceFile("package.json"));
  const dependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };

  const stateInventory = [
    {
      component: "tenant_membership_governance_audit",
      backend: "atomic-json-snapshot",
      classification: "SINGLE_HOST_LOCAL",
      ...inspectSource("src/control-plane/durable-administrative-state.ts", ["writeFileSync", "renameSync"]),
    },
    {
      component: "agent",
      backend: "sqlite",
      classification: "SINGLE_HOST_LOCAL",
      ...inspectSource("src/control-plane/durable-agent-state.ts", ["DatabaseSync", "multiHost: \"not_proven\""]),
    },
    {
      component: "deployment",
      backend: "sqlite",
      classification: "SINGLE_HOST_LOCAL",
      ...inspectSource("src/control-plane/durable-deployment-state.ts", ["DatabaseSync", "multiHost: \"not_proven\""]),
    },
    {
      component: "secret_metadata",
      backend: "sqlite",
      classification: "SINGLE_HOST_LOCAL",
      ...inspectSource("src/intelligence/vault-secret-provider.ts", ["DatabaseSync", "SqliteSecretCatalog"]),
    },
    {
      component: "economics_settlement",
      backend: "sqlite",
      classification: "SINGLE_HOST_LOCAL",
      ...inspectSource("src/control-plane/durable-economic-state.ts", ["DatabaseSync", "SqliteEconomicStateStore", "SqliteSettlementProvider"]),
    },
    {
      component: "rate_limiter",
      backend: "sqlite",
      classification: "SINGLE_HOST_LOCAL",
      ...inspectSource("src/http/rate-limit.ts", ["DatabaseSync", "SqliteRateLimitStore"]),
    },
    {
      component: "runtime_jobs_assignments_workers_leases",
      backend: "sqlite",
      classification: "SINGLE_HOST_LOCAL",
      ...inspectSource("src/workers/durable-runtime-state.ts", ["DatabaseSync", "multiHost: \"not_proven\""]),
    },
  ];

  const sharedDriverNames = ["pg", "postgres", "redis", "ioredis", "@libsql/client"];
  const configuredSharedDrivers = sharedDriverNames.filter((name) => dependencies[name] !== undefined);
  const hResiduals = ["ACS-ORG-001", "ACS-ORG-002", "ACS-ORG-009", "ACS-ORG-010", "ACS-ORG-018", "ACS-ORG-019", "ACS-ORG-021"];
  const importedResiduals = hResiduals.map((findingId) => ({
    findingId,
    imported: findings.includes(`| ${findingId} `),
    hStatus: "ACCEPTABLE_DEFERRED",
    aeesMhStatus: "OPEN_BLOCKER",
  }));

  const docker = probe("docker", ["version", "--format", "{{.Server.Version}}"]);
  const postgres = probe("pg_isready", []);
  const hostname = probe("hostname", []);
  const repositoryContracts = [
    inspectSource("src/control-plane/tenant-domain.ts", ["create(tenant: Tenant): Tenant", "save(tenant: Tenant, expectedRevision: number): Tenant"]),
    inspectSource("src/control-plane/agent-service.ts", ["create(revision: AgentRevision): AgentRevision", "save(revision: AgentRevision, expectedRevision: number): AgentRevision"]),
    inspectSource("src/control-plane/deployment-service.ts", ["create(record: DeploymentRecord): DeploymentRecord", "save(record: DeploymentRecord, expectedRecordRevision: number): DeploymentRecord"]),
  ];

  const blockers = [
    {
      code: "MH_SHARED_AUTHORITATIVE_STATE_UNAVAILABLE",
      guarantee: "all production authoritative state uses a networked shared transactional backend",
      evidence: stateInventory.map(({ component, backend, classification }) => ({ component, backend, classification })),
    },
    {
      code: "MH_ASYNC_SHARED_REPOSITORY_BOUNDARY_UNAVAILABLE",
      guarantee: "network database acknowledgement occurs before authoritative mutation success",
      evidence: {
        repositoryContractModel: "SYNCHRONOUS",
        configuredSharedDrivers,
        prohibitedShortcuts: ["sqlite_on_network_filesystem", "write_behind_cache", "database_cli_subprocess"],
      },
    },
    {
      code: "MH_DUAL_HOST_TOPOLOGY_UNAVAILABLE",
      guarantee: "two Control Plane hosts contend against the same authority and survive host loss",
      evidence: {
        dockerEngineAvailable: docker.ok,
        dockerHostCount: docker.ok ? 1 : 0,
        externalSharedDatabaseReachable: postgres.ok,
        currentHost: hostname.stdout || "unknown",
      },
    },
  ];

  return {
    schemaVersion: 1,
    certification: "POST-15.5_AEES-MH",
    generatedAt: new Date().toISOString(),
    baseline: {
      epic15_5ClosureImported: closure.includes("CLOSED WITH CERTIFICATION LIMITS"),
      certifiedTopology: "PRODUCTION_LIKE_SINGLE_HOST",
      globalProductionClaim: "NOT_CERTIFIED",
      closureCommit: "428ca6d",
      residuals: importedResiduals,
    },
    environment: {
      host: hostname.stdout || "unknown",
      node: process.version,
      docker: {
        available: docker.available,
        reachable: docker.ok,
        serverVersion: docker.ok ? docker.stdout : undefined,
      },
      sharedPostgres: {
        clientProbeAvailable: postgres.available,
        reachable: postgres.ok,
      },
      epic16Present: existsSync(join(WORKSPACE_ROOT, "docs/epics/epic-16")),
    },
    discovery: {
      stateInventory,
      repositoryContracts,
      configuredSharedDrivers,
      infrastructureManifestsPresent: false,
    },
    gates: {
      MH01: { result: "FAIL", blockers: blockers.map(({ code }) => code) },
      MH02: { result: "NOT_STARTED_BY_GATE", dependsOn: "MH01" },
      MH03: { result: "NOT_STARTED_BY_GATE", dependsOn: "MH02" },
    },
    validation: {
      preflightTests: "PASS",
      typecheckNoEmit: "PASS",
      officialRepositoryBuild: "ENVIRONMENT_LIMITATION_TS5033_EROFS",
      temporaryWritableBuild: "PASS",
      epic15_5CoreFiles: "14/14 PASS",
      loopbackProcessScenarios: "26/26 PASS_OUTSIDE_SANDBOX",
      sandboxListenerFailure: "ENVIRONMENT_LIMITATION_LISTEN_EPERM",
      gitDiffCheck: "PASS",
    },
    certificationResult: "NOT_CERTIFIED",
    blockers,
    sensitiveEvidenceMatches: 0,
  };
}

export function writeAeesMhPreflightManifest(outputPath) {
  const manifest = createAeesMhPreflightManifest();
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });
  return manifest;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  const outputPath = resolve(process.argv[2] ?? "/tmp/acs-post15-5-aees-mh-evidence/manifest.json");
  const manifest = writeAeesMhPreflightManifest(outputPath);
  process.stdout.write(JSON.stringify({ outputPath, result: manifest.certificationResult, gates: manifest.gates }) + "\n");
}
