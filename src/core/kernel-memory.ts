/**
 * Canonical kernel linear-memory policy for the Thistle -> Bake -> Baguette
 * build. A Teto build consumes these values from the exact Thistle source
 * revision, rather than maintaining another memory budget in src/teto.
 *
 * This is WASM linear memory, not the sparse guest virtual address space
 * managed by Mem64. 512 MiB = 8192 WebAssembly pages.
 */
export const THISTLE_WASM_PAGE_BYTES = 65536;
export const THISTLE_KERNEL_MEMORY_MIB = 512;
export const THISTLE_KERNEL_MEMORY_BYTES = THISTLE_KERNEL_MEMORY_MIB * 1024 * 1024;
export const THISTLE_WASM_INITIAL_PAGES = THISTLE_KERNEL_MEMORY_BYTES / THISTLE_WASM_PAGE_BYTES;
/** Retain the existing 2 GiB growth ceiling until kernel allocation policy changes. */
export const THISTLE_WASM_MAXIMUM_PAGES = 32768;

/** Explicit ABI-friendly accessors consumed by Baguette's generated Teto module. */
export const thistleKernelInitialPages = (): number => THISTLE_WASM_INITIAL_PAGES;
export const thistleKernelMaximumPages = (): number => THISTLE_WASM_MAXIMUM_PAGES;
