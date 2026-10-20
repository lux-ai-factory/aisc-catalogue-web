import type { Metadata, Tool } from "../../services/catalogueApi";

/** The entry's provider, or null when unknown: "Provider" is the seed's
 *  placeholder for "unknown". */
export function providerName(metadata: Metadata | null | undefined): string | null {
  const raw = metadata?.provider?.trim() ?? "";
  return raw && raw !== "Provider" ? raw : null;
}

export type EntryKind = "tests" | "controls";

const TEST_WORD = /^(test|benchmark)/;
const CONTROL_WORD = /^(control|framework)/;

/** What one type tag says: a word for tests wins within a slug, so
 *  "test-framework" is a test and "framework" a control. */
function typeKind(slug: string): EntryKind | null {
  const words = slug.split("-");
  if (words.some((w) => TEST_WORD.test(w))) return "tests";
  if (words.some((w) => CONTROL_WORD.test(w))) return "controls";
  return null;
}

/**
 * Whether an entry is a test or a control, the one rule the tabs, the cards and
 * the detail pop-up follow. Its type tags decide; without one that says, a
 * questionnaire makes it a control. Null when nothing says, or its type tags
 * disagree: such an entry shows on both tabs.
 */
export function entryKind(tool: Pick<Tool, "tags" | "questions">): EntryKind | null {
  const kinds = new Set(
    (tool.tags ?? [])
      .filter((t) => t.section === "type")
      .map((t) => typeKind(t.slug))
      .filter((k): k is EntryKind => k !== null)
  );
  if (kinds.size === 1) return Array.from(kinds)[0];
  if (kinds.size === 0 && (tool.questions?.length ?? 0) > 0) return "controls";
  return null;
}
