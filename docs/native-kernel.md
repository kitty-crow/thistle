# Single-source native Thistle kernel

The native RV64GC kernel implementation in `src/native/` is owned and maintained by **Thistle**, never by Teto. These modules incorporate the latest native execution and shared instruction fixes from the existing mikuOS reconciliation branch `95a90a35991230574b4b77d902da831969eddc5e` rather than reverting to the older standalone Teto implementation.

Production Teto builds must fetch an exact Thistle HEAD, run Bake lowering over those Thistle modules and compile their output with Baguette. Git manifests must preserve the original source revision and the full transitive module graph. Teto and mikuOS must not compile the former `src/teto/kernel.ts` implementation.

The host-facing TypeScript `Kern` in `src/core/kernel.ts` currently owns host adapters and higher-level scheduling. The migration is complete only after native and host execution paths are reconciled, the complete WASM ABI validates and mikuOS boots the generated Teto kernel with real guest parity tests. Relocating sources alone is not proof of equivalence.
