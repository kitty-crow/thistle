# guest runner

`WasmGuestRunner` is the host-injection contract for running guest WebAssembly. Its `run` method receives the process syscall object, executable bytes and argument vector, and returns a promise resolving to the guest exit status. Native kernels need not provide a JavaScript WebAssembly engine.
