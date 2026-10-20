import type { Tag, TagSection } from "../../services/catalogueApi";

/** The sections of a dimension's sub-dimensions: those of tests and those of controls. */
const SUB_DIMENSION_SECTIONS: readonly TagSection[] = ["testing_subdim", "controls_subdim"];

export const isSubDimension = (t: Pick<Tag, "section">): boolean => SUB_DIMENSION_SECTIONS.includes(t.section);

/** Each sub-dimension's dimension, from the tags that say it. */
export function subDimensionParents(tags: readonly Tag[]): Map<string, string> {
  const parents = new Map<string, string>();
  for (const t of tags) {
    if (isSubDimension(t) && t.parent_dimension_slug) parents.set(t.slug, t.parent_dimension_slug);
  }
  return parents;
}

/** The dimension a tag counts for: a dimension for itself, a sub-dimension for its parent. */
function dimensionOf(t: Tag, parents: ReadonlyMap<string, string>): string | null {
  if (t.section === "dimension") return t.slug;
  if (isSubDimension(t)) return t.parent_dimension_slug ?? parents.get(t.slug) ?? null;
  return null;
}

/**
 * Whether an entry matches the chosen dimensions and sub-dimensions, the one
 * rule of the sidebar's dimension filter and of "For this project".
 *
 * Each chosen slug counts for its dimension. A dimension with none of its
 * sub-dimensions chosen matches an entry with that dimension or any of its
 * sub-dimensions; once some are chosen, it matches only an entry with one of
 * those. An entry matches when it matches any chosen dimension; nothing chosen
 * matches everything.
 */
export function matchesDimensions(
  entryTags: readonly Tag[],
  chosen: readonly string[],
  parents: ReadonlyMap<string, string>
): boolean {
  if (chosen.length === 0) return true;
  const subsByDimension = new Map<string, Set<string>>();
  for (const slug of chosen) {
    const parent = parents.get(slug);
    const dimension = parent ?? slug;
    const subs = subsByDimension.get(dimension) ?? new Set<string>();
    if (parent) subs.add(slug);
    subsByDimension.set(dimension, subs);
  }
  return Array.from(subsByDimension).some(([dimension, subs]) =>
    entryTags.some((t) =>
      subs.size > 0 ? isSubDimension(t) && subs.has(t.slug) : dimensionOf(t, parents) === dimension
    )
  );
}

/** The tags by their sort_order; tags with the same keep the order they came in. */
export function inSortOrder<T extends Pick<Tag, "sort_order">>(tags: readonly T[]): T[] {
  return tags.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export interface DimensionItem {
  label: string;
  slug: string;
  children: { label: string; slug: string }[];
}

/**
 * The sidebar's dimensions on one tab, each with the tab's sub-dimensions
 * (testing_subdim on Tests, controls_subdim on Controls), all from the
 * catalogue's tags and in their sort_order. A dimension shows on a tab when it
 * has sub-dimensions there, or has none on either tab.
 */
export function dimensionTree(tags: readonly Tag[], tab: "tests" | "controls"): DimensionItem[] {
  const section: TagSection = tab === "tests" ? "testing_subdim" : "controls_subdim";
  const subs = inSortOrder(tags.filter(isSubDimension));
  const withAnySub = new Set(subs.map((t) => t.parent_dimension_slug));
  const seen = new Set<string>();
  const items: DimensionItem[] = [];
  for (const d of inSortOrder(tags.filter((t) => t.section === "dimension"))) {
    if (seen.has(d.slug)) continue;
    seen.add(d.slug);
    const children = subs
      .filter((t) => t.section === section && t.parent_dimension_slug === d.slug)
      .map((t) => ({ label: t.label, slug: t.slug }));
    if (children.length > 0 || !withAnySub.has(d.slug)) items.push({ label: d.label, slug: d.slug, children });
  }
  return items;
}
