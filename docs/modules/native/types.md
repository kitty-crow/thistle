# types

`I32`, `U32`, `I64`, `U64`, `Ptr`, `F32` and `F64` re-export the canonical native scalar aliases. Native compilation relies on their fixed-width identities; this module defines no additional layout. Memory offsets and registers use explicit conversion helpers.
