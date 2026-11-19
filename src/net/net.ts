import { KErr, bad } from "../core/err.js";

export type Hdr = Record<string, string>;

export interface NReq {
  url: string;
  method: string;
  hdr: Hdr;
  body: Uint8Array | null;
  redirs: number;
  timeout: number;
  max: number;
}

/** Construct a request with the standard limits, then override explicit fields. */
export const netRequest = (url: string): NReq => ({
  url, method: "GET", hdr: {}, body: null, redirs: 10, timeout: 30_000, max: 12 * 1024 * 1024,
});

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
  body: Uint8Array | null;
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

  async req(r: NReq, parent: AbortSignal | null = null): Promise<NRes> {
    // A single deadline covers the full redirect chain. Redirects must revalidate their destination and may change POST to GET.
    const method = (r.method ?? "GET").toUpperCase();
    if (!/^[A-Z]+$/.test(method)) bad("EINVAL", `bad HTTP method: ${method}`);
    const max = r.max ?? 12 * 1024 * 1024;
    const redirs = r.redirs ?? 10;
    const timeout = r.timeout ?? 30_000;
    if (!Number.isInteger(max) || max < 0 || !Number.isInteger(redirs) || redirs < 0 || !Number.isFinite(timeout) || timeout <= 0) bad("EINVAL", "bad network limit");

    const ac = new AbortController();
    const stop = (): void => ac.abort(new KErr("EINTR", "network request interrupted"));
    if (parent !== null && parent.aborted) stop();
    if (parent !== null) parent.addEventListener("abort", stop, { once: true });
    const id = setTimeout(() => ac.abort(new KErr("ETIMEDOUT", r.url)), timeout);
    let url = this.url(r.url);
    let verb = method;
    let body = r.body ?? null;
    const hops: string[] = [];
    try {
      for (let n = 0;; n++) {
        this.calls++;
        this.tx += body === null ? 0 : body.length;
        this.log(`net: ${verb} ${url}`);
        const q: DReq = { url, method: verb, hdr: { "user-agent": "Thistle/2.2.0", ...(r.hdr ?? {}) }, max, body };
        const x = await this.dev.req(q, ac.signal);
        this.rx += x.body.length;
        const location = x.hdr.location ?? null;
        if (!moved.has(x.status) || !location) return { ...x, hops };
        if (n >= redirs) bad("ELOOP", `too many redirects: ${r.url}`);
        hops.push(url);
        url = this.url(new URL(location, url).href);
        if (x.status === 303 || ((x.status === 301 || x.status === 302) && verb === "POST")) { verb = "GET"; body = null; }
      }
    } catch (e) {
      this.fails++;
      if (ac.signal.aborted && parent !== null && parent.aborted) throw new KErr("EINTR", "network request interrupted");
      if (ac.signal.aborted) throw new KErr("ETIMEDOUT", r.url);
      throw e instanceof Error ? e : new KErr("EIO", typeof e === "string" ? e : "non-Error network failure");
    } finally {
      clearTimeout(id);
      if (parent !== null) parent.removeEventListener("abort", stop);
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
