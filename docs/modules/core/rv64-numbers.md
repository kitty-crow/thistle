# rv64 numbers

`sx` sign-extends a fixed-width integer, `ux` normalises an unsigned 64-bit value, `u32word` retains the unsigned low 32 bits, and `word` converts a numeric word to bigint. These helpers define fixed-width arithmetic for shared RV64 execution rather than relying on JavaScript number overflow.
