// The catalogue's writes go to the AISC platform on the page's own origin. The platform checks no
// X-CSRFToken header (its cross-site protection is the sign-in cookie's SameSite=lax and JSON bodies),
// and a same-origin request sends the cookie without withCredentials. So a write carries neither, and
// its address is relative. Real axios, with an adapter that records what would be sent.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import axios, { type InternalAxiosRequestConfig } from "axios";
import { installTest } from "./catalogueApi";
import { updateFromPublic } from "./projectCatalogue";

let sent: InternalAxiosRequestConfig[] = [];
const original = axios.defaults.adapter;

beforeEach(() => {
  sent = [];
  sessionStorage.clear();
  window.history.replaceState(null, "", "/catalogue?project=acme");
  document.cookie = "csrftoken=leftover-from-another-app; path=/";
  axios.defaults.adapter = async (config) => {
    sent.push(config);
    return { data: {}, status: 200, statusText: "OK", headers: {}, config };
  };
});

afterEach(() => {
  axios.defaults.adapter = original;
  document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

describe("writes to the platform", () => {
  it.each([
    ["installing a test", () => installTest("langbite"), "/api/projects/acme/catalogue/api/tool/langbite/install"],
    ["updating from public", () => updateFromPublic(), "/api/projects/acme/catalogue/update"],
  ])("%s carries no X-CSRFToken, no withCredentials, and a relative address", async (_name, call, url) => {
    await call();
    expect(sent).toHaveLength(1);
    const [config] = sent;
    expect(config.method).toBe("post");
    expect(config.url).toBe(url);
    expect(config.headers.has("X-CSRFToken")).toBe(false);
    expect(config.withCredentials).toBeFalsy();
  });
});
