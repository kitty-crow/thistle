# Native kernel

`src/native/` contains the RV64GC kernel implementation. Its entry modules are
`abi.ts`, `kernel.ts`, `vfs.ts`, `thx.ts` and `start.ts`. Shared instruction
and numeric operations are defined in `src/core/` and `src/vm/`.

The native interface operates on explicit memory and hart state. The ABI
defines the layout of control, process and hart data; the VFS and THX modules
provide filesystem access and executable loading. `start.ts` constructs the
initial guest stack.

The hosted `Kern` class in `src/core/kernel.ts` provides higher-level process
and host integration. `src/core/host-kernel.ts` constructs it using host
networking and WASI services.

Consumers compiling the native source must include its transitive imports
and preserve the declared memory, numeric and synchronisation semantics.
Compilation alone does not establish equivalence between execution paths.
