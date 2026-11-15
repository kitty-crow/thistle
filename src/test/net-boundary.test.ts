import assert from "node:assert/strict";
import { test } from "node:test";
import { KErr } from "../core/err.js";
import { Net, NetDev, MissingNetworkDevice } from "../net/net.js";
import { FetchDev, hostNet } from "../net/host-fetch.js";
import type { DReq, DRes } from "../net/net.js";

class StaticDevice extends NetDev {
  requests: DReq[] = [];
  override async req(request: DReq, _signal: AbortSignal): Promise<DRes> {
    this.requests.push(request);
    return {
      url: request.url,
      status: 200,
      text: "OK",
      hdr: { "content-type": "text/plain" },
      body: new Uint8Array([42]),
    };
  }
}

test("Thistle native kernel requires explicit network capability", async () => {
  const net = new Net();
  assert.ok(net.dev instanceof MissingNetworkDevice);
  await assert.rejects(net.req({ url: "https://example.test/" }),
    (e: unknown) => e instanceof KErr && e.code === "ENETUNREACH");
});

test("Thistle policy delegates to the supplied host networking device", async () => {
  const dev = new StaticDevice();
  const net = new Net(dev);
  const result = await net.req({ url: "https://example.test/a", method: "GET" });
  assert.equal(result.status, 200);
  assert.deepEqual([...result.body], [42]);
  assert.equal(dev.requests.length, 1);
  assert.equal(dev.requests[0]?.method, "GET");
  assert.equal(net.rx, 1);
  assert.equal(net.calls, 1);
});

test("direct TypeScript host wiring retains FetchDev transport", () => {
  assert.ok(hostNet().dev instanceof FetchDev);
});
