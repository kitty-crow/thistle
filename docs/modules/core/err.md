# err

Kernel errors carry guest-visible errno codes (`Errno`, `KErr`). `bad` throws a kernel error, `msg` formats a caught value for diagnostics, and `requireValue` rejects a missing indexed value with EFAULT rather than passing `undefined` into a kernel operation.

`withValue` applies a callback to a present optional value. `ensure` invokes the supplied failure callback when a condition is false.
