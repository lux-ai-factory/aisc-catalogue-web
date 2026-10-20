import { vi } from "vitest";
import {
  startCrossSiteSession,
  STORAGE_KEY,
  getHandshake,
  isPlatformAddress,
} from "./connect";

describe("connect", () => {
  beforeEach(() => {
    sessionStorage.clear();
    // each test starts on a plain address, without a fragment left by the one before
    window.history.replaceState(null, "", "/");
  });

  it("consumes a valid #env handshake and keeps it for the tab", () => {
    const payload = {
      url: "http://localhost",
      expires: Date.now() + 60_000,
    };
    window.location.hash = "#env=" + btoa(JSON.stringify(payload));

    expect(startCrossSiteSession()).toEqual(payload);
    expect(getHandshake()).toEqual(payload);
    // The token should be stripped from the URL.
    expect(window.location.hash).toBe("");
  });

  it("rejects an expired handshake", () => {
    const payload = {
      url: "http://localhost",
      expires: Date.now() - 1000,
    };
    window.location.hash = "#env=" + btoa(JSON.stringify(payload));
    expect(startCrossSiteSession()).toBeNull();
    expect(getHandshake()).toBeNull();
  });

  it("rejects a malformed handshake", () => {
    window.location.hash = "#env=not-base64-json";
    expect(startCrossSiteSession()).toBeNull();
  });

  const encode = (p: object) => "#env=" + btoa(JSON.stringify(p));

  it("keeps the controls address and project from a new handshake", () => {
    const payload = { url: "http://localhost", expires: Date.now() + 60_000,
                      controls: "http://localhost/controls",
                      project: "0b8e7d3c-1f2a-4b5c-9d6e-7f8a9b0c1d2e" };
    window.history.replaceState(null, "", "/" + encode(payload));
    expect(startCrossSiteSession()).toEqual(payload);
    expect(getHandshake()).toEqual(payload);
  });

  it("still accepts an old handshake with only url and expires", () => {
    const payload = { url: "http://localhost", expires: Date.now() + 60_000 };
    window.history.replaceState(null, "", "/" + encode(payload));
    expect(startCrossSiteSession()).toEqual(payload);
    expect(getHandshake()).toEqual(payload);
  });

  it("drops an expired stored handshake", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ url: "http://x", expires: Date.now() - 1 }));
    expect(getHandshake()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("ignores a handshake whose url is not on the platform: installs never open another site", () => {
    const payload = { url: "https://evil.example", expires: Date.now() + 60_000 };
    window.history.replaceState(null, "", "/" + encode(payload));
    expect(startCrossSiteSession()).toBeNull();
    expect(getHandshake()).toBeNull();
  });

  it("ignores a handshake whose url is not an http(s) address", () => {
    const payload = { url: "javascript:alert(1)//", expires: Date.now() + 60_000 };
    window.history.replaceState(null, "", "/" + encode(payload));
    expect(startCrossSiteSession()).toBeNull();
    expect(getHandshake()).toBeNull();
  });

  it("drops a back address that is not http(s)", () => {
    const payload = { url: "http://localhost", expires: Date.now() + 60_000, back: "javascript:alert(1)" };
    window.history.replaceState(null, "", "/" + encode(payload));
    startCrossSiteSession();
    expect(getHandshake()).toEqual({ url: "http://localhost", expires: payload.expires });
  });
});

describe("isPlatformAddress", () => {
  it.each([
    [`${window.location.origin}/p/mcas`, true, "the page's own origin"],
    ["http://localhost", true, "a default BACK_ORIGINS"],
    ["http://localhost:8100/p/mcas", true, "the other default BACK_ORIGINS"],
    ["http://localhost.evil.example/p", false, "a host that starts like localhost"],
    ["http://localhost:8100@evil.example/p", false, "localhost:8100 as the user part of another host"],
    ["http://localhost:8101/p", false, "another port"],
    ["https://localhost/p", false, "another scheme"],
    ["javascript:alert(1)", false, "not http(s)"],
  ])("%s: %s (%s)", (url, ok) => {
    expect(isPlatformAddress(url)).toBe(ok);
  });
});

describe("handshake captured at load", () => {
  // App redirects "/" to "/catalogue" and drops the fragment, so the handshake
  // must be read before that redirect: when this module loads.
  it("keeps a #env= handshake and strips it as soon as the module loads", async () => {
    sessionStorage.clear();
    const payload = { url: "http://localhost", expires: Date.now() + 60_000 };
    window.history.replaceState(null, "", "/#env=" + btoa(JSON.stringify(payload)));
    vi.resetModules();
    const fresh = await import("./connect");
    expect(window.location.hash).toBe("");
    expect(JSON.parse(sessionStorage.getItem(fresh.STORAGE_KEY) ?? "null")).toEqual(payload);
  });
});
