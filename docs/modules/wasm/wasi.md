# wasi

`Wasi.run` instantiates a guest module and maps WASI Preview 1 imports to `Sys`. Guests supply an exported memory and either `_start` or `main`. Arguments and environment are copied into guest memory; descriptor operations use the host process table. Output is buffered until guest execution returns, including an explicit guest exit.
