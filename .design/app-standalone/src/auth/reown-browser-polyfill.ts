import { Buffer } from "buffer";
import process from "process";

type ReownBrowserGlobal = typeof globalThis & {
  Buffer?: typeof Buffer;
  global?: typeof globalThis;
  process?: typeof process;
};

const browserGlobal = globalThis as ReownBrowserGlobal;
browserGlobal.global ??= globalThis;
browserGlobal.Buffer ??= Buffer;
browserGlobal.process ??= process;
