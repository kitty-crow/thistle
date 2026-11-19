# proc

`Proc` owns PID and group identity, credentials, descriptor table, signal mask and completion promise. `PState` describes lifecycle status; `Sig` describes supported signals. `Fd` holds stream endpoints, file path and cursor, access and close-on-exec flags. `Io` carries standard streams. `ExecReplace` transfers control to a replacement image without allocating a new PID.

`FdFlags` names descriptor access and inheritance flags. `ProcInit` names the initial process image, identity, environment and streams.
