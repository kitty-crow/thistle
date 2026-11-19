# Native word tests

The Bun test suite checks private floating-point scratch storage, exact finite, infinity and signed-zero IEEE-754 bit conversions, rounding, and memory identity. NaN conversions must remain NaN; JavaScript host numbers may canonicalise NaN payloads. This test does not establish payload preservation for native instruction-level bit moves.

Narrow-store regressions cover unsigned and negative 64-bit values beyond JavaScript integer precision in ordinary and shared memory.
