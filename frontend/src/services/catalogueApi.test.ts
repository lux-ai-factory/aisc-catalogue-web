import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios");

import {
  fetchToolsDetailed,
  fetchTags,
  fetchMetrics,
  fetchInstallInfo,
  installTest,
} from "./catalogueApi";

const mockedAxios = axios as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

const openAt = (search: string) =>
  window.history.replaceState(null, "", `/catalogue${search}`);

// Every read call and the URL it must use, given a base.
const calls: [string, () => Promise<unknown>, (base: string) => string][] = [
  ["fetchToolsDetailed", () => fetchToolsDetailed(), (b) => `${b}/tool/`],
  ["fetchTags", () => fetchTags(), (b) => `${b}/tags/`],
  ["fetchMetrics", () => fetchMetrics(), (b) => `${b}/metric/`],
  ["fetchInstallInfo", () => fetchInstallInfo("ex"), (b) => `${b}/tool/ex/install-info`],
];

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mockedAxios.get.mockResolvedValue({ data: [] });
  openAt("");
});

describe("catalogue API base", () => {
  it.each(calls)("%s uses the project's catalogue base", async (_n, call, url) => {
    openAt("?project=acme");
    await call();
    expect(mockedAxios.get.mock.calls[0][0]).toBe(url("/api/projects/acme/catalogue/api"));
  });

  it.each(calls)("%s asks nothing without a project", async (_n, call) => {
    await expect(call()).rejects.toThrow("No project");
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("computes the base on each call, not once at import", async () => {
    openAt("?project=first");
    await fetchTags();
    openAt("?project=second");
    await fetchTags();
    expect(mockedAxios.get.mock.calls[0][0]).toBe("/api/projects/first/catalogue/api/tags/");
    expect(mockedAxios.get.mock.calls[1][0]).toBe("/api/projects/second/catalogue/api/tags/");
  });
});

describe("a slug is one path segment", () => {
  // A slug with "/" or ".." must not move the request to another platform route: an install is a POST
  // with the admin's sign-in.
  beforeEach(() => {
    openAt("?project=acme");
    mockedAxios.get = vi.fn().mockResolvedValue({ data: {} });
    mockedAxios.post = vi.fn().mockResolvedValue({ data: {} });
  });

  it("installTest encodes it", async () => {
    await installTest("../../projects/x");
    const url: string = mockedAxios.post.mock.calls[0][0];
    expect(url).toBe("/api/projects/acme/catalogue/api/tool/..%2F..%2Fprojects%2Fx/install");
  });

  it("installTest waits up to 11 minutes, as the platform may download and build for about 10", async () => {
    await installTest("langbite");
    expect(mockedAxios.post.mock.calls[0][2]).toEqual({ timeout: 660000 });
  });

  it("fetchInstallInfo encodes it", async () => {
    await fetchInstallInfo("a/b");
    const url: string = mockedAxios.get.mock.calls[0][0];
    expect(url.endsWith("/tool/a%2Fb/install-info")).toBe(true);
  });
});
