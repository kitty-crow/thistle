# host wasi

`HostWasiRunner` adapts `Wasi` to the injected `WasmGuestRunner` interface. The runner requires the JavaScript host's WebAssembly APIs and a process-local `Sys`; native code does not compile this host adapter.
