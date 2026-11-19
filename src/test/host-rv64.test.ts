import assert from "node:assert/strict";
import { test } from "node:test";
import { Kern } from "../core/kernel.js";
import { Sys } from "../core/sys.js";
import { defaultKernelOptions } from "../core/host-options.js";
import { MemIn, MemOut } from "../io/stream.js";
import { Exe, codec } from "../../thistle-asm/fmt.js";

test("hosted Kern executes RV64 through the canonical native core", async () => {
  const kernel = new Kern(defaultKernelOptions());
  const output = new MemOut();
  const error = new MemOut();
  const process = kernel.session({ sin: new MemIn(), sout: output, serr: error });
  const sys = new Sys(kernel, process);
  const text = new TextEncoder().encode("canonical RV64 ready\n");
  const words = [0x00100513, 0x000205b7, (text.length << 20) | 0x613,
    0x04000893, 0x73, 0x00000513, 0x05d00893, 0x73];
  const code = new Uint8Array(words.length * 4);
  const view = new DataView(code.buffer);
  words.forEach((word, index) => view.setUint32(index * 4, word, true));
  const exe = new Exe("thistle64");
  exe.isa = "rv64gc";
  exe.entry = 0x10000;
  exe.sec.push(
    { name: ".text", flg: "rx", align: 4096, addr: 0x10000, size: code.length, data: code },
    { name: ".rodata", flg: "r", align: 4096, addr: 0x20000, size: text.length, data: text },
  );
  sys.mkfile("/canonical.thx", codec.pack(exe), 0o755);
  const child = sys.start("/canonical.thx", []);
  assert.equal(await child.done, 0, error.text());
  assert.equal(output.text(), "canonical RV64 ready\n");
});
