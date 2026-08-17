import { createServer } from "node:http";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  createSharedControlPlaneContext,
  RepositoryTimeoutError,
  RepositoryUnavailableError,
  RevisionConflictError,
  RuntimeStaleOwnerError,
  RuntimeStateConflictError,
} = await import(`${distRoot}/index.js`);

const instanceId = process.env.ACS_SH_INSTANCE_ID ?? `cp-${process.pid}`;
const connectionString = process.env.ACS_SH_DATABASE_URL ?? "";
const acceptanceToken = process.env.ACS_SH_ACCEPTANCE_TOKEN ?? "";
if (!connectionString || !acceptanceToken) throw new Error("shared-state acceptance configuration is incomplete");

const context = await createSharedControlPlaneContext({
  instanceId,
  connectionString,
  poolSize: 4,
  connectionTimeoutMs: 1_000,
  statementTimeoutMs: 3_000,
  leaseTtlMs: 100,
  workerStaleAfterMs: 10_000,
});

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 256 * 1024) throw new Error("acceptance request too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function statusFor(error) {
  if (error instanceof RevisionConflictError
    || error instanceof RuntimeStaleOwnerError
    || error instanceof RuntimeStateConflictError) return 409;
  if (error instanceof RepositoryUnavailableError || error instanceof RepositoryTimeoutError) return 503;
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (code.includes("NOT_FOUND")) return 404;
    if (code.includes("CONFLICT") || code.includes("ALREADY_EXISTS")) return 409;
  }
  return 500;
}

async function execute(action, input) {
  switch (action) {
    case "readiness": return context.readiness();
    case "tenant.create": return context.authority.createTenant(input);
    case "tenant.get": return context.state.tenants.get(input.tenantId);
    case "tenant.list": return context.state.tenants.list();
    case "governance.save": return context.authority.saveGovernance(input.governance, input.expectedRevision, input.context);
    case "governance.get": return context.state.governance.get(input.tenantId);
    case "agent.create": return context.authority.createAgent(input.revision, input.context);
    case "agent.save": return context.authority.saveAgent(input.revision, input.expectedRevision, input.context);
    case "agent.get": return context.state.agents.get(input.agentId);
    case "deployment.create": return context.authority.createDeployment(input.record, input.context);
    case "deployment.save": return context.authority.saveDeployment(input.record, input.expectedRecordRevision, input.context);
    case "deployment.get": return context.state.deployments.get(input.deploymentId);
    case "secret.create": return context.authority.createSecretMetadata(input.metadata, input.context);
    case "secret.save": return context.authority.saveSecretMetadata(input.metadata, input.expectedVersion, input.context);
    case "secret.get": return context.state.secretMetadata.get(input.secretId);
    case "economic.save": return context.state.economics.save(input.record, input.expectedRevision);
    case "economic.get": return context.state.economics.get(input.kind, input.recordId);
    case "economic.commit": return context.authority.commitSettlement(input);
    case "runtime.job.create": return context.runtime.createJob(input);
    case "runtime.job.get": return context.state.runtime.getJob(input.jobId);
    case "runtime.worker.register": return context.runtime.registerWorker(input);
    case "runtime.worker.heartbeat": return context.runtime.heartbeat(input);
    case "runtime.worker.get": return context.state.runtime.getWorker(input.workerId);
    case "runtime.claim": return context.runtime.claimNext(input);
    case "runtime.running": return context.runtime.markRunning(input);
    case "runtime.complete": return context.runtime.completeJob(input);
    case "runtime.fail": return context.runtime.failJob(input);
    case "runtime.recover": return context.runtime.recoverExpired(input.at);
    case "runtime.assignments": return context.state.runtime.listAssignments(input);
    case "audit.list": return context.state.audit.list(input);
    case "rate.consume": return context.state.rateLimits.consume(input);
    default: throw new Error(`unsupported acceptance action: ${action}`);
  }
}

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.headers.authorization !== `Bearer ${acceptanceToken}`) {
    response.writeHead(401);
    response.end(JSON.stringify({ error: { code: "unauthorized" } }));
    return;
  }
  if (request.method !== "POST" || request.url !== "/command") {
    response.writeHead(404);
    response.end(JSON.stringify({ error: { code: "not_found" } }));
    return;
  }
  try {
    const body = await readJson(request);
    const result = await execute(body.action, body.input ?? {});
    response.writeHead(200);
    response.end(JSON.stringify({ data: result }));
  } catch (error) {
    response.writeHead(statusFor(error));
    response.end(JSON.stringify({
      error: {
        code: error && typeof error === "object" && "code" in error ? String(error.code) : error?.name ?? "internal_error",
        message: statusFor(error) === 500 ? "shared authority operation failed" : error.message,
      },
    }));
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
if (!address || typeof address === "string") throw new Error("failed to bind acceptance instance");
process.stdout.write(JSON.stringify({ ready: true, instanceId, pid: process.pid, port: address.port }) + "\n");

async function shutdown() {
  await new Promise((resolve) => server.close(resolve));
  await context.close();
  process.exit(0);
}
process.once("SIGTERM", () => { void shutdown(); });
process.once("SIGINT", () => { void shutdown(); });
