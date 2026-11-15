import { Wasi } from "./wasi.js";
import type { WasmGuestRunner } from "./guest-runner.js";
import type { Sys } from "../core/sys.js";

/** JavaScript-host WASI implementation, excluded from native kernel source. */
export class HostWasiRunner implements WasmGuestRunner {
  async run(sys: Sys, bytes: Uint8Array, argv: string[]): Promise<number> {
    return new Wasi(sys).run(bytes, argv);
  }
}
