import type { I32, I64, Ptr, U32, U64 } from "./types.js";

export interface ThistleMemory {
  readonly buffer: ArrayBufferLike;
  readonly bytes: Uint8Array;
  readonly view: DataView;
  readonly shared: boolean;
}

export const directMemory = (bytes: U32, shared = false): ThistleMemory => {
  if (!Number.isInteger(bytes) || bytes < 65536 || bytes > 0x7fffffff) {
    throw new RangeError(`invalid Thistle memory size ${bytes}`);
  }
  const buffer = shared
    ? new SharedArrayBuffer(bytes)
    : new ArrayBuffer(bytes);
  return {
    buffer,
    bytes: new Uint8Array(buffer),
    view: new DataView(buffer),
    shared,
  };
};

/** A zero-copy host view of imported WebAssembly memory. */
export const wasmMemory = (memory: WebAssembly.Memory, shared = false): ThistleMemory => {
  const buffer = memory.buffer;
  return {
    buffer,
    bytes: new Uint8Array(buffer),
    view: new DataView(buffer),
    shared,
  };
};

export const memorySize = (memory: ThistleMemory): U32 => memory.bytes.length;

const range = (memory: ThistleMemory, at: Ptr, size: U32): void => {
  if (!Number.isInteger(at) || !Number.isInteger(size) || at < 0 || size < 0 || at + size > memory.bytes.length) {
    throw new RangeError(`Thistle memory access ${at}+${size}`);
  }
};

export const fill = (memory: ThistleMemory, at: Ptr, size: U32, value: U32): void => {
  range(memory, at, size);
  memory.bytes.fill(value & 255, at, at + size);
};

export const copyMemory = (memory: ThistleMemory, to: Ptr, from: Ptr, size: U32): void => {
  range(memory, to, size);
  range(memory, from, size);
  memory.bytes.copyWithin(to, from, from + size);
};

export const loadU8 = (memory: ThistleMemory, at: Ptr): U32 => {
  range(memory, at, 1);
  return memory.view.getUint8(at);
};

export const loadI8 = (memory: ThistleMemory, at: Ptr): I64 =>
  BigInt.asIntN(8, BigInt(loadU8(memory, at)));

export const loadU16 = (memory: ThistleMemory, at: Ptr): U32 => {
  range(memory, at, 2);
  return memory.view.getUint16(at, true);
};

export const loadI16 = (memory: ThistleMemory, at: Ptr): I64 => {
  range(memory, at, 2);
  return BigInt(memory.view.getInt16(at, true));
};

export const loadU32 = (memory: ThistleMemory, at: Ptr): U32 => {
  range(memory, at, 4);
  return memory.view.getUint32(at, true);
};

export const loadI32 = (memory: ThistleMemory, at: Ptr): I32 => {
  range(memory, at, 4);
  return memory.view.getInt32(at, true);
};

export const loadU64 = (memory: ThistleMemory, at: Ptr): U64 => {
  range(memory, at, 8);
  return memory.view.getBigUint64(at, true);
};

export const loadI64 = (memory: ThistleMemory, at: Ptr): I64 => {
  range(memory, at, 8);
  return memory.view.getBigInt64(at, true);
};

export const storeU8 = (memory: ThistleMemory, at: Ptr, value: U32 | I64): void => {
  range(memory, at, 1);
  memory.bytes[at] = Number(value) & 255;
};

export const storeU16 = (memory: ThistleMemory, at: Ptr, value: U32 | I64): void => {
  range(memory, at, 2);
  memory.view.setUint16(at, Number(value), true);
};

export const storeU32 = (memory: ThistleMemory, at: Ptr, value: U32 | I32 | I64): void => {
  range(memory, at, 4);
  memory.view.setUint32(at, Number(value), true);
};

export const storeI32 = (memory: ThistleMemory, at: Ptr, value: I32): void => {
  range(memory, at, 4);
  memory.view.setInt32(at, value, true);
};

export const storeU64 = (memory: ThistleMemory, at: Ptr, value: U64 | I64): void => {
  range(memory, at, 8);
  memory.view.setBigUint64(at, BigInt.asUintN(64, value), true);
};

export const storeI64 = (memory: ThistleMemory, at: Ptr, value: I64): void => {
  range(memory, at, 8);
  memory.view.setBigInt64(at, BigInt.asIntN(64, value), true);
};

const words = (memory: ThistleMemory): Int32Array => new Int32Array(memory.buffer);

export const compareExchangeI32 = (
  memory: ThistleMemory,
  at: Ptr,
  expected: I32,
  replacement: I32,
): I32 => {
  range(memory, at, 4);
  if (at & 3) throw new RangeError(`unaligned Thistle atomic ${at}`);
  const view = words(memory);
  const index = at >>> 2;
  if (memory.shared) return Atomics.compareExchange(view, index, expected, replacement);
  const old = memory.view.getInt32(at, true);
  if (old === expected) view[index] = replacement;
  return old;
};

export const atomicAddI32 = (memory: ThistleMemory, at: Ptr, value: I32): I32 => {
  range(memory, at, 4);
  if (at & 3) throw new RangeError(`unaligned Thistle atomic ${at}`);
  const view = words(memory);
  const index = at >>> 2;
  if (memory.shared) return Atomics.add(view, index, value);
  const old = memory.view.getInt32(at, true);
  view[index] = old + value;
  return old;
};

export const atomicStoreI32 = (memory: ThistleMemory, at: Ptr, value: I32): void => {
  range(memory, at, 4);
  if (at & 3) throw new RangeError(`unaligned Thistle atomic ${at}`);
  const view = words(memory);
  const index = at >>> 2;
  if (memory.shared) Atomics.store(view, index, value);
  else view[index] = value;
};

export const atomicLoadI32 = (memory: ThistleMemory, at: Ptr): I32 => {
  range(memory, at, 4);
  if (at & 3) throw new RangeError(`unaligned Thistle atomic ${at}`);
  const view = words(memory);
  const index = at >>> 2;
  return memory.shared ? Atomics.load(view, index) : memory.view.getInt32(at, true);
};

export const atomicLoadU64 = (memory: ThistleMemory, at: Ptr): U64 => {
  range(memory, at, 8);
  if (at & 7) throw new RangeError(`unaligned Thistle atomic ${at}`);
  if (memory.shared) return Atomics.load(new BigUint64Array(memory.buffer), at >>> 3);
  return memory.view.getBigUint64(at, true);
};

export const atomicStoreU64 = (memory: ThistleMemory, at: Ptr, value: U64): void => {
  range(memory, at, 8);
  if (at & 7) throw new RangeError(`unaligned Thistle atomic ${at}`);
  if (memory.shared) Atomics.store(new BigUint64Array(memory.buffer), at >>> 3, ux64(value));
  else memory.view.setBigUint64(at, ux64(value), true);
};

export const atomicAddU64 = (memory: ThistleMemory, at: Ptr, value: U64): U64 => {
  range(memory, at, 8);
  if (at & 7) throw new RangeError(`unaligned Thistle atomic ${at}`);
  if (memory.shared) return Atomics.add(new BigUint64Array(memory.buffer), at >>> 3, ux64(value));
  const old = memory.view.getBigUint64(at, true);
  memory.view.setBigUint64(at, ux64(old + value), true);
  return old;
};

const ux64 = (value: U64): U64 => BigInt.asUintN(64, value);
