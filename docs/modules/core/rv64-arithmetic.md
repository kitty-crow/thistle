# rv64 arithmetic

The multiply-high functions (`rv64MulHighUnsigned`, `rv64MulHighSigned`, `rv64MulHighSignedUnsigned`) compute the upper 64 bits with the specified operand signedness. `rv64DivideSigned`, `rv64DivideUnsigned`, `rv64RemainderSigned` and `rv64RemainderUnsigned` implement RV64 division semantics at the requested width, including zero divisors and signed overflow.
