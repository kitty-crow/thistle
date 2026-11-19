# Kernel architecture

`Kern` owns global process and filesystem state. A process carries its
credentials, environment, descriptors, working directory and execution state.
System calls operate on that state through `Sys`.

The virtual filesystem is independent of the host filesystem. Host adapters
populate or persist the tree through the VFS interfaces. Terminal input and
output use streams supplied by the host.

The [native kernel](native-kernel.md) uses an explicit memory layout and
hart state for RV64GC execution.
