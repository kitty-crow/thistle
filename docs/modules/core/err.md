# err

Kernel errors carry guest-visible errno codes (`Errno`, `KErr`). `bad` throws a kernel error, `msg` formats a caught value for diagnostics, and `requireValue` rejects a missing indexed value with EFAULT rather than passing `undefined` into a kernel operation.
