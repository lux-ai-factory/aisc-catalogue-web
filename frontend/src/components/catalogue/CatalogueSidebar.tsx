import React, { useState } from "react";
import type { Tag } from "../../services/catalogueApi";
import { dimensionTree, inSortOrder } from "./dimensions";


const LICENSE_OPTIONS = ["Open", "Closed"];


const styles = {
  sidebar: {
    width: "260px",
    minWidth: "260px",
    padding: "20px 16px",
    borderRight: "1px solid #e5e7eb",
    overflowY: "auto" as const,
    backgroundColor: "#E7EBF6",
    fontFamily: "Arial, sans-serif",
    fontSize: "13px",
    position: "relative" as const,
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 700 as const,
    color: "#1a1a2e",
    marginBottom: "10px",
    marginTop: "20px",
  },
  tabContainer: {
    display: "flex",
    gap: "4px",
    marginBottom: "16px",
  },
  tab: (active: boolean) => ({
    display: "flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600 as const,
    backgroundColor: active ? "#000FDF" : "#f1f3f5",
    color: active ? "#fff" : "#495057",
    transition: "all 0.15s ease",
  }),
  // ── Search (under the Tests/Controls tabs) ──
  searchContainer: {
    position: "relative" as const,
    marginBottom: "18px",
  },
  searchInput: {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "8px 32px 8px 14px",
    borderRadius: "28px",
    border: "1px solid #dee2e6",
    backgroundColor: "#F6F8FF",
    fontSize: "13px",
    color: "#49454F",
    outline: "none",
  },
  searchIcon: {
    position: "absolute" as const,
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none" as const,
  },
  // ── "Plugin available" toggle (below the search bar): a button, so the keyboard reaches it ──
  pluginToggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    width: "100%",
    padding: 0,
    border: "none",
    background: "none",
    fontFamily: "inherit",
    marginBottom: "8px",
    fontSize: "13px",
    fontWeight: 600 as const,
    color: "#1a1a2e",
    cursor: "pointer",
    userSelect: "none" as const,
  },
  toggleTrack: (on: boolean) => ({
    position: "relative" as const,
    width: "38px",
    height: "20px",
    flexShrink: 0,
    borderRadius: "20px",
    backgroundColor: on ? "#000FDF" : "#C5D2FF",
    transition: "background-color 0.15s ease",
  }),
  toggleKnob: (on: boolean) => ({
    position: "absolute" as const,
    top: "2px",
    left: on ? "20px" : "2px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    backgroundColor: "#fff",
    transition: "left 0.15s ease",
  }),
  trustworthinessdimensionItem: (active: boolean) => ({
    display: "inline-block",
    padding: "4px 12px",
    margin: "2px 4px 2px 0",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    // selected: the tabs' blue, white text; not selected: blue on light blue
    color: active ? "#fff" : "#000FDF",
    backgroundColor: active ? "#000FDF" : "#C5D2FF",
    border: "None",
    textAlign: "left" as const,
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease",
    lineHeight: "1.4",
  }),
  trustworthinesschildrenContainer: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
    padding: "6px 0 8px 0",
  },
  childItem: (active: boolean) => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "11px",
    color: active ? "#000FDF" : "#000FDF80",
    backgroundColor: active ? "#C5D2FF" : "#F6F8FF",
    border: "None",
    fontWeight: active ? 600 : 400,
    textAlign: "left" as const,
    whiteSpace: "nowrap" as const,
  }),
  sourcePills: (active: boolean) => ({
    display: "inline-block",
    padding: "4px 10px",
    margin: "2px 4px 2px 0",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "12px",
    border: "None",
    backgroundColor: active ? "#C5D2FF" : "#F6F8FF",
    color: active ? "#3b5bdb" : "#495057",
    fontWeight: active ? 600 : 400,
    fontFamily: "inherit",
    transition: "all 0.15s ease",
  }),
    aiSystemUnderAssesment: (active: boolean) => ({
    display: "inline-block",
    padding: "4px 12px",
    margin: "2px 4px 2px 0",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    // selected: the tabs' blue, white text; not selected: blue on light blue
    color: active ? "#fff" : "#000FDF",
    backgroundColor: active ? "#000FDF" : "#C5D2FF",
    border: "None",
    textAlign: "left" as const,
    fontWeight: active ? 600 : 400,
    fontFamily: "inherit",
    transition: "all 0.15s ease",
    lineHeight: "1.4",
  }),
    licence: (active: boolean) => ({
        display: "inline-block",
        padding: "4px 10px",
        margin: "2px 4px 2px 0",
        borderRadius: "5px",
        cursor: "pointer",
        fontSize: "12px",
        border: "None",
        backgroundColor: active ? "#000FDF" : "#C5D2FF",
        color: active ? "#fff" : "#000FDF",
        fontWeight: active ? 600 : 400,
        fontFamily: "inherit",
        transition: "all 0.15s ease",
    }),
  seeMore: {
    display: "inline-block",
    marginTop: "4px",
    fontSize: "12px",
    color: "#3b5bdb",
    cursor: "pointer",
    border: "none",
    background: "none",
    padding: "4px 0",
    fontWeight: 500 as const,
  },
  projectNote: {
    fontSize: "12px",
    color: "#6c757d",
    marginBottom: "8px",
  },
};


export type CatalogueTab = "tests" | "controls";

export interface SidebarFilters {
  tab: CatalogueTab;
  selectedDimensions: string[];
  selectedAiSystems: string[];
  selectedLicenses: string[];
  selectedSources: string[];
}

interface CatalogueSidebarProps {
  filters: SidebarFilters;
  onFiltersChange: (filters: SidebarFilters) => void;
  /** The catalogue's tags: the dimensions, sub-dimensions, AI systems and
   *  sources to filter by, with their labels and order. */
  tags?: Tag[];
  /** When true, render full-width (stacked above the cards) instead of a fixed rail. */
  isMobile?: boolean;
  /** Free-text search query (lives in the page; rendered under the tabs here). */
  searchQuery: string;
  onSearchChange: (q: string) => void;
  /** "Plugin available" filter, only show tools with a ready-to-use plugin. */
  pluginOnly: boolean;
  onPluginOnlyChange: (v: boolean) => void;
  /** Project catalogue only: keep the entries that match the project's
   *  dimensions. `noDimensions` when the project has none selected yet,
   *  `unavailable` when they could not be loaded (nothing is filtered then). */
  projectFilter?: {
    on: boolean;
    onChange: (v: boolean) => void;
    noDimensions: boolean;
    unavailable?: boolean;
  };
}


const CatalogueSidebar: React.FC<CatalogueSidebarProps> = ({
  filters,
  onFiltersChange,
  tags,
  isMobile = false,
  searchQuery,
  onSearchChange,
  pluginOnly,
  onPluginOnlyChange,
  projectFilter,
}) => {
  const [expandedDimensions, setExpandedDimensions] = useState<string[]>([]);
  const [showAllAiSystems, setShowAllAiSystems] = useState(false);

  const dimensions = dimensionTree(tags ?? [], filters.tab);
  // The AI systems a test is made for: the catalogue's ai_type tags.
  const aiSystemOptions = Array.from(
    new Set(inSortOrder((tags ?? []).filter((t) => t.section === "ai_type")).map((t) => t.label))
  );

  const toggleArrayItem = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  // One tab is always active. A click on either tab, the active one too,
  // resets every facet: the test-only facets (AI system / license)
  // don't apply to controls and would otherwise hide every control if left
  // selected.
  const setTab = (tab: CatalogueTab) =>
    onFiltersChange({
      ...filters,
      tab,
      selectedDimensions: [],
      selectedAiSystems: [],
      selectedLicenses: [],
      selectedSources: [],
    });

  const toggleDimension = (slug: string) =>
    onFiltersChange({
      ...filters,
      selectedDimensions: toggleArrayItem(filters.selectedDimensions, slug),
    });

  const toggleExpandDimension = (slug: string) =>
    setExpandedDimensions((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );

  const toggleAiSystem = (label: string) =>
    onFiltersChange({
      ...filters,
      selectedAiSystems: toggleArrayItem(filters.selectedAiSystems, label),
    });

  const toggleLicense = (label: string) =>
    onFiltersChange({
      ...filters,
      selectedLicenses: toggleArrayItem(filters.selectedLicenses, label),
    });

  const toggleSource = (label: string) =>
    onFiltersChange({
      ...filters,
      selectedSources: toggleArrayItem(filters.selectedSources, label),
    });

  // Source options come from the data (the `source`-section tags, AESIA,
  // EUSAiR, …), not a hardcoded list.
  const sourceOptions = Array.from(
    new Set((tags ?? []).filter((t) => t.section === "source").map((t) => t.label))
  ).sort();

  const visibleAiSystems = showAllAiSystems
    ? aiSystemOptions
    : aiSystemOptions.slice(0, 6);

  return (
    <aside
      style={{
        ...styles.sidebar,
        ...(isMobile
          ? {
              width: "100%",
              minWidth: 0,
              maxHeight: "45vh",
              borderRight: "none",
              borderBottom: "1px solid #e5e7eb",
            }
          : {}),
      }}
    >
      {/* Tests / Controls toggle */}
      <div style={{ ...styles.tabContainer, marginTop: "10px" }}>
        <button
          style={styles.tab(filters.tab === "controls")}
          onClick={() => setTab("controls")}
          aria-pressed={filters.tab === "controls"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          Controls
        </button>
        <button
          style={styles.tab(filters.tab === "tests")}
          onClick={() => setTab("tests")}
          aria-pressed={filters.tab === "tests"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}><path d="M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3" /><path d="M9 3v4h6V3" /><path d="M9 14l2 2 4-4" /></svg>
          Tests
        </button>
      </div>

      {/* Search (below the Tests/Controls tabs) */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by name or description"
          aria-label="Search the catalogue"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={styles.searchInput}
        />
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={styles.searchIcon}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
      </div>

      {/* "For this project": on, it keeps the entries of the project's
          dimensions. */}
      {projectFilter && (
        <>
          <button
            type="button"
            style={{
              ...styles.pluginToggleRow,
              ...(projectFilter.unavailable ? { cursor: "default", opacity: 0.5 } : {}),
            }}
            onClick={() => projectFilter.onChange(!projectFilter.on)}
            disabled={projectFilter.unavailable}
            role="switch"
            aria-checked={projectFilter.on && !projectFilter.unavailable}
            aria-disabled={projectFilter.unavailable || undefined}
            aria-label="For this project"
          >
            <span>For this project</span>
            <span style={styles.toggleTrack(projectFilter.on && !projectFilter.unavailable)}>
              <span style={styles.toggleKnob(projectFilter.on && !projectFilter.unavailable)} />
            </span>
          </button>
          {projectFilter.unavailable && (
            <div style={styles.projectNote}>
              The project&apos;s dimensions could not be loaded: showing everything.
            </div>
          )}
          {projectFilter.noDimensions && (
            <div style={styles.projectNote}>
              No control objectives selected yet: showing everything.
            </div>
          )}
        </>
      )}

      {/* "Plugin available" toggle (below the search bar), tests only, since
          only tests have a runnable plugin. */}
      {filters.tab === "tests" && (
        <button
          type="button"
          style={styles.pluginToggleRow}
          onClick={() => onPluginOnlyChange(!pluginOnly)}
          role="switch"
          aria-checked={pluginOnly}
        >
          <span>Plugin available</span>
          <span style={styles.toggleTrack(pluginOnly)}>
            <span style={styles.toggleKnob(pluginOnly)} />
          </span>
        </button>
      )}

      {/* ── Trustworthiness Dimensions ── */}
      <div style={styles.sectionTitle}>Trustworthiness Dimensions</div>

      {/* Dimension list */}
      <div style={{ lineHeight: "1.8" }}>
        {dimensions.map((dim) => {
          const isActive = filters.selectedDimensions.includes(dim.slug);
          const isExpanded = expandedDimensions.includes(dim.slug);
          return (
            <React.Fragment key={dim.slug}>
              <button
                style={styles.trustworthinessdimensionItem(isActive)}
                aria-pressed={isActive}
                onClick={() => {
                  toggleDimension(dim.slug);
                  if (dim.children.length > 0) toggleExpandDimension(dim.slug);
                }}
              >
                {dim.label}
              </button>
              {/* Children as horizontal pills when expanded */}
              {dim.children.length > 0 && (isExpanded || isActive) && (
                <div style={styles.trustworthinesschildrenContainer}>
                  {dim.children.map((child) => {
                    const childActive = filters.selectedDimensions.includes(
                      child.slug
                    );
                    return (
                      <button
                        key={child.slug}
                        style={styles.childItem(childActive)}
                        aria-pressed={childActive}
                        onClick={() => toggleDimension(child.slug)}
                      >
                        {child.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Source (controls only, originating body, e.g. AESIA, EUSAiR) ── */}
      {filters.tab === "controls" && sourceOptions.length > 0 && (
        <>
          <div style={styles.sectionTitle}>Source</div>
          <div>
            {sourceOptions.map((s) => (
              <button
                type="button"
                key={s}
                style={styles.sourcePills(filters.selectedSources.includes(s))}
                aria-pressed={filters.selectedSources.includes(s)}
                onClick={() => toggleSource(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      {/* AI system and License are test attributes, controls don't carry
          them, so show these facets on the Tests tab only. */}
      {filters.tab === "tests" && (
        <>
      {/* ── AI system under assessment ── */}
      <div style={styles.sectionTitle}>AI system under assessment</div>
      <div>
        {visibleAiSystems.map((s) => (
          <button
            type="button"
            key={s}
            style={styles.aiSystemUnderAssesment(filters.selectedAiSystems.includes(s))}
            aria-pressed={filters.selectedAiSystems.includes(s)}
            onClick={() => toggleAiSystem(s)}
          >
            {s}
          </button>
        ))}
      </div>
      {aiSystemOptions.length > 6 && (
        <button
          style={styles.seeMore}
          onClick={() => setShowAllAiSystems((v) => !v)}
        >
          {showAllAiSystems ? "See less" : "See more +"}
        </button>
      )}

      {/* ── License ── */}
      <div style={styles.sectionTitle}>License</div>
      <div>
        {LICENSE_OPTIONS.map((l) => (
          <button
            type="button"
            key={l}
            style={styles.licence(filters.selectedLicenses.includes(l))}
            aria-pressed={filters.selectedLicenses.includes(l)}
            onClick={() => toggleLicense(l)}
          >
            {l}
          </button>
        ))}
      </div>
        </>
      )}
    </aside>
  );
};

export default CatalogueSidebar;
