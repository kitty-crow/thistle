/** Browser/Node host implementation. Not part of the compiled Thistle kernel. */
import { KErr } from "../core/err.js";
import { Net, NetDev } from "./net.js";
import type { DReq, DRes, Hdr } from "./net.js";

const hdrs = (h: Headers): Hdr => {
  const out: Hdr = {};
  h.forEach((v, k) => { out[k.toLowerCase()] = v; });
  return out;
};

const bytes = async (r: Response, max: number): Promise<Uint8Array> => {
  if (!r.body) return new Uint8Array();
  const q: Uint8Array[] = [];
  const rd = r.body.getReader();
  let n = 0;
  try {
    for (;;) {
      const x = await rd.read();
      if (x.done) break;
      n += x.value.length;
      if (n > max) throw new KErr("EFBIG", `response exceeds ${max} bytes`);
      q.push(x.value);
    }
  } finally { rd.releaseLock(); }
  const b = new Uint8Array(n);
  let at = 0;
  for (const x of q) { b.set(x, at); at += x.length; }
  return b;
};

export class FetchDev extends NetDev {
  override async req(r: DReq, sig: AbortSignal): Promise<DRes> {
    const init: RequestInit = { method: r.method, headers: r.hdr, redirect: "manual", signal: sig };
    if (r.body && r.method !== "GET" && r.method !== "HEAD") init.body = Uint8Array.from(r.body);
    let x: Response;
    try { x = await fetch(r.url, init); }
    catch (e) { throw this.fail(e); }
    return { url: x.url || r.url, status: x.status, text: x.statusText, hdr: hdrs(x.headers), body: await bytes(x, r.max) };
  }

  private fail(e: unknown): KErr {
    if (e instanceof KErr) return e;
    if (e instanceof DOMException && e.name === "AbortError") return new KErr("EINTR", "network request interrupted");
    return new KErr("ENETUNREACH", e instanceof Error ? e.message : String(e));
  }
}

/** Explicitly equip a direct TypeScript Thistle instance with host networking. */
export const hostNet = (): Net => new Net(new FetchDev());
