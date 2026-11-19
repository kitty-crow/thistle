# cap

`Lim` holds filesystem, guest memory, stack and instruction-fuel ceilings. `Lim.host()` derives defaults from the host's reported RAM and accepts the `THISTLE_FS_MB`, `THISTLE_MEM_MB`, `THISTLE_STACK_MB` and `THISTLE_FUEL` environment variables. Invalid limits are rejected; zero fuel disables the instruction limit.
