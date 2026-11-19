# stream

`In` and `Out` define byte-stream endpoints. `enc` and `dec` convert UTF-8; `MemIn` and `MemOut` provide in-memory endpoints; `FnOut` delegates writes to a host callback; `Pipe` connects producers to readers and `TeeOut` forwards output to multiple endpoints. Reference counts and closure affect EOF.

`Stream` supplies the default lifecycle contract for endpoints that do not need reference counting.
