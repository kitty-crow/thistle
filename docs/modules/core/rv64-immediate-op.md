# rv64 immediate op

`rv64ImmediateOpValid` validates an OP-IMM function field and instruction encoding. `rv64ImmediateOpValue` evaluates the already validated instruction against an integer operand using RV64 width and signedness. The register write and invalid-encoding fault remain the caller's responsibility.
