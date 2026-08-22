import { isIP } from "node:net";
import { createAcsHttpServer } from "../dist/index.js";

const DEFAULT_HOST = "0.0.0.0";

function resolveHost() {
  const requestedHost = process.env.ACS_HTTP_HOST;

  if (!requestedHost) {
    return DEFAULT_HOST;
  }

  // Only honor ACS_HTTP_HOST if it's a valid, bindable address. This guards
  // against invalid/unreachable IPv6 addresses (e.g. link-local or
  // container-specific addresses that don't exist in the runtime container),
  // which cause EADDRNOTAVAIL on platforms like Railway.
  if (isIP(requestedHost) === 0) {
    console.warn(JSON.stringify({
      success: false,
      service: "acs-http",
      message: `Invalid ACS_HTTP_HOST "${requestedHost}", falling back to ${DEFAULT_HOST}`,
    }));
    return DEFAULT_HOST;
  }

  return requestedHost;
}

const port = Number(process.env.ACS_HTTP_PORT ?? 8788);
const host = resolveHost();
const { server } = await createAcsHttpServer();

server.on("error", (error) => {
  if (error?.code === "EADDRNOTAVAIL" && host !== DEFAULT_HOST) {
    console.warn(JSON.stringify({
      success: false,
      service: "acs-http",
      message: `Host "${host}" is not available, retrying with ${DEFAULT_HOST}`,
    }));
    server.listen(port, DEFAULT_HOST, () => {
      console.log(JSON.stringify({
        success: true,
        service: "acs-http",
        host: DEFAULT_HOST,
        port,
        baseUrl: `http://${DEFAULT_HOST}:${port}/acs`,
        mode: "read-only-inspection",
      }));
    });
    return;
  }

  throw error;
});

server.listen(port, host, () => {
  console.log(JSON.stringify({
    success: true,
    service: "acs-http",
    host,
    port,
    baseUrl: `http://${host}:${port}/acs`,
    mode: "read-only-inspection",
  }));
});

