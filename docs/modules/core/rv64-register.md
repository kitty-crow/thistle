# rv64 register

`rv64RegisterValid` checks the RV64 register-register function fields. `rv64RegisterValue` evaluates a validated integer or multiply/divide operation on two signed 64-bit register values, with wraparound and unsigned comparisons as required. The caller supplies operands and owns register storage.
