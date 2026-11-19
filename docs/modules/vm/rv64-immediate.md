# rv64 immediate

`rv64ImmediateI`, `rv64ImmediateS`, `rv64ImmediateB`, `rv64ImmediateU` and `rv64ImmediateJ` decode the immediate bits from RV64 instruction formats. `rv64CompressedJump` decodes the compressed jump displacement. Callers apply the result to their own register or PC state; these functions perform no memory access.
