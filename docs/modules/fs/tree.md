# tree

Snapshot scope: regular files, directories and symbolic links (no character devices).

`TreeEnt` describes a persisted filesystem entry and `Tree` the backing-store interface. `TreeFs.dump` exports entries while preserving inode identities for hard links; `TreeFs.load` rebuilds the mounted hierarchy and checks metadata and capacity. `fileSum` computes a length-qualified content checksum; `treeFs` is the exported helper instance.
