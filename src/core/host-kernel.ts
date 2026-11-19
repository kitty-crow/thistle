import { Kern } from "./kernel.js";
import { Lim } from "./cap.js";
import { DEFAULT_CONFIG } from "./config.js";
import type { SystemConfig } from "./config.js";
import { hostNet } from "../net/host-fetch.js";
import { HostWasiRunner } from "../wasm/host-wasi.js";

/**
 * Host entry point with explicit browser/Node networking and WASI services.
 * Kernel implementation remains the same canonical Thistle Kern class.
 */
export const createHostKernel = (
  lim: Lim = Lim.host(),
  config: SystemConfig = DEFAULT_CONFIG,
  setId = false,
): Kern => new Kern({ net: hostNet(), lim, config, setId, wasiGuest: new HostWasiRunner() });
