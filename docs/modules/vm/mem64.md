# mem64

`PG` specifies sparse-memory page size. `RvMemory` describes the address-space access contract; `Mem64` materialises pages on demand within its virtual ceiling and resident-memory budget. Reads and writes accept bigint guest addresses; access and allocation checks prevent ranges outside the guest space from becoming host allocations.

`hostNumber` validates safe host integer conversion; `randomFill` fills validated guest memory; `readString` reads a bounded NUL-terminated guest string.
