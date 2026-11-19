import type { App } from "../apps/base.js";
import type { Kern } from "./kernel.js";
import type { Proc } from "./proc.js";
import { bad, KErr, requireValue } from "./err.js";
import { Sys } from "./sys.js";
import { Exe, codec, isExe } from "../../thistle-asm/fmt.js";
import { Vm } from "../vm/vm.js";
import { Rv64 } from "../vm/rv64.js";
import { Vm64 } from "../vm/vm64.js";

function decodeExecutable(path: string, bin: Uint8Array): Exe {
  try {
    const image = codec.unpack(bin);
    return image instanceof Exe ? image : bad("ENOEXEC", `${path}: not an executable`);
  } catch (error) {
    return bad("ENOEXEC", `${path}: ${error instanceof Error ? error.message : typeof error === "string" ? error : "non-Error executable failure"}`);
  }
}

export function validateExecutable(apps: ReadonlyMap<string, App>, path: string, bin: Uint8Array): void {
  // The guest image must have a supported format and an available interpreter before exec changes credentials.
  if (bin.length >= 4 && (bin[0] ?? -1) === 0 && (bin[1] ?? -1) === 0x61 && (bin[2] ?? -1) === 0x73 && (bin[3] ?? -1) === 0x6d) return;

  if (isExe(bin)) { decodeExecutable(path, bin); return; }

  const source = new TextDecoder().decode(bin);
  const app = /^#!thistle:([^\n]+)\n/.exec(source);

  if (app && !apps.has(requireValue(app[1] ?? null, "app[1]"))) bad("ENOEXEC", `${path}: missing app ${app[1] ?? ""}`);
  if (app) return;

  const shell = source.startsWith("#!/bin/thsh\n") || source.startsWith("#!/bin/sh\n");
  if (shell && !apps.has("thsh")) bad("ENOEXEC", "shell is not installed");
  if (shell) return;

  bad("ENOEXEC", `${path}: unknown executable format`);
}

export function executeImage(kernel: Kern, p: Proc, path: string, bin: Uint8Array, argv: string[]): Promise<number> {
  const sys = new Sys(kernel, p);
  const wasm = bin.length >= 4 && (bin[0] ?? -1) === 0 && (bin[1] ?? -1) === 0x61 && (bin[2] ?? -1) === 0x73 && (bin[3] ?? -1) === 0x6d;
  if (wasm && !kernel.wasiGuest) throw new KErr("ENOSYS", "WebAssembly guest runner was not provided by the host");
  if (wasm && kernel.wasiGuest) return kernel.wasiGuest.run(sys, bin, [path, ...argv]);
  if (isExe(bin)) return executeNative(sys, path, bin, argv);
  const src = new TextDecoder().decode(bin);
  const m = /^#!thistle:([^\n]+)\n/.exec(src);
  if (m) {
    const app = kernel.apps.get(requireValue(m[1] ?? null, "m[1]")) ?? bad("ENOEXEC", `${path}: missing app ${m[1] ?? ""}`);
    return argv.includes("--help") ? app.help(sys) : app.run(sys, argv);
  }
  if (src.startsWith("#!/bin/thsh\n") || src.startsWith("#!/bin/sh\n")) {
    const app = kernel.apps.get("thsh") ?? bad("ENOEXEC", "shell is not installed");
    return app.run(sys, [path, ...argv]);
  }
  return bad("ENOEXEC", `${path}: unknown executable format`);
}

function executeNative(sys: Sys, path: string, bin: Uint8Array, argv: string[]): Promise<number> {
  const x = decodeExecutable(path, bin);
  if (x.machine === "thistle64" && x.isa === "rv64gc") return new Rv64(sys).run(x, [path, ...argv], bin);
  return x.machine === "thistle64" ? new Vm64(sys).run(x, [path, ...argv]) : new Vm(sys).run(x, [path, ...argv]);
}

