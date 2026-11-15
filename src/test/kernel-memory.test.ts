import assert from "node:assert/strict";
import { test } from "node:test";
import {
  THISTLE_KERNEL_MEMORY_MIB,
  THISTLE_KERNEL_MEMORY_BYTES,
  THISTLE_WASM_PAGE_BYTES,
  THISTLE_WASM_INITIAL_PAGES,
  THISTLE_WASM_MAXIMUM_PAGES,
} from "../core/kernel-memory.js";

test("Thistle owns the 512 MiB WebAssembly kernel memory policy", () => {
  assert.equal(THISTLE_KERNEL_MEMORY_MIB, 512);
  assert.equal(THISTLE_WASM_PAGE_BYTES, 65536);
  assert.equal(THISTLE_KERNEL_MEMORY_BYTES, 536870912);
  assert.equal(THISTLE_WASM_INITIAL_PAGES, 8192);
  assert.equal(THISTLE_WASM_MAXIMUM_PAGES, 32768);
  assert.ok(THISTLE_WASM_MAXIMUM_PAGES >= THISTLE_WASM_INITIAL_PAGES);
});

test("Thistle kernel policy is page aligned and has an exact byte count", () => {
  assert.equal(THISTLE_KERNEL_MEMORY_BYTES % THISTLE_WASM_PAGE_BYTES, 0);
  assert.equal(THISTLE_WASM_INITIAL_PAGES * THISTLE_WASM_PAGE_BYTES, THISTLE_KERNEL_MEMORY_BYTES);
});
