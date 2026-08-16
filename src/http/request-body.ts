import type { IncomingMessage } from "node:http";
import { AcsHttpValidationError } from "./validation.js";

export const DEFAULT_MAX_REQUEST_BODY_BYTES = 1_048_576;

export class PayloadTooLargeError extends Error {
  readonly limit: number;

  constructor(limit: number) {
    super("request body exceeds the configured limit");
    this.name = "PayloadTooLargeError";
    this.limit = limit;
  }
}

export async function readBoundedJsonBody(
  request: IncomingMessage,
  maxBytes = DEFAULT_MAX_REQUEST_BODY_BYTES,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    request.on("data", (chunk: Buffer | string) => {
      if (settled) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.byteLength;
      if (bytes > maxBytes) {
        fail(new PayloadTooLargeError(maxBytes));
        return;
      }
      chunks.push(buffer);
    });
    request.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        const data = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(data));
      } catch {
        reject(new AcsHttpValidationError("invalid JSON body"));
      }
    });
    request.on("error", fail);
  });
}

export function declaredBodyExceedsLimit(request: IncomingMessage, maxBytes: number): boolean {
  const value = request.headers["content-length"];
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return false;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > maxBytes;
}
