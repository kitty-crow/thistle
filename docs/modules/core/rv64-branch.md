# rv64 branch

`rv64Branch` interprets the branch function field and compares two 64-bit operands. It distinguishes invalid encodings from a branch that is not taken; the caller owns PC changes and instruction fault reporting. The helper does not fetch or store guest memory.
