import {
  THISTLE_PARSER_BASE,
  THISTLE_PARSER_NUMBER,
  THISTLE_PARSER_STRING,
  THISTLE_PARSER_STRING_ESCAPED,
  THISTLE_PARSER_STRING_LENGTH,
  THISTLE_SEGMENT_EXECUTE,
  THISTLE_SEGMENT_READ,
  THISTLE_SEGMENT_WRITE,
  THISTLE_THX_CHECKSUM,
  THISTLE_THX_JSON,
  THISTLE_THX_LENGTH,
  THISTLE_THX_MAGIC,
  THISTLE_THX_METADATA,
  THISTLE_THX_OK,
  THISTLE_THX_RANGE,
  THISTLE_THX_SECTION,
} from "./abi.js";
import {
  thistleImageBegin,
  thistleImageContains,
  thistleImageFinish,
  thistleImageSegment,
} from "./kernel.js";
import { loadU8, loadU32, loadU64, storeU32, storeU64 } from "./memory.js";
import type { ThistleMemory } from "./memory.js";
import type { I32, Ptr, U32, U64 } from "./types.js";
import { mulU32, u32word, wordToU32 } from "./word.js";

const BAD: Ptr = 0xffffffff;
const BAD_METADATA: Ptr = 0xfffffffe;
const MAX_SAFE: U64 = 9007199254740991n;

const K_MACHINE: U32 = 1;
const K_VER: U32 = 2;
const K_SEC: U32 = 3;
const K_SYM: U32 = 4;
const K_REL: U32 = 5;
const K_DBG: U32 = 6;
const K_IDENT: U32 = 7;
const K_ENTRY: U32 = 8;
const K_MEM: U32 = 9;
const K_ISA: U32 = 10;
const K_PHDR: U32 = 11;
const K_PHENT: U32 = 12;
const K_PHNUM: U32 = 13;
const K_NAME: U32 = 14;
const K_FLG: U32 = 15;
const K_ALIGN: U32 = 16;
const K_SIZE: U32 = 17;
const K_ADDR: U32 = 18;
const K_AT: U32 = 19;
const K_LEN: U32 = 20;

const whitespace = (byte: U32): boolean => byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d;
const digit = (byte: U32): boolean => byte >= 0x30 && byte <= 0x39;
const hex = (byte: U32): boolean => digit(byte) || byte >= 0x41 && byte <= 0x46 || byte >= 0x61 && byte <= 0x66;

const space = (memory: ThistleMemory, at: Ptr, end: Ptr): Ptr => {
  let cursor = at;
  while (cursor < end && whitespace(loadU8(memory, cursor))) cursor += 1;
  return cursor;
};

const skipEscape = (memory: ThistleMemory, at: Ptr, end: Ptr): Ptr => {
  if (at >= end) return BAD;
  const code = loadU8(memory, at);
  if (code === 0x75 && (end - at < 5 || !hex(loadU8(memory, at + 1)) || !hex(loadU8(memory, at + 2)) || !hex(loadU8(memory, at + 3)) || !hex(loadU8(memory, at + 4)))) return BAD;
  if (code === 0x75) return at + 5;
  if (code !== 0x22 && code !== 0x5c && code !== 0x2f && code !== 0x62 && code !== 0x66 && code !== 0x6e && code !== 0x72 && code !== 0x74) return BAD;
  return at + 1;
};

const parseString = (memory: ThistleMemory, at: Ptr, end: Ptr): Ptr => {
  if (at >= end || loadU8(memory, at) !== 0x22) return BAD;
  const start = at + 1;
  let cursor = start;
  let escaped: U32 = 0;
  while (cursor < end) {
    const byte = loadU8(memory, cursor);
    if (byte === 0x22) {
      storeU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING, start);
      storeU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING_LENGTH, cursor - start);
      storeU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING_ESCAPED, escaped);
      return cursor + 1;
    }
    if (byte < 0x20) return BAD;
    if (byte === 0x5c) {
      escaped = 1;
      cursor = skipEscape(memory, cursor + 1, end);
      continue;
    }
    cursor += 1;
  }
  return BAD;
};

const byte = (memory: ThistleMemory, at: Ptr, index: U32, expected: U32): boolean =>
  loadU8(memory, at + index) === expected;

const keyLength3 = (memory: ThistleMemory, at: Ptr): U32 => {
  if (byte(memory, at, 0, 0x76) && byte(memory, at, 1, 0x65) && byte(memory, at, 2, 0x72)) return K_VER;
  if (byte(memory, at, 0, 0x73) && byte(memory, at, 1, 0x65) && byte(memory, at, 2, 0x63)) return K_SEC;
  if (byte(memory, at, 0, 0x73) && byte(memory, at, 1, 0x79) && byte(memory, at, 2, 0x6d)) return K_SYM;
  if (byte(memory, at, 0, 0x72) && byte(memory, at, 1, 0x65) && byte(memory, at, 2, 0x6c)) return K_REL;
  if (byte(memory, at, 0, 0x64) && byte(memory, at, 1, 0x62) && byte(memory, at, 2, 0x67)) return K_DBG;
  if (byte(memory, at, 0, 0x6d) && byte(memory, at, 1, 0x65) && byte(memory, at, 2, 0x6d)) return K_MEM;
  if (byte(memory, at, 0, 0x69) && byte(memory, at, 1, 0x73) && byte(memory, at, 2, 0x61)) return K_ISA;
  if (byte(memory, at, 0, 0x66) && byte(memory, at, 1, 0x6c) && byte(memory, at, 2, 0x67)) return K_FLG;
  if (byte(memory, at, 0, 0x6c) && byte(memory, at, 1, 0x65) && byte(memory, at, 2, 0x6e)) return K_LEN;
  return 0;
};

const keyLength4 = (memory: ThistleMemory, at: Ptr): U32 => {
  if (byte(memory, at, 0, 0x6e) && byte(memory, at, 1, 0x61) && byte(memory, at, 2, 0x6d) && byte(memory, at, 3, 0x65)) return K_NAME;
  if (byte(memory, at, 0, 0x73) && byte(memory, at, 1, 0x69) && byte(memory, at, 2, 0x7a) && byte(memory, at, 3, 0x65)) return K_SIZE;
  if (byte(memory, at, 0, 0x61) && byte(memory, at, 1, 0x64) && byte(memory, at, 2, 0x64) && byte(memory, at, 3, 0x72)) return K_ADDR;
  if (byte(memory, at, 0, 0x70) && byte(memory, at, 1, 0x68) && byte(memory, at, 2, 0x64) && byte(memory, at, 3, 0x72)) return K_PHDR;
  return 0;
};

const keyLength5 = (memory: ThistleMemory, at: Ptr): U32 => {
  if (byte(memory, at, 0, 0x69) && byte(memory, at, 1, 0x64) && byte(memory, at, 2, 0x65) && byte(memory, at, 3, 0x6e) && byte(memory, at, 4, 0x74)) return K_IDENT;
  if (byte(memory, at, 0, 0x65) && byte(memory, at, 1, 0x6e) && byte(memory, at, 2, 0x74) && byte(memory, at, 3, 0x72) && byte(memory, at, 4, 0x79)) return K_ENTRY;
  if (byte(memory, at, 0, 0x70) && byte(memory, at, 1, 0x68) && byte(memory, at, 2, 0x65) && byte(memory, at, 3, 0x6e) && byte(memory, at, 4, 0x74)) return K_PHENT;
  if (byte(memory, at, 0, 0x70) && byte(memory, at, 1, 0x68) && byte(memory, at, 2, 0x6e) && byte(memory, at, 3, 0x75) && byte(memory, at, 4, 0x6d)) return K_PHNUM;
  if (byte(memory, at, 0, 0x61) && byte(memory, at, 1, 0x6c) && byte(memory, at, 2, 0x69) && byte(memory, at, 3, 0x67) && byte(memory, at, 4, 0x6e)) return K_ALIGN;
  return 0;
};

const keyId = (memory: ThistleMemory): U32 => {
  if (loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING_ESCAPED) !== 0) return 0;
  const at = loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING);
  const length = loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING_LENGTH);
  if (length === 2 && byte(memory, at, 0, 0x61) && byte(memory, at, 1, 0x74)) return K_AT;
  if (length === 3) return keyLength3(memory, at);
  if (length === 4) return keyLength4(memory, at);
  if (length === 5) return keyLength5(memory, at);
  if (length === 7 && byte(memory, at, 0, 0x6d) && byte(memory, at, 1, 0x61) && byte(memory, at, 2, 0x63) &&
      byte(memory, at, 3, 0x68) && byte(memory, at, 4, 0x69) && byte(memory, at, 5, 0x6e) && byte(memory, at, 6, 0x65)) return K_MACHINE;
  return 0;
};

const exactMachine = (memory: ThistleMemory): boolean => {
  if (loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING_ESCAPED) !== 0 ||
      loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING_LENGTH) !== 9) return false;
  const at = loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING);
  return byte(memory, at, 0, 0x74) && byte(memory, at, 1, 0x68) && byte(memory, at, 2, 0x69) &&
    byte(memory, at, 3, 0x73) && byte(memory, at, 4, 0x74) && byte(memory, at, 5, 0x6c) &&
    byte(memory, at, 6, 0x65) && byte(memory, at, 7, 0x36) && byte(memory, at, 8, 0x34);
};

const exactIsa = (memory: ThistleMemory): boolean => {
  if (loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING_ESCAPED) !== 0 ||
      loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING_LENGTH) !== 6) return false;
  const at = loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING);
  return byte(memory, at, 0, 0x72) && byte(memory, at, 1, 0x76) && byte(memory, at, 2, 0x36) &&
    byte(memory, at, 3, 0x34) && byte(memory, at, 4, 0x67) && byte(memory, at, 5, 0x63);
};

const parseUnsigned = (memory: ThistleMemory, at: Ptr, end: Ptr): Ptr => {
  if (at >= end || !digit(loadU8(memory, at))) return BAD;
  const first = loadU8(memory, at);
  let cursor = at;
  let value: U64 = 0n;
  while (cursor < end && digit(loadU8(memory, cursor))) {
    if (first === 0x30 && cursor !== at) return BAD;
    value = value * 10n + u32word(loadU8(memory, cursor) - 0x30);
    if (value > MAX_SAFE) return BAD;
    cursor += 1;
  }
  storeU64(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_NUMBER, value);
  return cursor;
};

const literal = (memory: ThistleMemory, at: Ptr, end: Ptr, value: U32): Ptr => {
  if (end - at < 4 || loadU32(memory, at) !== value) return BAD;
  return at + 4;
};

const skipDigits = (memory: ThistleMemory, at: Ptr, end: Ptr): Ptr => {
  let cursor = at;
  if (cursor >= end || !digit(loadU8(memory, cursor))) return BAD;
  while (cursor < end && digit(loadU8(memory, cursor))) cursor += 1;
  return cursor;
};

const skipExponent = (memory: ThistleMemory, at: Ptr, end: Ptr): Ptr => {
  let cursor = at;
  if (cursor < end && (loadU8(memory, cursor) === 0x2b || loadU8(memory, cursor) === 0x2d)) cursor += 1;
  return skipDigits(memory, cursor, end);
};

const skipNumber = (memory: ThistleMemory, at: Ptr, end: Ptr): Ptr => {
  let cursor = at;
  if (cursor < end && loadU8(memory, cursor) === 0x2d) cursor += 1;
  if (cursor >= end || !digit(loadU8(memory, cursor))) return BAD;
  if (loadU8(memory, cursor) === 0x30) cursor += 1;
  else cursor = skipDigits(memory, cursor, end);
  if (cursor < end && loadU8(memory, cursor) === 0x2e) cursor = skipDigits(memory, cursor + 1, end);
  if (cursor < end && (loadU8(memory, cursor) === 0x65 || loadU8(memory, cursor) === 0x45)) cursor = skipExponent(memory, cursor + 1, end);
  return cursor;
};

const skipArray = (memory: ThistleMemory, at: Ptr, end: Ptr, depth: U32): Ptr => {
  let cursor = space(memory, at + 1, end);
  if (cursor < end && loadU8(memory, cursor) === 0x5d) return cursor + 1;
  while (cursor < end) {
    cursor = skipValue(memory, cursor, end, depth + 1);
    if (cursor === BAD) return BAD;
    cursor = space(memory, cursor, end);
    if (cursor < end && loadU8(memory, cursor) === 0x5d) return cursor + 1;
    if (cursor >= end || loadU8(memory, cursor) !== 0x2c) return BAD;
    cursor = space(memory, cursor + 1, end);
  }
  return BAD;
};

const skipObject = (memory: ThistleMemory, at: Ptr, end: Ptr, depth: U32): Ptr => {
  let cursor = space(memory, at + 1, end);
  if (cursor < end && loadU8(memory, cursor) === 0x7d) return cursor + 1;
  while (cursor < end) {
    cursor = parseString(memory, cursor, end);
    if (cursor === BAD) return BAD;
    cursor = space(memory, cursor, end);
    if (cursor >= end || loadU8(memory, cursor) !== 0x3a) return BAD;
    cursor = skipValue(memory, cursor + 1, end, depth + 1);
    if (cursor === BAD) return BAD;
    cursor = space(memory, cursor, end);
    if (cursor < end && loadU8(memory, cursor) === 0x7d) return cursor + 1;
    if (cursor >= end || loadU8(memory, cursor) !== 0x2c) return BAD;
    cursor = space(memory, cursor + 1, end);
  }
  return BAD;
};

const skipFalse = (memory: ThistleMemory, at: Ptr, end: Ptr): Ptr => {
  if (end - at < 5 || loadU32(memory, at) !== 0x736c6166 || loadU8(memory, at + 4) !== 0x65) return BAD;
  return at + 5;
};

const skipValue = (memory: ThistleMemory, at: Ptr, end: Ptr, depth: U32): Ptr => {
  if (depth > 32) return BAD;
  const cursor = space(memory, at, end);
  if (cursor >= end) return BAD;
  const first = loadU8(memory, cursor);
  if (first === 0x22) return parseString(memory, cursor, end);
  if (first === 0x74) return literal(memory, cursor, end, 0x65757274);
  if (first === 0x66) return skipFalse(memory, cursor, end);
  if (first === 0x6e) return literal(memory, cursor, end, 0x6c6c756e);
  if (first === 0x2d || digit(first)) return skipNumber(memory, cursor, end);
  if (first === 0x5b) return skipArray(memory, cursor, end, depth);
  if (first === 0x7b) return skipObject(memory, cursor, end, depth);
  return BAD;
};

const nameHash = (memory: ThistleMemory): U32 => {
  const at = loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING);
  const length = loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING_LENGTH);
  let hash: U32 = 0x811c9dc5;
  let index: U32 = 0;
  while (index < length) {
    hash = mulU32(hash ^ loadU8(memory, at + index), 0x01000193);
    index += 1;
  }
  return hash;
};

const sectionFlags = (memory: ThistleMemory): U32 => {
  if (loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING_ESCAPED) !== 0) return 0xffffffff;
  const at = loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING);
  const length = loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING_LENGTH);
  let flags: U32 = 0;
  let index: U32 = 0;
  while (index < length) {
    const value = loadU8(memory, at + index);
    const flag = value === 0x72 ? THISTLE_SEGMENT_READ : value === 0x77 ? THISTLE_SEGMENT_WRITE : value === 0x78 ? THISTLE_SEGMENT_EXECUTE : 0;
    if (flag === 0) return 0xffffffff;
    if ((flags & flag) !== 0) return 0xffffffff;
    flags |= flag;
    index += 1;
  }
  return flags;
};

// Reject duplicate and missing section fields before mapping; payload offsets are relative to the validated image envelope.
const parseSections = (
  memory: ThistleMemory,
  hart: U32,
  at: Ptr,
  end: Ptr,
  payload: Ptr,
  payloadLength: U32,
): I32 => {
  let cursor = space(memory, at, end);
  if (cursor >= end || loadU8(memory, cursor) !== 0x5b) return THISTLE_THX_SECTION;
  cursor = space(memory, cursor + 1, end);
  if (cursor < end && loadU8(memory, cursor) === 0x5d) return THISTLE_THX_SECTION;
  while (cursor < end) {
    if (loadU8(memory, cursor) !== 0x7b) return THISTLE_THX_SECTION;
    cursor = space(memory, cursor + 1, end);
    let seen: U32 = 0;
    let hash: U32 = 0;
    let nameLength: U32 = 0;
    let flags: U32 = 0;
    let align: U64 = 0n;
    let size: U64 = 0n;
    let address: U64 = 0n;
    let offset: U64 = 0n;
    let length: U64 = 0n;
    while (cursor < end && loadU8(memory, cursor) !== 0x7d) {
      cursor = parseString(memory, cursor, end);
      if (cursor === BAD) return THISTLE_THX_SECTION;
      const key = keyId(memory);
      cursor = space(memory, cursor, end);
      if (cursor >= end || loadU8(memory, cursor) !== 0x3a) return THISTLE_THX_SECTION;
      cursor = space(memory, cursor + 1, end);
      const bit = key >= K_NAME && key <= K_LEN ? 1 << (key - K_NAME) : 0;
      if (bit !== 0 && (seen & bit) !== 0) return THISTLE_THX_SECTION;
      const stringField = key === K_NAME || key === K_FLG;
      cursor = stringField ? parseString(memory, cursor, end) : bit !== 0 ? parseUnsigned(memory, cursor, end) : skipValue(memory, cursor, end, 0);
      if (cursor === BAD) return THISTLE_THX_SECTION;
      if (key === K_NAME && loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING_ESCAPED) !== 0) return THISTLE_THX_SECTION;
      if (key === K_NAME) hash = nameHash(memory);
      if (key === K_NAME) nameLength = loadU32(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_STRING_LENGTH);
      if (key === K_FLG) flags = sectionFlags(memory);
      if (key === K_FLG && flags === 0xffffffff) return THISTLE_THX_SECTION;
      const value = loadU64(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_NUMBER);
      if (key === K_ALIGN) align = value;
      if (key === K_SIZE) size = value;
      if (key === K_ADDR) address = value;
      if (key === K_AT) offset = value;
      if (key === K_LEN) length = value;
      seen |= bit;
      cursor = space(memory, cursor, end);
      if (cursor < end && loadU8(memory, cursor) === 0x7d) break;
      if (cursor >= end || loadU8(memory, cursor) !== 0x2c) return THISTLE_THX_SECTION;
      cursor = space(memory, cursor + 1, end);
    }
    if (cursor >= end || loadU8(memory, cursor) !== 0x7d || seen !== 127 || align === 0n ||
        (align & align - 1n) !== 0n || address % align !== 0n || length > size ||
        offset > u32word(payloadLength) || length > u32word(payloadLength) - offset ||
        offset > 0xffffffffn || length > 0xffffffffn) return THISTLE_THX_SECTION;
    const result = thistleImageSegment(memory, hart, hash, nameLength, address, size, flags,
      payload + wordToU32(offset), wordToU32(length));
    if (result !== THISTLE_THX_OK) return result;
    cursor = space(memory, cursor + 1, end);
    if (cursor < end && loadU8(memory, cursor) === 0x5d) return THISTLE_THX_OK;
    if (cursor >= end || loadU8(memory, cursor) !== 0x2c) return THISTLE_THX_SECTION;
    cursor = space(memory, cursor + 1, end);
  }
  return THISTLE_THX_SECTION;
};

const validateEnvelope = (memory: ThistleMemory, image: Ptr, imageLength: U32): I32 => {
  // Check envelope bounds before reading the checksum or metadata.
  if (!thistleImageContains(memory, image, imageLength)) return THISTLE_THX_RANGE;
  if (imageLength < 16) return THISTLE_THX_LENGTH;
  if (loadU8(memory, image) !== 0x54 || loadU8(memory, image + 1) !== 0x48 ||
      loadU8(memory, image + 2) !== 0x58 || loadU8(memory, image + 3) !== 0x32) return THISTLE_THX_MAGIC;
  const headerLength = loadU32(memory, image + 4);
  const payloadLength = loadU32(memory, image + 8);
  if (headerLength > imageLength - 16 || payloadLength !== imageLength - 16 - headerLength) return THISTLE_THX_LENGTH;
  let checksum: U32 = 0x811c9dc5;
  let index: U32 = 16;
  while (index < imageLength) {
    checksum = mulU32(checksum ^ loadU8(memory, image + index), 0x01000193);
    index += 1;
  }
  if (checksum !== loadU32(memory, image + 12)) return THISTLE_THX_CHECKSUM;

  return THISTLE_THX_OK;
};

const parseHeaderValue = (memory: ThistleMemory, key: U32, at: Ptr, end: Ptr): Ptr => {
  // Required metadata fields have stricter types than arbitrary JSON extensions.
  // Preserve the public distinction between malformed JSON and invalid metadata.
  const stringField = key === K_MACHINE || key === K_ISA;
  const numericField = key === K_VER || key === K_ENTRY || key === K_MEM || key === K_PHDR || key === K_PHENT || key === K_PHNUM;
  const arrayField = key === K_SYM || key === K_REL || key === K_DBG || key === K_IDENT;
  if (arrayField && (at >= end || loadU8(memory, at) !== 0x5b)) return BAD_METADATA;
  const cursor = stringField ? parseString(memory, at, end) : numericField ? parseUnsigned(memory, at, end) : skipValue(memory, at, end, 0);
  if (cursor === BAD) return stringField || numericField ? BAD_METADATA : BAD;
  if (key === K_MACHINE && !exactMachine(memory) || key === K_ISA && !exactIsa(memory)) return BAD_METADATA;
  const value = loadU64(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_NUMBER);
  if (key === K_VER && value !== 2n) return BAD_METADATA;
  if ((key === K_PHENT || key === K_PHNUM) && value > 0xffffffffn) return BAD_METADATA;
  return cursor;
};

const validateHeader = (memory: ThistleMemory, header: Ptr, end: Ptr): I32 => {
  // Field IDs are contiguous so a bit records each required field; duplicates are rejected.
  let cursor = space(memory, header, end);
  if (cursor >= end || loadU8(memory, cursor) !== 0x7b) return THISTLE_THX_JSON;
  cursor = space(memory, cursor + 1, end);
  let seen: U32 = 0;
  while (cursor < end && loadU8(memory, cursor) !== 0x7d) {
    cursor = parseString(memory, cursor, end);
    if (cursor === BAD) return THISTLE_THX_JSON;
    const key = keyId(memory);
    cursor = space(memory, cursor, end);
    if (cursor >= end || loadU8(memory, cursor) !== 0x3a) return THISTLE_THX_JSON;
    cursor = space(memory, cursor + 1, end);
    const bit = key >= K_MACHINE && key <= K_PHNUM ? 1 << (key - K_MACHINE) : 0;
    if (bit !== 0 && (seen & bit) !== 0) return THISTLE_THX_METADATA;
    cursor = parseHeaderValue(memory, key, cursor, end);
    if (cursor === BAD) return THISTLE_THX_JSON;
    if (cursor === BAD_METADATA) return THISTLE_THX_METADATA;
    seen |= bit;
    cursor = space(memory, cursor, end);
    if (cursor < end && loadU8(memory, cursor) === 0x7d) break;
    if (cursor >= end || loadU8(memory, cursor) !== 0x2c) return THISTLE_THX_JSON;
    cursor = space(memory, cursor + 1, end);
  }
  if (cursor >= end || loadU8(memory, cursor) !== 0x7d ||
      space(memory, cursor + 1, end) !== end || (seen & 1023) !== 1023) return THISTLE_THX_METADATA;
  return THISTLE_THX_OK;
};

const headerValue = (memory: ThistleMemory, header: Ptr, end: Ptr, wanted: U32): U64 => {
  // Only called after full header validation. Keep the native loader allocation-free;
  // numeric fields default to zero and the section field returns its value offset.
  let cursor = space(memory, space(memory, header, end) + 1, end);
  while (cursor < end && loadU8(memory, cursor) !== 0x7d) {
    cursor = parseString(memory, cursor, end);
    const key = keyId(memory);
    cursor = space(memory, space(memory, cursor, end) + 1, end);
    if (key === wanted && key === K_SEC) return u32word(cursor);
    cursor = parseHeaderValue(memory, key, cursor, end);
    if (key === wanted) return loadU64(memory, THISTLE_PARSER_BASE + THISTLE_PARSER_NUMBER);
    cursor = space(memory, cursor, end);
    if (cursor >= end || loadU8(memory, cursor) === 0x7d) break;
    cursor = space(memory, cursor + 1, end);
  }
  return 0n;
};

export const thistleLoadThx = (memory: ThistleMemory, hart: U32, image: Ptr, imageLength: U32): I32 => {
  const status = validateEnvelope(memory, image, imageLength);
  if (status !== THISTLE_THX_OK) return status;
  const header = image + 16;
  const end = header + loadU32(memory, image + 4);
  const payloadLength = loadU32(memory, image + 8);
  const metadata = validateHeader(memory, header, end);
  if (metadata !== THISTLE_THX_OK) return metadata;
  const entry = headerValue(memory, header, end, K_ENTRY);
  const top = headerValue(memory, header, end, K_MEM);
  const phdr = headerValue(memory, header, end, K_PHDR);
  const phent = wordToU32(headerValue(memory, header, end, K_PHENT));
  const phnum = wordToU32(headerValue(memory, header, end, K_PHNUM));
  const sectionAt = wordToU32(headerValue(memory, header, end, K_SEC));
  let result = thistleImageBegin(memory, hart, top, entry, phdr, phent, phnum);
  if (result !== THISTLE_THX_OK) return result;
  result = parseSections(memory, hart, sectionAt, end, end, payloadLength);
  if (result !== THISTLE_THX_OK) return result;
  return thistleImageFinish(memory, hart, imageLength);
};
