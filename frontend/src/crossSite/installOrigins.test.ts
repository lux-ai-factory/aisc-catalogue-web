/**
 * The engine may not be on the address the catalogue was built with (it moves off port 80 when that
 * port is taken). The launcher's site answers /origins.json with the install's current addresses, so
 * the catalogue also trusts the engine named there, and only a plain http(s) origin of it.
 */
import { vi } from "vitest";

type Connect = typeof import("./connect");

/** A fresh copy of the module, so the origins one test learns are not seen by the next. */
async function freshConnect(): Promise<Connect> {
  vi.resetModules();
  return import("./connect");
}

function answer(body: unknown, ok = true) {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok,
    json: async () => {
      if (typeof body === "string") throw new SyntaxError("not JSON");
      return body;
    },
  })));
}

describe("the install's engine address, from /origins.json", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("asks the page's own site, once", async () => {
    answer({ engine: "http://localhost:8080" });
    const c = await freshConnect();
    await c.loadInstallOrigins();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/origins.json", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("trusts the engine it names", async () => {
    answer({ engine: "http://localhost:8080", keycloak: "http://localhost:8081" });
    const c = await freshConnect();
    expect(c.isPlatformAddress("http://localhost:8080/controls")).toBe(false);
    await c.loadInstallOrigins();
    expect(c.isPlatformAddress("http://localhost:8080/controls")).toBe(true);
    // only the engine: the other addresses are not where the handshake's links go
    expect(c.isPlatformAddress("http://localhost:8081/x")).toBe(false);
  });

  it("takes the origin of an engine given with a path or a trailing slash", async () => {
    answer({ engine: "https://aisc.example.org/engine/" });
    const c = await freshConnect();
    await c.loadInstallOrigins();
    expect(c.isPlatformAddress("https://aisc.example.org/controls")).toBe(true);
  });

  it.each([
    ["a failed request", () => vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }))],
    ["an error answer", () => answer({ engine: "http://localhost:8080" }, false)],
    ["an answer that is not JSON", () => answer("<!doctype html>")],
    ["no engine", () => answer({ keycloak: "http://localhost:8080" })],
    ["an empty engine", () => answer({ engine: "" })],
    ["an engine that is not text", () => answer({ engine: 8080 })],
    ["a javascript: engine", () => answer({ engine: "javascript:alert(1)" })],
    ["an engine with a query", () => answer({ engine: "http://localhost:8080/x?y" })],
    ["an engine with a fragment", () => answer({ engine: "http://localhost:8080#x" })],
    ["an engine with a user part", () => answer({ engine: "http://localhost:8080@evil.example" })],
    ["an engine with spaces", () => answer({ engine: "http://localhost:8080 /x" })],
  ])("trusts nothing new after %s", async (_what, setUp) => {
    setUp();
    const c = await freshConnect();
    await expect(c.loadInstallOrigins()).resolves.toBeUndefined();
    expect(c.isPlatformAddress("http://localhost:8080/controls")).toBe(false);
    expect(c.isPlatformAddress("http://evil.example/")).toBe(false);
    // what was trusted before still is
    expect(c.isPlatformAddress("http://localhost/p")).toBe(true);
    expect(c.isPlatformAddress("http://localhost:8100/p")).toBe(true);
    expect(c.isPlatformAddress(`${window.location.origin}/p`)).toBe(true);
  });

  it("keeps the defaults and the page's own origin once the engine is known", async () => {
    answer({ engine: "http://localhost:8080" });
    const c = await freshConnect();
    await c.loadInstallOrigins();
    expect(c.isPlatformAddress("http://localhost/p")).toBe(true);
    expect(c.isPlatformAddress("http://localhost:8100/p")).toBe(true);
    expect(c.isPlatformAddress(`${window.location.origin}/p`)).toBe(true);
    expect(c.isPlatformAddress("http://localhost:8081/p")).toBe(false);
  });

  it("accepts the launcher's handshake from a moved engine once the origins are read", async () => {
    answer({ engine: "http://localhost:8080" });
    const payload = { url: "http://localhost:8080", expires: Date.now() + 60_000,
                      controls: "http://localhost:8080/controls", back: "http://localhost:8080/p/mcas" };
    window.history.replaceState(null, "", "/#env=" + btoa(JSON.stringify(payload)));
    const c = await freshConnect();
    // at load the engine is not known yet, so the fragment is left for after /origins.json
    expect(c.getHandshake()).toBeNull();
    await c.loadInstallOrigins();
    expect(c.startCrossSiteSession()).toEqual(payload);
    expect(c.getBackUrl()).toBe("http://localhost:8080/p/mcas");
    expect(window.location.hash).toBe("");
  });
});
