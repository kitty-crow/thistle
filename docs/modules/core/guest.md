# Guest execution

`validateExecutable` checks the executable format and required interpreter. `executeImage` dispatches the process image to the host WASI runner, native VM or registered shell application.

RV64GC THX images execute through `Rv64` and the canonical native instruction core.
