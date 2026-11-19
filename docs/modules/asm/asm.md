# asm

Vendored ThistleASM assembler. `Asm` consumes assembler source using `AsmOpt` and emits an `AsmOut` object; `AsmErr` carries source location and diagnostic details. The assembler resolves local expressions and emits relocation records for unresolved references. Source fixes belong in the upstream ThistleASM repository.
