# expr

`expr` parses assembler expressions into `Exp` nodes. `Lin` represents a linear expression in symbols and addends; `absolute` requires an absolute result. Relocatable expressions need assembler/linker context before they can become final addresses.
