# Thistle

**THISTLE**: Thistle Hosted Interactive Shell-based TypeScript Live Environment.

Thistle is a TypeScript kernel for the Thistle32 and Thistle64 execution
environments. It provides processes, scheduling, signals, file descriptors,
pipes, terminals, a virtual filesystem, devices, networking and system calls.

## Kernel validation

Bun is the required host runtime. CI type-checks and tests TypeScript directly; the optional build command retains emitted files for existing consumers.

```sh
git submodule update --init --recursive
bun install
bun run guards
bun run check
bun run test
```

| Command | Result |
| --- | --- |
| `bun run guards` | All strict source, test and documentation checks |
| `bun run check` | TypeScript validation without emitting files |
| `bun run build` | Strict guards followed by compilation to `build/` |
| `bun run test` | All kernel tests executed directly from TypeScript under Bun |
| `bun run test:memory` | Kernel memory policy |
| `bun run test:numeric` | Native numeric operations |
| `bun run test:vfs` | Native VFS syscalls |
| `bun run test:host` | Host networking and WASI capability boundaries |

The semantic guards may download model weights on first use.

## Source tree

| Path | Purpose |
| --- | --- |
| `src/core` | Kernel and process state, system calls and shared operations |
| `src/native` | Native RV64GC kernel and memory ABI |
| `src/fs` | Virtual filesystem |
| `src/io` | Streams and terminals |
| `src/net` | Network transport |
| `src/vm` | Guest instruction execution |
| `src/wasm` | Guest WebAssembly and WASI |
| `scripts/` | Repository automation and validation |
| `asm` | Pinned ThistleASM dependency (including KITTYX) |

## Documentation

[Module reference](docs/index.md)

- [Kernel architecture](docs/architecture.md)
- [Native kernel](docs/native-kernel.md)
- [Processes and descriptors](docs/processes.md)
- [Filesystem](docs/filesystem.md)
- [Programme execution](docs/execution.md)
- [System calls](docs/syscalls.md)

## Licence

[MIT](LICENSE).
