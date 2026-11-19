/**
 * Host-supplied WebAssembly guest capability.
 *
 * The canonical Thistle kernel must not recursively instantiate a JavaScript
 * WebAssembly runtime inside a compiled native kernel. Hosts may delegate WASI
 * execution to their supported runtime. This interface owns no host code.
 */
import type { Sys } from "../core/sys.js";
export interface WasmGuestRunner {
  run(sys: Sys, bytes: Uint8Array, argv: string[]): Promise<number>;
}
