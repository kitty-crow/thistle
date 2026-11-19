# rv64 word

`rv64RegisterWordValid` and `rv64RegisterWordValue` validate and evaluate OP-32. `rv64ImmediateWordValid` and `rv64ImmediateWordValue` handle OP-IMM-32. Results are sign-extended from 32 bits into the 64-bit register representation. Register updates and instruction faults are external to these helpers.
