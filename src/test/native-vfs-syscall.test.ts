import assert from "node:assert/strict";
import { test } from "node:test";
import { directMemory, storeU8, storeU32, loadU8 } from "../native/memory.js";
import { TETO_BATCH_BUDGET, TETO_BATCH_SYSCALL, TETO_SEGMENT_READ, TETO_SEGMENT_WRITE, TETO_SEGMENT_EXECUTE } from "../native/abi.js";
import { tetoKernelInit, tetoHartInit, tetoProcessInit, tetoImageReserve, tetoImageRelease, tetoImageBegin,
  tetoImageSegment, tetoImageFinish, tetoHartSetPc, tetoHartSetX, tetoHartGetX, tetoRunRv64Batch,
  tetoGuestPage } from "../native/kernel.js";
import { tetoLoadVfs } from "../native/vfs.js";

for (const mounted of [true, false]) test(`guest file syscalls ${mounted ? "use the mounted VFS" : "delegate without a mount"}`, () => {
  const memory = directMemory(64 * 1024 * 1024);
  assert.equal(tetoKernelInit(memory, 1, false), 0);
  const image = new Uint8Array(32 + 56 + 60 + 20);
  const v = new DataView(image.buffer);
  const put = (at: number, n: number): void => v.setUint32(at, n, true);
  put(0, 0x31534656); put(4, 1); put(8, 2); put(12, 1); put(16, 1); put(20, image.length);
  put(32, 1); put(36, 2); put(40, 0o755); put(52, 1);
  put(88, 2); put(92, 1); put(96, 0o644); put(108, 1); put(112, 3);
  image.set([65, 66, 67], 144);
  put(148, 1); put(152, 2); put(156, 1); image[164] = 102;
  let checksum = 2166136261;
  for (const byte of image.subarray(32)) checksum = Math.imul(checksum ^ byte, 16777619) >>> 0;
  put(24, checksum);
  const input = tetoImageReserve(memory, image.length);
  for (let i = 0; i < image.length; i++) storeU8(memory, input + i, BigInt(image[i]!));
  if (mounted) assert.equal(tetoLoadVfs(memory, input, image.length), 0);
  assert.equal(tetoImageRelease(memory, input, image.length), 0);
  assert.equal(tetoHartInit(memory, 0, 0x10000000n, 0x200000n), 0);
  assert.equal(tetoProcessInit(memory, 0, 1, 0, 0, 0, 0, 0, 0, 0), 0);
  const code = tetoImageReserve(memory, 16);
  storeU32(memory, code, 0x73);
  storeU8(memory, code + 4, 47n); storeU8(memory, code + 5, 102n); storeU8(memory, code + 6, 0n);
  assert.equal(tetoImageBegin(memory, 0, 0x10000000n, 0x200000n, 0n, 0, 0), 0);
  assert.equal(tetoImageSegment(memory, 0, 1, 1, 0x200000n, 4n, TETO_SEGMENT_READ | TETO_SEGMENT_EXECUTE, code, 4), 0);
  assert.equal(tetoImageSegment(memory, 0, 2, 1, 0x210000n, 4096n, TETO_SEGMENT_READ | TETO_SEGMENT_WRITE, code + 4, 3), 0);
  assert.equal(tetoImageFinish(memory, 0, 7), 0);
  assert.equal(tetoImageRelease(memory, code, 16), 0);
  const call = (nr: number, a: bigint, b = 0n, c = 0n): bigint => {
    tetoHartSetPc(memory, 0, 0x200000n);
    tetoHartSetX(memory, 0, 17, BigInt(nr));
    tetoHartSetX(memory, 0, 10, a); tetoHartSetX(memory, 0, 11, b); tetoHartSetX(memory, 0, 12, c);
    assert.equal(tetoRunRv64Batch(memory, 0, 1, 0n, -1), TETO_BATCH_BUDGET);
    return tetoHartGetX(memory, 0, 10);
  };
  if (!mounted) {
    tetoHartSetX(memory, 0, 17, 56n);
    tetoHartSetX(memory, 0, 10, -100n);
    tetoHartSetX(memory, 0, 11, 0x210000n);
    assert.equal(tetoRunRv64Batch(memory, 0, 1, 0n, -1), TETO_BATCH_SYSCALL);
    return;
  }
  assert.equal(call(56, -100n, 0x210000n, 1n), -30n);
  assert.equal(call(56, -100n, 0x220000n), -14n);
  const fd = call(56, -100n, 0x210000n);
  assert.equal(fd, 3n);
  assert.equal(call(63, fd, 0x200000n, 3n), -14n);
  assert.equal(call(63, fd, 0x210100n, 3n), 3n);
  const page = tetoGuestPage(memory, 0, 0x210100n, false);
  assert.deepEqual([loadU8(memory, page + 0x100), loadU8(memory, page + 0x101), loadU8(memory, page + 0x102)], [65, 66, 67]);
  assert.equal(call(63, fd, 0x210100n, 3n), 0n);
  assert.equal(call(62, fd, -1n, 2n), 2n);
  assert.equal(call(63, fd, 0x210100n, 3n), 1n);
  assert.equal(loadU8(memory, page + 0x100), 67);
  assert.equal(call(57, fd), 0n);
  assert.equal(call(63, fd, 0x210100n, 3n), -9n);
});
