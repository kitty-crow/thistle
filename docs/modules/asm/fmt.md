# fmt

Object and executable structures are `Obj`, `Exe` and their shared `Bin` fields. `Sec`, `Sym`, `Rel`, `Dbg`, `Bind`, `SType`, `Mach`, `Isa` and `RType` describe sections, symbols, relocations, debugging and target metadata. `Codec` and `codec` encode/decode THO and THX envelopes; `isObj` and `isExe` recognise the container signatures. Validate data before executing.
