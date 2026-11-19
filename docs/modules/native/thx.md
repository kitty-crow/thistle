# thx

`thistleLoadThx(memory, hart, image, imageLength)` loads a THX2 image from the reserved image range. It checks the envelope, FNV checksum, JSON fields, machine/ISA, section layout and alignment before finalising the executable mapping. Numeric fields and string bounds are validated in linear memory; the return value is a `THISTLE_THX_*` status.
