import { describe, it, expect } from "vitest";
import { entryKind, isLocalTest, providerName, requirementsOf, REQUIREMENTS } from "./entry";
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

describe("isLocalTest", () => {
  const local = { id: 1, slug: "source-local", label: "Local", section: "source" } as Tag;
  const other = { id: 2, slug: "aesia", label: "AESIA", section: "source" } as Tag;
  const make = (tags: Tag[], package_name: string | null = "my-probe") =>
    ({ tags, package_name, questions: [] }) as unknown as Tool;

  it("is a test of the stack, sourced Local, with its package", () => {
    expect(isLocalTest(make([local, typeTag("test")]))).toBe(true);
    expect(isLocalTest(make([local]))).toBe(true);
  });

  it("is not an entry from another source, a local control, or one with no package", () => {
    expect(isLocalTest(make([other, typeTag("test")]))).toBe(false);
    expect(isLocalTest(make([local, typeTag("control")]))).toBe(false);
    expect(isLocalTest(make([local, typeTag("test")], null))).toBe(false);
    expect(isLocalTest(make([local, typeTag("test")], ""))).toBe(false);
  });
});

describe("requirementsOf", () => {
  const dim = (slug: string) => ({ id: 1, slug, label: slug, section: "dimension" }) as Tag;

  it("names REQ1 to REQ11 in order", () => {
    expect(REQUIREMENTS.map((r) => r.id)).toEqual(Array.from({ length: 11 }, (_, i) => `REQ${i + 1}`));
  });

  it("gives the REQ ids of an entry's dimension tags, in REQ order", () => {
    const tags = [dim("record-keeping"), dim("diversity-non-discrimination-fairness"), typeTag("transparency")];
    expect(requirementsOf(tags)).toEqual(["REQ5", "REQ11"]);
  });
});
