import { KErr } from "../core/err.js";

const te = new TextEncoder();
const td = new TextDecoder();

export const enc = (s: string): Uint8Array => te.encode(s);
export const dec = (b: Uint8Array): string => td.decode(b);

/** Ordinary endpoints do not retain resources; a Pipe overrides reference hooks. */
export abstract class Stream {
  readonly tty: object | null = null;
  holdR(): void { /* Ordinary input has no reference count. */ }
  releaseR(): void { /* Ordinary input has no reference count. */ }
  hold(): void { /* Ordinary output has no reference count. */ }
  close(): void { /* No owned resource to close. */ }
  cancel(): void { /* No pending resource to cancel. */ }
}

export interface In extends Stream {
  rd(): Promise<Uint8Array>;
}

export interface Out extends Stream {
  wr(b: Uint8Array): Promise<number>;
}

export class MemIn extends Stream implements In {
  private hit = false;

  constructor(private readonly b: Uint8Array<ArrayBufferLike> = new Uint8Array()) { super(); }

  async rd(): Promise<Uint8Array> {
    if (this.hit) return new Uint8Array();
    this.hit = true;
    return this.b.slice();
  }
}

export class MemOut extends Stream implements Out {
  private readonly q: Uint8Array[] = [];

  async wr(b: Uint8Array): Promise<number> {
    this.q.push(b.slice());
    return b.length;
  }

  bytes(): Uint8Array {
    const n = this.q.reduce((a, b) => a + b.length, 0);
    const out = new Uint8Array(n);
    let p = 0;
    for (const b of this.q) {
      out.set(b, p);
      p += b.length;
    }
    return out;
  }

  text(): string { return dec(this.bytes()); }
  clear(): void { this.q.length = 0; }
}

export class FnOut extends Stream implements Out {
  constructor(private readonly fn: (s: string) => void | Promise<void>) { super(); }

  async wr(b: Uint8Array): Promise<number> {
    await this.fn(dec(b));
    return b.length;
  }
}

export class Pipe extends Stream implements In, Out {
  private readonly q: Uint8Array[] = [];
  private readonly w: Array<(b: Uint8Array) => void> = [];
  private shut = false;
  private refs = 0;
  private rrefs = 0;

  override hold(): void { this.refs++; }
  override holdR(): void { this.rrefs++; }

  async wr(b: Uint8Array): Promise<number> {
    if (this.shut) throw new KErr("EPIPE", "pipe is closed");
    if (!b.length) return 0;
    const x = b.slice();
    const fn = this.w.shift() ?? null;
    if (fn) fn(x);
    else this.q.push(x);
    return x.length;
  }

  async rd(): Promise<Uint8Array> {
    const b = this.q.shift() ?? null;
    if (b) return b;
    if (this.shut) return new Uint8Array();
    return new Promise<Uint8Array>(ok => this.w.push(ok));
  }

  override close(): void {
    if (this.refs > 0 && --this.refs > 0) return;
    this.end();
  }

  override cancel(): void { this.end(); }

  override releaseR(): void {
    if (this.rrefs > 0 && --this.rrefs > 0) return;
    this.end();
  }

  private end(): void {
    if (this.shut) return;
    this.shut = true;
    for (const ok of this.w.splice(0)) ok(new Uint8Array());
  }
}

export class TeeOut extends Stream implements Out {
  constructor(private readonly a: Out, private readonly b: Out) { super(); }

  async wr(x: Uint8Array): Promise<number> {
    await Promise.all([this.a.wr(x), this.b.wr(x)]);
    return x.length;
  }
}
