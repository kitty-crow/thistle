# Shared RV64 instruction decoding

The decoder boundary exposes the portable instruction decoding and arithmetic selection functions: `rv64Branch`, `rv64RegisterWordValid`, `rv64RegisterWordValue`, `rv64ImmediateWordValid`, `rv64ImmediateWordValue`, `rv64ImmediateOpValid`, `rv64ImmediateOpValue`, `rv64RegisterValid`, `rv64RegisterValue`, `rv64FloatClass`, `rv64CompressedJump`, `rv64ImmediateB`, `rv64ImmediateI`, `rv64ImmediateJ`, `rv64ImmediateS`, `rv64ImmediateU`. Native and host implementations can share the same instruction semantics.
