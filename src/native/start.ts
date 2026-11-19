import {
  THISTLE_PARSER_BASE,
  THISTLE_PARSER_NUMBER,
  THISTLE_STARTUP_MAGIC,
  THISTLE_START_FORMAT,
  THISTLE_START_MEMORY,
  THISTLE_START_OK,
  THISTLE_START_RANGE,
} from "./abi.js";
import {
  thistleHartImageFloor,
  thistleHartVirtualTop,
  thistleImageContains,
  thistleStackAux,
  thistleStackCopy,
  thistleStackFinish,
  thistleStackPrepare,
  thistleStackStoreU64,
} from "./kernel.js";
import { loadU8, loadU32, storeU32 } from "./memory.js";
import type { ThistleMemory } from "./memory.js";
import type { I32, Ptr, U32, U64 } from "./types.js";
import { u32word } from "./word.js";

const START_BAD: Ptr = 0xffffffff;

const startupEntry = (memory: ThistleMemory, at: Ptr, end: Ptr): Ptr => {
  if (end - at < 4) return START_BAD;
  const length = loadU32(memory, at);
  if (length > end - at - 4) return START_BAD;
  let index: U32 = 0;
  while (index < length) {
    if (loadU8(memory, at + 4 + index) === 0) return START_BAD;
    index += 1;
  }
  storeU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_NUMBER, length);
  return at + 4 + length;
};

// Validate every length-prefixed string before touching guest memory. Reserve a
// 16-byte-aligned entry stack above the heap guard, then lay out argc, argv,
// envp, auxiliary values and random bytes using the guest ABI's word width.
export const thistleBuildInitialStack = (
  memory: ThistleMemory,
  hart: U32,
  startup: Ptr,
  startupLength: U32,
  stackBytes: U32,
): I32 => {
  // Validate the entire startup image before reserving guest stack memory; malformed records must never publish a partial stack.
  if (!thistleImageContains(memory, startup, startupLength)) return THISTLE_START_RANGE;
  if (startupLength < 32 || loadU32(memory, startup) !== THISTLE_STARTUP_MAGIC) return THISTLE_START_FORMAT;
  const argc = loadU32(memory, startup + 4);
  const envc = loadU32(memory, startup + 8);
  if (argc < 1 || argc > 4096 || envc > 8192 || argc > 0xffffffff - envc) return THISTLE_START_FORMAT;
  const entries = argc + envc;
  const end = startup + startupLength;
  let cursor = startup + 32;
  let totalStrings: U64 = 0n;
  let index: U32 = 0;
  while (index < entries) {
    const next = startupEntry(memory, cursor, end);
    if (next === START_BAD) return THISTLE_START_FORMAT;
    totalStrings += u32word(loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_NUMBER)) + 1n;
    if (totalStrings > 0x7fffffffn) return THISTLE_START_RANGE;
    cursor = next;
    index += 1;
  }
  if (cursor !== end) return THISTLE_START_FORMAT;

  const top = thistleHartVirtualTop(memory, hart);
  const limit = stackBytes < 1024 * 1024 ? 1024 * 1024 : stackBytes;
  if (top <= u32word(limit) || top < 32n + totalStrings) return THISTLE_START_MEMORY;
  const bottom = top - u32word(limit);
  let stringPointer = top - 16n - totalStrings;
  if (stringPointer < 16n) return THISTLE_START_MEMORY;
  const random = stringPointer - 16n;
  const aligned = random & -16n;
  const words = argc + envc + 33;
  if (words > 0x0fffffff) return THISTLE_START_RANGE;
  const wordBytes = u32word(words * 8);
  if (aligned < wordBytes) return THISTLE_START_MEMORY;
  const stackPointer = aligned - wordBytes & -16n;
  const floor = thistleHartImageFloor(memory, hart);
  const heapGuard = (floor + 4095n & -4096n) + 1024n * 1024n;
  if (stackPointer < bottom || stackPointer < heapGuard) return THISTLE_START_MEMORY;
  let result = thistleStackPrepare(memory, hart, bottom, stackPointer);
  if (result !== THISTLE_START_OK) return result;

  const argvTable = stackPointer + 8n;
  const envTable = argvTable + u32word(argc) * 8n + 8n;
  const auxTable = envTable + u32word(envc) * 8n + 8n;
  result = thistleStackStoreU64(memory, hart, stackPointer, u32word(argc));
  if (result !== THISTLE_START_OK) return result;
  result = thistleStackStoreU64(memory, hart, argvTable + u32word(argc) * 8n, 0n);
  if (result !== THISTLE_START_OK) return result;
  result = thistleStackStoreU64(memory, hart, envTable + u32word(envc) * 8n, 0n);
  if (result !== THISTLE_START_OK) return result;

  cursor = startup + 32;
  stringPointer = top - 16n;
  index = 0;
  while (index < envc) {
    const next = startupEntry(memory, cursor, end);
    if (next === START_BAD) return THISTLE_START_FORMAT;
    const length = loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_NUMBER);
    stringPointer -= u32word(length) + 1n;
    result = thistleStackCopy(memory, hart, stringPointer, cursor + 4, length);
    if (result !== THISTLE_START_OK) return result;
    result = thistleStackStoreU64(memory, hart, envTable + u32word(index) * 8n, stringPointer);
    if (result !== THISTLE_START_OK) return result;
    cursor = next;
    index += 1;
  }
  let exec: U64 = 0n;
  index = 0;
  while (index < argc) {
    const next = startupEntry(memory, cursor, end);
    if (next === START_BAD) return THISTLE_START_FORMAT;
    const length = loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_NUMBER);
    stringPointer -= u32word(length) + 1n;
    result = thistleStackCopy(memory, hart, stringPointer, cursor + 4, length);
    if (result !== THISTLE_START_OK) return result;
    result = thistleStackStoreU64(memory, hart, argvTable + u32word(index) * 8n, stringPointer);
    if (result !== THISTLE_START_OK) return result;
    if (index === 0) exec = stringPointer;
    cursor = next;
    index += 1;
  }
  if (stringPointer !== random + 16n || exec === 0n) return THISTLE_START_FORMAT;
  result = thistleStackCopy(memory, hart, random, startup + 16, 16);
  if (result !== THISTLE_START_OK) return result;
  result = thistleStackAux(memory, hart, auxTable, random, exec);
  if (result !== THISTLE_START_OK) return result;
  return thistleStackFinish(memory, hart, stackPointer);
};
