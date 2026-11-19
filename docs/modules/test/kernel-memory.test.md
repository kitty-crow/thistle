# kernel memory.test

This test module checks the canonical kernel-memory constants and WebAssembly page calculations. It uses the Bun test harness and does not export runtime kernel APIs. A changed memory policy must keep the byte, MiB and page representations consistent.
