# base

`App` defines an installed application with a name and execution/help entry points. `FnApp` wraps a function as an application. Execution receives a process-local `Sys` and argument vector and reports an exit code asynchronously; it does not execute with independent filesystem privileges.
