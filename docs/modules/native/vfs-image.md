# native/vfs-image

`serializeThistleVfs` serialises `TreeEnt` entries into the bounded native VFS image format. It is useful for native VFS tests and explicit snapshot consumers. Hosted guests use the live VFS rather than a read-only snapshot.
