# Shared VM descriptor operations

`VmFiles` owns the buffered standard-input cursor for one guest execution. Its `read` method returns bytes from stdin or an existing descriptor; `open` translates Thistle syscall access, creation, append and truncation flags into the host `Sys` contract. Both VM widths share the same file policy.
