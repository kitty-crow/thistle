# vfs

Native VFS functions operate on inode/dentry tables in linear memory. `thistleLoadVfs` validates and mounts a filesystem image; `thistleVfsLoaded`, `thistleVfsRoot`, `thistleVfsInodeCount`, `thistleVfsDentryCount` report mount state. `thistleVfsKind`, `thistleVfsFileSize`, `thistleVfsMode`, `thistleVfsUid`, `thistleVfsGid`, `thistleVfsNlink` read inode metadata. `thistleVfsLookup`, `thistleVfsResolve` locate paths and `thistleVfsAccess` checks permissions. `thistleVfsReadData` and `thistleVfsReadScratch` copy file bytes. Inode numbers and addresses are not interchangeable.
