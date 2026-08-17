import { request } from "node:https";
import { readFileSync } from "node:fs";

const endpoint = new URL(process.env.ACS_MH02_WORKER_ENDPOINT ?? "");
const token = process.env.ACS_MH02_WORKER_TOKEN ?? "";
const workerId = process.env.ACS_MH02_WORKER_ID ?? "";
const instanceId = process.env.ACS_MH02_WORKER_INSTANCE_ID ?? "";
const caPath = process.env.ACS_MH02_CA_PATH ?? "";
const traceparent = process.env.ACS_MH02_TRACEPARENT;
if (!token || !workerId || !instanceId || !caPath || endpoint.protocol !== "https:") throw new Error("worker client configuration is incomplete");
const body = Buffer.from(JSON.stringify({ workerId, instanceId }));
const result = await new Promise((resolve, reject) => {
  const call = request({
    hostname: endpoint.hostname,
    port: Number(endpoint.port),
    path: endpoint.pathname,
    method: "POST",
    ca: readFileSync(caPath),
    servername: "localhost",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "content-length": String(body.length),
      ...(traceparent ? { traceparent } : {}),
    },
  }, (response) => {
    const chunks = [];
    response.on("data", (chunk) => chunks.push(chunk));
    response.on("end", () => resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") }));
  });
  call.once("error", reject);
  call.end(body);
});
process.stdout.write(JSON.stringify({ success: result.status === 200, pid: process.pid, status: result.status, data: result.body.data }) + "\n");
