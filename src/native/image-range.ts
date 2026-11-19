import { C_IMAGE_LOCK, C_IMAGE_TOP, C_IMAGE_SIZE, THISTLE_CONTROL_BASE } from "./abi.js";
import { atomicLoadI32, loadU32 } from "./memory.js";
import type { ThistleMemory } from "./memory.js";
import type { Ptr, U32 } from "./types.js";

/** Access is valid only inside the current locked input image reservation. */
export const inputContains = (memory: ThistleMemory, at: Ptr, size: U32): boolean => {
  if (atomicLoadI32(memory, THISTLE_CONTROL_BASE + C_IMAGE_LOCK) !== 1) return false;
  const start = loadU32(memory, THISTLE_CONTROL_BASE + C_IMAGE_TOP);
  const length = loadU32(memory, THISTLE_CONTROL_BASE + C_IMAGE_SIZE);
  return at >= start && at - start <= length && size <= length - (at - start);
};
