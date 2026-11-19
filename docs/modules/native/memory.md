# memory

`ThistleMemory` identifies the linear-memory backing. `directMemory` allocates it and `wasmMemory` exposes an imported WebAssembly memory; `memorySize` reports bytes. `fill` and `copyMemory` check bounds before mutation. The little-endian loads are `loadU8`, `loadI8`, `loadU16`, `loadI16`, `loadU32`, `loadI32`, `loadU64`, `loadI64`; stores are `storeU8`, `storeU16`, `storeU32`, `storeI32`, `storeU64`, `storeI64`. Aligned shared operations use `compareExchangeI32`, `atomicAddI32`, `atomicStoreI32`, `atomicLoadI32`, `atomicLoadU64`, `atomicStoreU64`, `atomicAddU64`; non-shared memory follows equivalent sequential semantics.

Narrow stores mask bigint values before conversion to host numbers, preserving low bits beyond JavaScript integer precision.
