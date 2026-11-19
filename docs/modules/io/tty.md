# tty

`Tty` handles canonical and raw terminal input, line editing, echo, control characters, interrupt delivery and window size. Input can be a string or bytes. Raw events preserve escape sequences for guest editors; canonical reads produce completed lines or EOF. Output is delivered via the supplied host callback.
