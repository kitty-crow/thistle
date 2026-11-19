# native vfs syscall.test

Native VFS syscall tests exercise the mounted filesystem route and the host fallback when no filesystem is mounted. The fixtures initialise direct linear memory, install an executable segment and run guest instructions; assertions inspect syscall status and guest-visible data.
