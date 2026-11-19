import { Lim } from "./cap.js";
import { DEFAULT_CONFIG } from "./config.js";
import type { SystemConfig } from "./config.js";
import type { Net } from "../net/net.js";
import { hostNet } from "../net/host-fetch.js";
import type { WasmGuestRunner } from "../wasm/guest-runner.js";
import { HostWasiRunner } from "../wasm/host-wasi.js";

export interface KernelOptions {
  net: Net;
  lim: Lim;
  config: SystemConfig;
  setId: boolean;
  wasiGuest: WasmGuestRunner;
}

export const defaultKernelOptions = (): KernelOptions => ({
  net: hostNet(), lim: Lim.host(), config: DEFAULT_CONFIG, setId: false, wasiGuest: new HostWasiRunner(),
});
