import { createAcsHttpServer } from "../dist/index.js";

const port = Number(process.env.ACS_HTTP_PORT ?? 8788);
const host = process.env.ACS_HTTP_HOST ?? "127.0.0.1";
const { server } = await createAcsHttpServer();

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

