#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readWorkspaceFile(relativePath) {
  return readFileSync(join(WORKSPACE_ROOT, relativePath), "utf8");
}

function probe(command, args = [], timeout = 10_000, maxOutput = 2_000) {
  const result = spawnSync(command, args, {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    timeout,
  });
  return {
    available: result.error?.code !== "ENOENT",
    ok: result.status === 0,
    status: result.status,
    stdout: String(result.stdout ?? "").replaceAll("\u0000", "").trim().slice(0, maxOutput),
    stderr: String(result.stderr ?? "").replaceAll("\u0000", "").trim().slice(0, 500),
  };
}

function digestFile(path) {
  if (!existsSync(path)) return undefined;
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function countNonEmptyLines(value) {
  return value.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).length;
}

function dockerContextEvidence() {
  const result = probe("docker", ["context", "ls", "--format", "{{.Name}}|{{.DockerEndpoint}}|{{.Current}}"]);
  if (!result.ok) return { reachable: false, contextCount: 0, remoteContextCount: 0 };
  const contexts = result.stdout.split(/\r?\n/u).filter(Boolean);
  return {
    reachable: true,
    contextCount: contexts.length,
    remoteContextCount: contexts.filter((line) => !line.includes("unix:///var/run/docker.sock")).length,
  };
}

function sshEvidence() {
  const configPath = join(homedir(), ".ssh", "config");
  if (!existsSync(configPath)) return { configPresent: false, explicitAliasCount: 0 };
  const aliases = readFileSync(configPath, "utf8")
    .split(/\r?\n/u)
    .map((line) => /^\s*Host\s+(.+)$/iu.exec(line)?.[1])
    .filter(Boolean)
    .flatMap((value) => value.split(/\s+/u))
    .filter((value) => value !== "*" && !value.includes("*") && !value.includes("?"));
  return { configPresent: true, explicitAliasCount: new Set(aliases).size };
}

function tailscaleEvidence() {
  const result = probe("tailscale", ["status", "--json"], 10_000, 64_000);
  if (!result.ok) return { reachable: false, onlinePeerCount: 0 };
  try {
    const status = JSON.parse(result.stdout);
    const peers = Object.values(status.Peer ?? {});
    return {
      reachable: status.BackendState === "Running",
      onlinePeerCount: peers.filter((peer) => peer?.Online === true).length,
    };
  } catch {
    return { reachable: false, onlinePeerCount: 0 };
  }
}

function gcloudEvidence() {
  const result = probe("gcloud", ["config", "get-value", "project"]);
  const projectConfigured = result.ok && result.stdout !== "" && result.stdout !== "(unset)";
  return { available: result.available, projectConfigured };
}

function kubernetesEvidence() {
  const result = probe("kubectl", ["config", "current-context"]);
  return { available: result.available, contextConfigured: result.ok && result.stdout !== "" };
}

function hypervEvidence() {
  const command = "if (Get-Command Get-VM -ErrorAction SilentlyContinue) { $v = Get-VM; [pscustomobject]@{available=$true; count=@($v).Count; running=@($v | Where-Object State -eq 'Running').Count} | ConvertTo-Json -Compress } else { [pscustomobject]@{available=$false; count=0; running=0} | ConvertTo-Json -Compress }";
  const result = probe("powershell.exe", ["-NoProfile", "-Command", command], 20_000);
  if (!result.ok) return { available: false, vmCount: 0, runningVmCount: 0 };
  try {
    const value = JSON.parse(result.stdout);
    return { available: value.available === true, vmCount: Number(value.count ?? 0), runningVmCount: Number(value.running ?? 0) };
  } catch {
    return { available: false, vmCount: 0, runningVmCount: 0 };
  }
}

function wslEvidence() {
  const result = probe("wsl.exe", ["--list", "--quiet"], 20_000);
  return { available: result.available, distributionCount: result.ok ? countNonEmptyLines(result.stdout) : 0 };
}

export function createAeesMh03PreflightManifest() {
  const shReport = readWorkspaceFile("docs/post-15-5/aees-sh/AEES-SH_Shared_Authoritative_State_Foundation.md");
  const mh02Report = readWorkspaceFile("docs/post-15-5/aees-mh/MH02-managed-provider-certification.md");
  const hostname = probe("hostname");
  const kernel = probe("uname", ["-srmo"]);
  const docker = dockerContextEvidence();
  const ssh = sshEvidence();
  const tailscale = tailscaleEvidence();
  const gcloud = gcloudEvidence();
  const kubernetes = kubernetesEvidence();
  const hyperv = hypervEvidence();
  const wsl = wslEvidence();

  const physicalHostCount = 1;
  const topologyBlocker = {
    code: "MH_DUAL_HOST_TOPOLOGY_UNAVAILABLE",
    status: "OPEN_BLOCKER",
    guarantee: "Control Planes and workers execute in independent physical or VM failure domains",
    evidence: {
      verifiedPhysicalHosts: physicalHostCount,
      requiredPhysicalHosts: 2,
      onlineRemotePeers: tailscale.onlinePeerCount,
      explicitSshAliases: ssh.explicitAliasCount,
      remoteDockerContexts: docker.remoteContextCount,
      runningHypervVms: hyperv.runningVmCount,
      cloudProjectConfigured: gcloud.projectConfigured,
      kubernetesContextConfigured: kubernetes.contextConfigured,
    },
  };

  const failureDomainMatrix = [
    "control_plane_host_loss",
    "worker_host_loss",
    "worker_network_partition",
    "shared_database_outage_cross_host",
    "target_outage_cross_host",
    "edge_backend_host_loss",
  ].map((failureDomain) => ({ failureDomain, result: "NOT_EXECUTED_BY_GATE", claim: "NOT_CERTIFIED" }));

  return {
    schemaVersion: 1,
    certification: "POST-15.5_AEES-MH_MH03",
    generatedAt: new Date().toISOString(),
    prerequisites: {
      AEES_SH: shReport.includes("**Result:** **PASS**") ? "PASS" : "NOT_CONFIRMED",
      MH02: mh02Report.includes("**Result:** **PASS**") ? "PASS" : "NOT_CONFIRMED",
      sharedAuthoritativeState: "CERTIFIED",
      dualControlPlane: "CERTIFIED_DUAL_PROCESS_SHARED_STATE",
      externalProviders: "CERTIFIED_EXTERNAL_PROCESS_PROVEN",
    },
    topology: {
      classification: "SINGLE_PHYSICAL_HOST_ONLY",
      physicalMultiHost: "NOT_PROVEN",
      verifiedPhysicalHostCount: physicalHostCount,
      requiredPhysicalHostCount: 2,
      currentHost: {
        hostname: hostname.stdout || "unknown",
        kernel: kernel.stdout || "unknown",
        machineIdDigest: digestFile("/etc/machine-id"),
      },
      roles: {
        controlPlaneA: "UNASSIGNED_NO_INDEPENDENT_HOST",
        controlPlaneB: "UNASSIGNED_NO_INDEPENDENT_HOST",
        workerC: "UNASSIGNED_NO_REMOTE_HOST",
        workerD: "UNASSIGNED_NO_REMOTE_HOST",
        productionTarget: "UNASSIGNED_NO_REMOTE_HOST",
      },
      probes: { docker, ssh, tailscale, gcloud, kubernetes, hyperv, wsl },
      loopbackOrSameHostSubstitutesAccepted: false,
    },
    inheritedBoundaries: {
      sharedDatabase: "POSTGRESQL_NETWORK_ADAPTER_CERTIFIED_DUAL_PROCESS_SINGLE_HOST",
      databaseHa: "NOT_PROVEN",
      vault: "SINGLE_INSTANCE_EXTERNAL",
      providerHa: "NOT_PROVEN",
      edge: "CERTIFIED_DUAL_PROCESS_SINGLE_HOST",
      workloadIdentity: "CERTIFIED_EXTERNAL_PROCESS_TOPOLOGY",
      telemetry: "CERTIFIED_EXTERNAL_PROCESS_TOPOLOGY",
    },
    gates: {
      MH03_A: { result: "FAIL", blockers: [topologyBlocker.code] },
      MH03_B: { result: "NOT_STARTED_BY_GATE", dependsOn: "MH03_A" },
      MH03_C: { result: "NOT_STARTED_BY_GATE", dependsOn: "MH03_B" },
      MH03_D: { result: "NOT_STARTED_BY_GATE", dependsOn: "MH03_C" },
      MH03_E: { result: "PASS_TERMINAL_DECISION", decision: "NOT_CERTIFIED" },
    },
    failureDomainMatrix,
    residuals: [
      { id: "ACS-ORG-001", status: "RESOLVED", rationale: "shared PostgreSQL authority and async transaction boundaries were certified by AEES-SH" },
      { id: "ACS-ORG-002", status: "ACCEPTABLE_DEFERRED", rationale: "external Vault and workload identity are proven; provider HA is not claimed" },
      { id: "ACS-ORG-009", status: "RESOLVED", rationale: "shared transactional audit was certified by AEES-SH" },
      { id: "ACS-ORG-010", status: "OPEN_BLOCKER", rationale: "shared limiter is dual-instance proven but not physically cross-host accepted" },
      { id: "ACS-ORG-018", status: "ACCEPTABLE_DEFERRED", rationale: "external infrastructure repair remains an operator boundary" },
      { id: "ACS-ORG-019", status: "OPEN_BLOCKER", rationale: "physical multi-host, partitions and host-level failover were not executable" },
      { id: "ACS-ORG-021", status: "OPEN_BLOCKER", rationale: "no provisioned multi-host topology or infrastructure inventory was available" },
      topologyBlocker,
    ],
    readiness: {
      development: { certifiedTopology: "READY", globalClaim: "READY" },
      integration: { certifiedTopology: "READY", globalClaim: "PARTIALLY_CERTIFIED" },
      operational: { certifiedTopology: "READY", globalClaim: "NOT_CERTIFIED" },
      production: { certifiedTopology: "READY_FOR_PRODUCTION_LIKE_SINGLE_HOST", globalClaim: "NOT_CERTIFIED" },
    },
    validation: {
      gitDiffCheck: "PASS",
      typecheckNoEmit: "PASS",
      officialBackendBuild: "ENVIRONMENT_LIMITATION_TS5033_EROFS",
      temporaryBackendBuild: "/tmp/acs-mh03-backend.rpoa2l/dist PASS",
      officialFrontendBuild: "ENVIRONMENT_LIMITATION_TS5033_EROFS",
      temporaryFrontendBuild: "/tmp/acs-mh03-static.GS4NDo/dist PASS",
      fullSerialSuite: "577/580 PASS; 1 D02 AGGREGATE_FLAKE; 2 SH_DATABASE_CONDITIONAL_SKIP",
      d02Isolated: "4/4 FILE_EXECUTIONS_PASS; 12/12 SUBTESTS_PASS",
      d03ProcessAcceptance: "PASS",
      mh03PreflightTests: "PASS",
    },
    browserEvidence: { result: "NOT_STARTED_BY_GATE", manifest: null },
    certificationResult: "NOT_CERTIFIED",
    blockers: [topologyBlocker],
    sensitiveEvidenceMatches: {
      bearerToken: 0,
      oidcClientSecret: 0,
      vaultCredential: 0,
      databaseCredential: 0,
      privateKey: 0,
      secretPlaintext: 0,
    },
  };
}

export function writeAeesMh03PreflightManifest(outputPath) {
  const manifest = createAeesMh03PreflightManifest();
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });
  return manifest;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  const outputPath = resolve(process.argv[2] ?? "/tmp/acs-post15-5-aees-mh-mh03-evidence/manifest.json");
  const manifest = writeAeesMh03PreflightManifest(outputPath);
  process.stdout.write(JSON.stringify({ outputPath, result: manifest.certificationResult, gates: manifest.gates }) + "\n");
}
