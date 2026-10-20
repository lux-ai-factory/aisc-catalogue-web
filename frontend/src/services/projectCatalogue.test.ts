import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios");

import {
  projectSlug,
  projectBase,
  catalogueBase,
  fetchProjectCatalogue,
  updateFromPublic,
  fetchProjectDimensions,
} from "./projectCatalogue";

const mockedAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const openAt = (search: string) =>
  window.history.replaceState(null, "", `/catalogue${search}`);

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  openAt("");
});

describe("projectSlug", () => {
  it("reads a valid ?project=<slug>", () => {
    openAt("?project=acme-bank-2");
    expect(projectSlug()).toBe("acme-bank-2");
  });

  it("rejects a slug that does not match the pattern", () => {
    for (const bad of ["Acme", "-acme", "../x", "a_b", "a".repeat(65), ""]) {
      openAt(`?project=${encodeURIComponent(bad)}`);
      expect(projectSlug()).toBeNull();
    }
  });

  it("takes a 64-character slug, the platform's longest (projects.py SLUG_MAX)", () => {
    openAt(`?project=${"a".repeat(64)}`);
    expect(projectSlug()).toBe("a".repeat(64));
  });

  it("remembers the slug for the session, so another page keeps it", () => {
    openAt("?project=acme");
    projectSlug();
    openAt("");
    window.history.replaceState(null, "", "/metrics");
    expect(projectSlug()).toBe("acme");
  });

  it("does not fall back to the remembered slug when the URL carries a bad one", () => {
    openAt("?project=acme");
    projectSlug();
    openAt("?project=BAD");
    expect(projectSlug()).toBeNull();
  });

  it("returns null when nothing is known", () => {
    expect(projectSlug()).toBeNull();
  });

  it("still works when sessionStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const spySet = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    openAt("?project=acme");
    expect(projectSlug()).toBe("acme");
    openAt("");
    expect(projectSlug()).toBeNull();
    spy.mockRestore();
    spySet.mockRestore();
  });
});

describe("bases", () => {
  it("builds the project and catalogue bases", () => {
    expect(projectBase("acme")).toBe("/api/projects/acme/catalogue");
    expect(catalogueBase("acme")).toBe("/api/projects/acme/catalogue/api");
  });
});

describe("platform calls", () => {
  beforeEach(() => openAt("?project=acme"));

  it("fetchProjectCatalogue GETs the project base", async () => {
    const info = { mode: "private", chosen_at: null, updated_at: null, can_update: false };
    mockedAxios.get.mockResolvedValue({ data: info });
    await expect(fetchProjectCatalogue()).resolves.toEqual(info);
    expect(mockedAxios.get).toHaveBeenCalledWith("/api/projects/acme/catalogue");
  });

  it("updateFromPublic POSTs to the update endpoint", async () => {
    const result = { added: 1, updated: 2, unchanged: 3, removed: 0, local_kept: 4 };
    mockedAxios.post.mockResolvedValue({ data: result });
    await expect(updateFromPublic()).resolves.toEqual(result);
    expect(mockedAxios.post).toHaveBeenCalledWith("/api/projects/acme/catalogue/update");
  });

  it("fetchProjectDimensions GETs the dimensions from the catalogue base", async () => {
    mockedAxios.get.mockResolvedValue({ data: ["fairness"] });
    await expect(fetchProjectDimensions()).resolves.toEqual(["fairness"]);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "/api/projects/acme/catalogue/api/project-dimensions"
    );
  });
});

describe("slug captured at load", () => {
  // App redirects "/" to "/catalogue" and drops the query string, so the slug
  // must be remembered before that redirect.
  it("remembers ?project= as soon as the module loads", async () => {
    openAt("?project=early");
    vi.resetModules();
    await import("./projectCatalogue");
    openAt("");
    expect(sessionStorage.getItem("aisc-project-catalogue-slug")).toBe("early");
  });
});
