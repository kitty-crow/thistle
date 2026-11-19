# kernel memory

`THISTLE_WASM_PAGE_BYTES` is the WebAssembly page size. `THISTLE_KERNEL_MEMORY_MIB` and `THISTLE_KERNEL_MEMORY_BYTES` define the canonical kernel-memory ceiling; `THISTLE_WASM_INITIAL_PAGES` and `THISTLE_WASM_MAXIMUM_PAGES` give the corresponding page counts. `thistleKernelInitialPages` and `thistleKernelMaximumPages` expose the page sizing calculation to hosts. These values describe a virtual/linear memory contract, not resident physical consumption.
