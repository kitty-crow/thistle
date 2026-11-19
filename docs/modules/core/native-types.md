# native types

`I32`, `U32`, `I64`, `U64`, `Ptr`, `F32` and `F64` are canonical scalar aliases for signed/unsigned integers, pointers and floating-point values. The compiler backends recognise the fixed widths. TypeScript aliases do not enforce runtime range; arithmetic and memory operations perform the required conversion.
