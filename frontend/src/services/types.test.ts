/** The shapes the pages read from the catalogue and the platform declare no field the pages never read. */
import { describe, expect, it } from "vitest";
import catalogueApi from "./catalogueApi.ts?raw";
import projectCatalogue from "./projectCatalogue.ts?raw";

/** The top-level field names of one exported interface in a source file. */
function fieldsOf(source: string, name: string): string[] {
  const start = source.indexOf(`export interface ${name} {`);
  if (start < 0) throw new Error(`no interface ${name}`);
  const body = source.slice(start, source.indexOf("\n}", start));
  return Array.from(body.matchAll(/^ {2}(\w+)\??:/gm), (m) => m[1]);
}

const sources = { catalogueApi, projectCatalogue };

describe("fields nothing reads are not declared", () => {
  it.each([
    ["catalogueApi", "Metadata", "tool_1_id"],
    ["catalogueApi", "Tool", "created_at"],
    ["catalogueApi", "Metric", "tool_id"],
    ["catalogueApi", "Question", "tool_id"],
    ["catalogueApi", "InstallInfo", "index_url"],
    ["catalogueApi", "InstallInfo", "source"],
  ] as const)("%s: %s has no %s", (file, name, field) => {
    expect(fieldsOf(sources[file], name)).not.toContain(field);
  });

  it("reads the fields that are there", () => {
    expect(fieldsOf(catalogueApi, "Tool")).toContain("slug");
    expect(fieldsOf(projectCatalogue, "ProjectCatalogueInfo")).toContain("can_update");
  });
});
