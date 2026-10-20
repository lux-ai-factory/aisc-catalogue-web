/** The page's shell: named as the header names the app, and linking no file the build does not have. */
import { describe, expect, it } from "vitest";
import html from "../index.html?raw";

// what the build serves besides the app, by path ("img/x.png")
const publicFiles = Object.keys(import.meta.glob("../public/**/*")).map((p) => p.replace("../public/", ""));

describe("index.html", () => {
  it("names the app as the header does", () => {
    expect(html).toContain("<title>AI Assessment Sandbox Configurator: project catalogue</title>");
    expect(html).toContain('content="AI Assessment Sandbox Configurator: project catalogue"');
    expect(html).not.toContain("AI Factory Sandbox Configurator");
  });

  it("links only files that are in public/", () => {
    const links = Array.from(html.matchAll(/<link [^>]*href="([^"]+)"/g), (m) => m[1]);
    expect(publicFiles.length).toBeGreaterThan(0);      // it really read public/
    for (const href of links) {
      expect(publicFiles).toContain(href.replace(/^\//, ""));
    }
  });
});
