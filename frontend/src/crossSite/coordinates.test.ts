import { describe, it, expect } from "vitest";
import { installCoordinates } from "./coordinates";

// What the catalogue must hand the engine is the distribution and a version
// that exists on the index. A tool's own slug and version are neither: LangBiTe
// v1.1.1 is the tool, aisc-plugin-langbite 0.1.2 is the package that wraps it.
// The slug travels alongside them, not as a coordinate but as the identity of
// the catalogue entry the install came from, so the engine can map back to it.
describe("installCoordinates", () => {
  it("uses the resolved distribution and version", () => {
    expect(
      installCoordinates({
        slug: "langbite",
        package_name: "aisc-plugin-langbite",
        version: "0.1.2",
        index_url: "http://devpi:3141/root/public/+simple/",
        installable: true,
        reason: null,
      })
    ).toEqual({
      pkg: "aisc-plugin-langbite",
      version: "0.1.2",
      slug: "langbite",
    });
  });

  it("keeps the slug of the entry, not of the distribution", () => {
    // Two entries may wrap the same distribution, and a distribution can be
    // renamed, so the slug is carried verbatim rather than derived.
    expect(
      installCoordinates({
        slug: "langbite-fr",
        package_name: "aisc-plugin-langbite",
        version: "0.1.2",
        index_url: "x",
        installable: true,
        reason: null,
      })?.slug
    ).toBe("langbite-fr");
  });

  it("offers nothing when the index has no such distribution", () => {
    expect(
      installCoordinates({
        slug: "deepeval",
        package_name: "deepeval",
        version: null,
        index_url: "http://devpi:3141/root/public/+simple/",
        installable: false,
        reason: "deepeval is not on the index",
      })
    ).toBeNull();
  });

  it("offers nothing when there is no answer yet", () => {
    expect(installCoordinates(null)).toBeNull();
    expect(installCoordinates(undefined)).toBeNull();
  });

  it("never falls back to a slug or a tool version", () => {
    // Installable with a missing version is incoherent: refuse rather than guess.
    expect(
      installCoordinates({
        slug: "langbite",
        package_name: "aisc-plugin-langbite",
        version: null,
        index_url: "x",
        installable: true,
        reason: null,
      })
    ).toBeNull();
  });
});
