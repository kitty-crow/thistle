import { Wasi } from "./wasi.js";
import type { WasmGuestRunner } from "./guest-runner.js";
import type { Sys } from "../core/sys.js";

/** JavaScript-host WASI implementation, excluded from native kernel source. */
const runWasi = (sys: Sys, bytes: Uint8Array, argv: string[]): Promise<number> => new Wasi(sys).run(bytes, argv);

export class HostWasiRunner implements WasmGuestRunner {
  readonly run = runWasi;
}
