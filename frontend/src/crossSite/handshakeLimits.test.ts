/**
 * The #env= handshake is anyone's to write, so:
 * - it is kept per tab (sessionStorage), so two tabs opened from two projects keep their own;
 * - its Back link is offered only to the platform's own origins (VITE_BACK_ORIGINS, default the stack's
 *   http://localhost and http://localhost:8100), not any http(s) address;
 * - a handshake that claims to last more than an hour is refused.
 */
import { getBackUrl, getHandshake, startCrossSiteSession, STORAGE_KEY } from "./connect";

const HOUR = 60 * 60 * 1000;

function open(payload: object) {
  window.history.replaceState(null, "", "/catalogue#env=" + btoa(JSON.stringify(payload)));
  startCrossSiteSession();
}

describe("handshake limits", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("keeps the handshake in this tab only", () => {
    open({ url: "http://localhost", expires: Date.now() + HOUR - 1000 });
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getHandshake()?.url).toBe("http://localhost");
  });

  it("offers Back only to the platform's own origins", () => {
    open({ url: "http://localhost", expires: Date.now() + HOUR - 1000, back: "http://localhost:8100/p/mcas" });
    expect(getBackUrl()).toBe("http://localhost:8100/p/mcas");
    open({ url: "http://localhost", expires: Date.now() + HOUR - 1000, back: "https://evil.example/p/mcas" });
    expect(getBackUrl()).toBeNull();
  });

  it("refuses a handshake that claims to last more than an hour", () => {
    open({ url: "http://localhost", expires: Date.now() + 10 * HOUR });
    expect(getHandshake()).toBeNull();
  });

  it("takes an hour (the launcher's) and refuses 62 minutes: the cap is 61", () => {
    open({ url: "http://localhost", expires: Date.now() + HOUR });
    expect(getHandshake()).not.toBeNull();
    sessionStorage.clear();
    open({ url: "http://localhost", expires: Date.now() + 62 * 60 * 1000 });
    expect(getHandshake()).toBeNull();
  });

  it("offers Back to the page's own origin, the launcher's, on any host (no build setting needed)", () => {
    const own = `${window.location.origin}/p/mcas`;
    expect(window.location.origin).not.toBe("http://localhost");
    open({ url: "http://localhost", expires: Date.now() + HOUR - 1000, back: own });
    expect(getBackUrl()).toBe(own);
  });
});
