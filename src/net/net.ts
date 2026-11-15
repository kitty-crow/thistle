import { KErr, bad } from "../core/err.js";

export type Hdr = Record<string, string>;

export interface NReq {
  url: string;
  method?: string;
  hdr?: Hdr;
  body?: Uint8Array;
  redirs?: number;
  timeout?: number;
  max?: number;
}

export interface NRes {
  url: string;
  status: number;
  text: string;
  hdr: Hdr;
  body: Uint8Array;
  hops: string[];
}

export interface DReq {
  url: string;
  method: string;
  hdr: Hdr;
  body?: Uint8Array;
  max: number;
}

export interface DRes {
  url: string;
  status: number;
  text: string;
  hdr: Hdr;
  body: Uint8Array;
}

/** A network device moves one HTTP exchange. Policy lives in Net. */
export abstract class NetDev {
  abstract req(r: DReq, sig: AbortSignal): Promise<DRes>;
}

/**
 * A native kernel has no implicit browser runtime. Host applications must
 * supply a NetDev explicitly; network support cannot be inferred from fetch.
 */
export class MissingNetworkDevice extends NetDev {
  override async req(_request: DReq, _signal: AbortSignal): Promise<DRes> {
    throw new KErr("ENETUNREACH", "no network capability was supplied by the host");
  }
}

const moved = new Set([301, 302, 303, 307, 308]);

export class Net {
  rx = 0;
  tx = 0;
  calls = 0;
  fails = 0;
  log: (s: string) => void = () => {};

  constructor(readonly dev: NetDev = new MissingNetworkDevice()) {}

  async req(r: NReq, parent?: AbortSignal): Promise<NRes> {
    const method = (r.method ?? "GET").toUpperCase();
    if (!/^[A-Z]+$/.test(method)) bad("EINVAL", `bad HTTP method: ${method}`);
    const max = r.max ?? 12 * 1024 * 1024;
    const redirs = r.redirs ?? 10;
    const timeout = r.timeout ?? 30_000;
    if (!Number.isInteger(max) || max < 0 || !Number.isInteger(redirs) || redirs < 0 || !Number.isFinite(timeout) || timeout <= 0) bad("EINVAL", "bad network limit");

    const ac = new AbortController();
    const stop = (): void => ac.abort(parent?.reason);
    parent?.addEventListener("abort", stop, { once: true });
    const id = setTimeout(() => ac.abort(new KErr("ETIMEDOUT", r.url)), timeout);
    let url = this.url(r.url);
    let verb = method;
    let body = r.body;
    const hops: string[] = [];
    try {
      for (let n = 0;; n++) {
        this.calls++;
        this.tx += body?.length ?? 0;
        this.log(`net: ${verb} ${url}`);
        const q: DReq = { url, method: verb, hdr: { "user-agent": "Thistle/2.1.0", ...(r.hdr ?? {}) }, max };
        if (body !== undefined) q.body = body;
        const x = await this.dev.req(q, ac.signal);
        this.rx += x.body.length;
        if (!moved.has(x.status) || !x.hdr.location) return { ...x, hops };
        if (n >= redirs) bad("ELOOP", `too many redirects: ${r.url}`);
        hops.push(url);
        url = this.url(new URL(x.hdr.location, url).href);
        if (x.status === 303 || ((x.status === 301 || x.status === 302) && verb === "POST")) { verb = "GET"; body = undefined; }
      }
    } catch (e) {
      this.fails++;
      if (ac.signal.aborted) {
        if (parent?.aborted) throw new KErr("EINTR", "network request interrupted");
        throw new KErr("ETIMEDOUT", r.url);
      }
      throw e;
    } finally {
      clearTimeout(id);
      parent?.removeEventListener("abort", stop);
    }
  }

  private url(s: string): string {
    let u: URL;
    try { u = new URL(s); } catch { return bad("EINVAL", `bad URL: ${s}`); }
    if (u.protocol !== "http:" && u.protocol !== "https:") bad("ENOTSUP", `URL scheme: ${u.protocol}`);
    if (u.username || u.password) bad("ENOTSUP", "credentials in URLs");
    return u.href;
  }
}
