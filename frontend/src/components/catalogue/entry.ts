import type { Metadata, Tag, Tool } from "../../services/catalogueApi";

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

/** The catalogue's source tag of the stack's own entries, the "Local" of the Source filter. */
const LOCAL_SOURCE = "source-local";

/**
 * Whether an entry is a test of this stack that no public entry names: sourced
 * Local, with its package (what its dimensions are saved under), and not a
 * control.
 */
export function isLocalTest(tool: Pick<Tool, "tags" | "questions" | "package_name">): boolean {
  const local = (tool.tags ?? []).some((t) => t.section === "source" && t.slug === LOCAL_SOURCE);
  return local && !!tool.package_name && entryKind(tool) !== "controls";
}

/** The dimensions REQ1 to REQ11, each with the catalogue's dimension tag slug
 *  (as the platform pairs them, evidence.DIMENSIONS). */
export const REQUIREMENTS: readonly { id: string; title: string; slug: string }[] = [
  { id: "REQ1", title: "Human Agency and Oversight", slug: "human-agency-oversight" },
  { id: "REQ2", title: "Technical Robustness and Safety", slug: "technical-robustness-safety" },
  { id: "REQ3", title: "Privacy and Data Governance", slug: "privacy-data-governance" },
  { id: "REQ4", title: "Transparency", slug: "transparency" },
  { id: "REQ5", title: "Diversity, Non-Discrimination and Fairness", slug: "diversity-non-discrimination-fairness" },
  { id: "REQ6", title: "Societal and Environmental Well-being", slug: "societal-environmental-wellbeing" },
  { id: "REQ7", title: "Accountability", slug: "accountability" },
  { id: "REQ8", title: "Quality Management", slug: "quality-management" },
  { id: "REQ9", title: "Risk Management", slug: "risk-management" },
  { id: "REQ10", title: "Technical Documentation", slug: "technical-documentation" },
  { id: "REQ11", title: "Record-keeping and Documentation Retention", slug: "record-keeping" },
];

/** The REQ ids of an entry's dimension tags, in REQ order. */
export function requirementsOf(tags: readonly Tag[]): string[] {
  const slugs = new Set(tags.filter((t) => t.section === "dimension").map((t) => t.slug));
  return REQUIREMENTS.filter((r) => slugs.has(r.slug)).map((r) => r.id);
}
