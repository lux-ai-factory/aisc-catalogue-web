import { describe, it, expect } from "vitest";
import { entryKind, providerName } from "./entry";
import type { Tag, Tool } from "../../services/catalogueApi";

const typeTag = (slug: string) => ({ id: 1, slug, label: slug, section: "type" }) as Tag;
const entry = (types: string[], questions = 0) =>
  ({
    tags: [...types.map(typeTag), { id: 2, slug: "fairness", label: "Fairness", section: "dimension" } as Tag],
    questions: Array.from({ length: questions }, (_, i) => ({ id: i })),
  }) as unknown as Tool;

describe("entryKind", () => {
  it.each([
    [["control"], 0, "controls"],
    [["framework"], 0, "controls"],
    [["test-framework"], 0, "tests"],
    [["testing-tool"], 0, "tests"],
    [["benchmark"], 0, "tests"],
    [["test"], 3, "tests"],
    [[], 2, "controls"],
    [[], 0, null],
    [["other"], 0, null],
    [["control", "benchmark"], 0, null],
  ] as [string[], number, string | null][])("type tags %j with %i questions: %s", (types, questions, kind) => {
    expect(entryKind(entry(types, questions))).toBe(kind);
  });

  it("reads only the type section", () => {
    const tool = { tags: [{ id: 1, slug: "control", label: "c", section: "dimension" }] } as unknown as Tool;
    expect(entryKind(tool)).toBeNull();
  });
});

describe("providerName", () => {
  it.each([
    [{ provider: "IBM Research" }, "IBM Research"],
    [{ provider: " Provider " }, null],
    [{ provider: "" }, null],
    [null, null],
  ])("%j: %s", (metadata, name) => {
    expect(providerName(metadata as Tool["metadata"])).toBe(name);
  });
});
