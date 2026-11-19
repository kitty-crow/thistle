import assert from "node:assert/strict";
import { test } from "node:test";
import { H_FLOAT_SCRATCH, H_STARTUP_LOADS, THISTLE_HART_BASE, THISTLE_HART_STRIDE } from "../native/abi.js";
import { directMemory, wasmMemory, loadU64, storeU64 } from "../native/memory.js";
import { bitsToF32, bitsToF64, f32ToBits, f64ToBits } from "../native/word.js";

const first = THISTLE_HART_BASE + H_FLOAT_SCRATCH;
const second = first + THISTLE_HART_STRIDE;

test("floating scratch occupies an aligned, private slot in each hart", () => {
  assert.equal(H_FLOAT_SCRATCH % 8, 0);
  assert.ok(H_FLOAT_SCRATCH >= H_STARTUP_LOADS + 8);
  assert.ok(H_FLOAT_SCRATCH + 8 <= THISTLE_HART_STRIDE);
  for (const shared of [false, true]) {
    const memory = directMemory(65536, shared);
    storeU64(memory, first - 8, 0x1122334455667788n);
    storeU64(memory, first + 8, 0x8877665544332211n);
    assert.equal(f64ToBits(memory, first, -0), 0x8000000000000000n);
    assert.equal(f32ToBits(memory, second, 1.5), 0x3fc00000n);
    assert.equal(loadU64(memory, first), 0x8000000000000000n);
    assert.equal(loadU64(memory, second), 0x3fc00000n);
    assert.equal(loadU64(memory, first - 8), 0x1122334455667788n);
    assert.equal(loadU64(memory, first + 8), 0x8877665544332211n);
  }
});

test("floating bit conversions preserve IEEE-754 representations", () => {
  const memory = directMemory(65536);
  const f32 = [0n, 0x80000000n, 1n, 0x007fffffn, 0x00800000n, 0x3f800000n,
    0x7f7fffffn, 0x7f800000n, 0xff800000n];
  for (const bits of f32) {
    assert.equal(f32ToBits(memory, second, bitsToF32(memory, first, bits)), bits);
  }
  const f64 = [0n, 0x8000000000000000n, 1n, 0x000fffffffffffffn, 0x0010000000000000n,
    0x3ff0000000000000n, 0x7fefffffffffffffn, 0x7ff0000000000000n,
    0xfff0000000000000n];
  for (const bits of f64) {
    assert.equal(f64ToBits(memory, second, bitsToF64(memory, first, bits)), bits);
  }
  // Host Number conversions may canonicalise NaN payloads; verify that the
  // re-encoded value remains NaN rather than requiring a host-specific payload.
  const nan32 = f32ToBits(memory, second, bitsToF32(memory, first, 0x7fc12345n));
  const nan64 = f64ToBits(memory, second, bitsToF64(memory, first, 0x7ff8123456789abcn));
  assert.ok(Number.isNaN(bitsToF32(memory, first, nan32)));
  assert.ok(Number.isNaN(bitsToF64(memory, first, nan64)));
  assert.ok(Object.is(bitsToF32(memory, first, 0x80000000n), -0));
  assert.ok(Object.is(bitsToF64(memory, first, 0x8000000000000000n), -0));
  assert.equal(f32ToBits(memory, first, 1 + 2 ** -24), 0x3f800000n);
  assert.equal(f32ToBits(memory, first, 1 + 3 * 2 ** -24), 0x3f800002n);
  assert.ok(Number.isNaN(bitsToF32(memory, first, 0x7f800001n)));
  assert.ok(Number.isNaN(bitsToF64(memory, first, 0x7ff0000000000001n)));
});

test("conversion aliases the canonical memory, not other equal-sized buffers", () => {
  const a = directMemory(65536);
  const b = directMemory(65536);
  const external = new WebAssembly.Memory({ initial: 1 });
  const c = wasmMemory(external);
  f64ToBits(a, first, 1);
  f64ToBits(b, first, 2);
  f64ToBits(c, first, 3);
  assert.equal(loadU64(a, first), 0x3ff0000000000000n);
  assert.equal(loadU64(b, first), 0x4000000000000000n);
  assert.equal(new DataView(external.buffer).getBigUint64(first, true), 0x4008000000000000n);
});
