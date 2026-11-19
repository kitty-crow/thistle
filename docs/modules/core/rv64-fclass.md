# RV64 floating classification

`rv64FloatClass` accepts raw 32-bit or 64-bit IEEE-754 bits. The result is the RISC-V FCLASS mask, distinguishing infinities, normal and subnormal values, signed zeros and both signalling and quiet NaN without converting through host floating arithmetic.
