import React, { useState } from "react";
import type { Tag } from "../../services/catalogueApi";


interface DimensionItem {
  label: string;
  slug: string;
  children?: { label: string; slug: string }[];
}

const TEST_TRUSTWORTHINESS_DIMENSIONS: DimensionItem[] = [
  {
    label: "Human Agency and Oversight",
    slug: "human-agency-oversight",
    children: [
      { label: "Override & opt-out mechanism testing", slug: "override-opt-out-mechanism-testing" },
      { label: "Audit trail & logging completeness", slug: "audit-trail-logging-completeness" },
    ],
  },
  {
    label: "Technical Robustness and Safety",
    slug: "technical-robustness-safety",
    children: [
      { label: "Stress testing", slug: "stress-testing" },
      { label: "Adversarial input testing", slug: "adversarial-input-testing" },
      { label: "Out-of-distribution testing", slug: "out-of-distribution-testing" },
      { label: "Drift detection", slug: "drift-detection" },
      { label: "Chaos engineering", slug: "chaos-engineering" },
      { label: "Model calibration", slug: "model-calibration" },
      { label: "Prompt Injection", slug: "prompt-injection" },
      { label: "Insecure Output Handling", slug: "insecure-output-handling" },
      { label: "Training Data Poisoning", slug: "training-data-poisoning" },
      { label: "Denial of Service", slug: "denial-of-service" },
      { label: "Sensitive Information Disclosure", slug: "sensitive-information-disclosure" },
      { label: "Insecure Plugin Design", slug: "insecure-plugin-design" },
      { label: "Excessive Agency", slug: "excessive-agency" },
      { label: "Overreliance", slug: "overreliance" },
      { label: "Model Theft", slug: "model-theft" },
    ],
  },
  {
    label: "Privacy and Data Governance",
    slug: "privacy-data-governance",
    children: [
      { label: "Encryption testing", slug: "encryption-testing" },
      { label: "PII detection testing", slug: "pii-detection-testing" },
      { label: "Data anonymisation / re-identification risk", slug: "data-anonymisation-re-identification-risk" },
      { label: "Data retention policy violation detection", slug: "data-retention-policy-violation-detection" },
      { label: "Access control testing", slug: "access-control-testing" },
    ],
  },
  {
    label: "Transparency",
    slug: "transparency",
    children: [
      { label: "Local interpretability", slug: "local-interpretability" },
      { label: "Global interpretability", slug: "global-interpretability" },
      { label: "Explanation consistency testing", slug: "explanation-consistency-testing" },
    ],
  },
  {
    label: "Diversity, Non-discrimination and Fairness",
    slug: "diversity-non-discrimination-fairness",
    children: [
      { label: "Bias detection on data", slug: "bias-detection-on-data" },
      { label: "Bias detection on system", slug: "bias-detection-on-system" },
    ],
  },
  {
    label: "Societal and Environmental Wellbeing",
    slug: "societal-environmental-wellbeing",
    children: [
      { label: "Energy consumption tracking", slug: "energy-consumption-tracking" },
      { label: "Hardware utilisation profiling", slug: "hardware-utilisation-profiling" },
    ],
  },
];

const CONTROL_TRUSTWORTHINESS_DIMENSIONS: DimensionItem[] = [
  {
    label: "Human Agency and Oversight",
    slug: "human-agency-oversight",
    children: [
      { label: "Supervisory control", slug: "supervisory-control" },
      { label: "Strategic governance", slug: "strategic-governance" },
      { label: "Informed consent", slug: "informed-consent" },
      { label: "User preferences", slug: "user-preferences" },
      { label: "Audit trails", slug: "audit-trails" },
    ],
  },
  {
    label: "Technical Robustness and Safety",
    slug: "technical-robustness-safety",
    children: [
      { label: "Fail-over architecture", slug: "fail-over-architecture" },
      { label: "Human fallback", slug: "human-fallback" },
    ],
  },
  {
    label: "Privacy and Data Governance",
    slug: "privacy-data-governance",
    children: [
      { label: "Purpose limitation", slug: "purpose-limitation" },
      { label: "Scope restriction", slug: "scope-restriction" },
      { label: "Pseudonymisation", slug: "pseudonymisation" },
      { label: "Role-based access control", slug: "role-based-access-control" },
      { label: "Lineage tracking", slug: "lineage-tracking" },
      { label: "Metadata versioning", slug: "metadata-versioning" },
      { label: "Consent tracking", slug: "consent-tracking" },
      { label: "Granular revocation", slug: "granular-revocation" },
    ],
  },
  {
    label: "Transparency",
    slug: "transparency",
    children: [
      { label: "Model cards", slug: "model-cards" },
      { label: "Datasheets", slug: "datasheets" },
      { label: "AI identity notices", slug: "ai-identity-notices" },
      { label: "Disclaimers", slug: "disclaimers" },
      { label: "Risk communication", slug: "risk-communication" },
      { label: "Understandable language", slug: "understandable-language" },
    ],
  },
  {
    label: "Diversity, Non-discrimination and Fairness",
    slug: "diversity-non-discrimination-fairness",
    children: [
      { label: "Sampling strategies", slug: "sampling-strategies" },
      { label: "Accessibility", slug: "accessibility" },
      { label: "Participatory design", slug: "participatory-design" },
    ],
  },
  {
    label: "Societal and Environmental Well-being",
    slug: "societal-environmental-wellbeing",
    children: [
      { label: "Rights-based system", slug: "rights-based-system" },
      { label: "Independent ethics committee", slug: "independent-ethics-committee" },
    ],
  },
  {
    label: "Accountability",
    slug: "accountability",
    children: [
      { label: "RASCI charts", slug: "rasci-charts" },
      { label: "Logging", slug: "logging" },
      { label: "External reporting interfaces", slug: "external-reporting-interfaces" },
      { label: "Redress systems", slug: "redress-systems" },
      { label: "Version-controlled records", slug: "version-controlled-records" },
    ],
  },
  {
    label: "Quality Management",
    slug: "quality-management",
    children: [
      { label: "Quality Policy Declaration", slug: "quality-policy-declaration" },
      { label: "Control of documented information", slug: "control-of-documented-information" },
      { label: "Internal Auditing", slug: "internal-auditing" },
      { label: "Continuous Improvement", slug: "continuous-improvement" },
    ],
  },
  {
    label: "Risk Management",
    slug: "risk-management",
    children: [
      { label: "Description of AI system", slug: "description-of-ai-system" },
      { label: "Structured risk identification", slug: "structured-risk-identification" },
      { label: "Core classification step", slug: "core-classification-step" },
      { label: "Finalise classification decision", slug: "finalise-classification-decision" },
      { label: "Outline potential risk areas", slug: "outline-potential-risk-areas" },
      { label: "Establishing PMM plan", slug: "establishing-pmm-plan" },
      { label: "Perform CAPA", slug: "perform-capa" },
      { label: "Compliant incident reporting", slug: "compliant-incident-reporting" },
    ],
  },
  {
    label: "Technical Documentation",
    slug: "technical-documentation",
    children: [
      { label: "System overview and intended purpose", slug: "system-overview-and-intended-purpose" },
      { label: "Architecture and design specifications", slug: "architecture-and-design-specifications" },
      { label: "Dataset provenance", slug: "dataset-provenance" },
      { label: "Structured compliance mapping", slug: "structured-compliance-mapping" },
    ],
  },
  {
    label: "Record-keeping",
    slug: "record-keeping",
    children: [
      { label: "Operational logging system", slug: "operational-logging-system" },
      { label: "Version control", slug: "version-control" },
      { label: "Full lineage", slug: "full-lineage" },
      { label: "Retention/deletion policies", slug: "retention-deletion-policies" },
    ],
  },
];


// Sector facet is hidden for now; flip to true to bring it back.
const SHOW_SECTOR_FILTER = false;

const SECTOR_OPTIONS = [
  "Agriculture", "Competition", "Corporate governance", "Defence",
  "Digital Economy", "Economy", "Education", "Employment & labour",
  "Environment", "Finance and insurance", "Health", "Inclusive development",
  "Industry & entrepreneurship", "Innovation", "Investment", "Other",
  "Public governance", "Public sector", "Science & technology",
  "Social & welfare issues", "Tax Transport", "Trade",
];

const AI_SYSTEM_OPTIONS = [
  "Multimodal", "Computer Vision", "Natural Language Processing",
  "Audio", "Knowledge & Retrieval",
  "Recommendation & Personalization",
  "Predictive & Analytical AI", "Anomaly Detection",
  "Tabular & Structured Data", "Decision & Optimization",
  "Reinforcement Learning & Control",
  "Agents & Agentic Systems",
  "AI Safety & Governance", "Other / Emerging",
];

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
  // ── "Plugin available" toggle (below the search bar) ──
  pluginToggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
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
  // ── "Recommended" toggle (mock-up, disabled until the Wizard is wired in) ──
  recToggleRow: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "8px",
    fontSize: "13px",
    fontWeight: 600 as const,
    color: "#9aa0ad",
    cursor: "default",
    userSelect: "none" as const,
  },
  recToggleLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  recForLabel: {
    fontWeight: 400 as const,
    color: "#6c757d",
    fontSize: "12px",
  },
  infoIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "15px",
    height: "15px",
    borderRadius: "50%",
    border: "1px solid #9aa0ad",
    color: "#6c757d",
    fontSize: "10px",
    fontStyle: "italic" as const,
    fontWeight: 700 as const,
    fontFamily: "Georgia, serif",
    cursor: "pointer",
    lineHeight: 1,
  },
  toggleTrackDisabled: {
    position: "relative" as const,
    width: "38px",
    height: "20px",
    flexShrink: 0,
    borderRadius: "20px",
    backgroundColor: "#D8DCE6",
  },
  toggleKnobDisabled: {
    position: "absolute" as const,
    top: "2px",
    left: "2px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    backgroundColor: "#f1f1f4",
  },
  popupOverlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 40,
  },
  recPopup: {
    position: "absolute" as const,
    top: "28px",
    left: 0,
    zIndex: 50,
    width: "248px",
    padding: "12px 14px",
    backgroundColor: "#fff",
    border: "1px solid #dee2e6",
    borderRadius: "10px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
    fontWeight: 400 as const,
    color: "#49454F",
  },
  recPopupText: {
    fontSize: "12.5px",
    lineHeight: 1.5,
    marginBottom: "10px",
  },
  recPopupLink: {
    fontSize: "12.5px",
    fontWeight: 600 as const,
    color: "#000FDF",
    textDecoration: "none",
  },
  trustworthinessdimensionItem: (active: boolean) => ({
    display: "inline-block",
    padding: "4px 12px",
    margin: "2px 4px 2px 0",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#000FDF80",
    backgroundColor: active ? "#C5D2FF" : "#C5D2FF",
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
  sectorPills: (active: boolean) => ({
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
    transition: "all 0.15s ease",
  }),
    aiSystemUnderAssesment: (active: boolean) => ({
    display: "inline-block",
    padding: "4px 12px",
    margin: "2px 4px 2px 0",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#000FDF80",
    backgroundColor: active ? "#C5D2FF" : "#C5D2FF",
    border: "None",
    textAlign: "left" as const,
    fontWeight: active ? 600 : 400,
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
        backgroundColor: active ? "#C5D2FF" : "#C5D2FF",
        color: "#000FDF80",
        fontWeight: active ? 600 : 400,
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


export type CatalogueTab = "tests" | "controls" | null;

export interface SidebarFilters {
  tab: CatalogueTab;
  selectedDimensions: string[];
  selectedSectors: string[];
  selectedAiSystems: string[];
  selectedLicenses: string[];
  selectedSources: string[];
}

interface CatalogueSidebarProps {
  filters: SidebarFilters;
  onFiltersChange: (filters: SidebarFilters) => void;
  /** Tags from the API, used to show dynamic labels if available */
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
   *  dimensions. `noDimensions` when the project has none selected yet. */
  projectFilter?: { on: boolean; onChange: (v: boolean) => void; noDimensions: boolean };
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
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [showAllAiSystems, setShowAllAiSystems] = useState(false);

  const dimensions =
    filters.tab === "controls" ? CONTROL_TRUSTWORTHINESS_DIMENSIONS : TEST_TRUSTWORTHINESS_DIMENSIONS;

  const toggleArrayItem = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  // Always keep one tab active, clicking the active tab is a no-op (never
  // collapses to "nothing selected").
  const setTab = (tab: CatalogueTab) =>
    onFiltersChange({
      ...filters,
      tab,
      // Reset all facets on tab switch, the test-only facets (sector / AI
      // system / license) don't apply to controls and would otherwise hide
      // every control if left selected.
      selectedDimensions: [],
      selectedSectors: [],
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

  const toggleSector = (label: string) =>
    onFiltersChange({
      ...filters,
      selectedSectors: toggleArrayItem(filters.selectedSectors, label),
    });

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

  const visibleSectors = showAllSectors
    ? SECTOR_OPTIONS
    : SECTOR_OPTIONS.slice(0, 8);
  const visibleAiSystems = showAllAiSystems
    ? AI_SYSTEM_OPTIONS
    : AI_SYSTEM_OPTIONS.slice(0, 6);

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
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          Controls
        </button>
        <button
          style={styles.tab(filters.tab === "tests")}
          onClick={() => setTab("tests")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}><path d="M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3" /><path d="M9 3v4h6V3" /><path d="M9 14l2 2 4-4" /></svg>
          Tests
        </button>
      </div>

      {/* Search (below the Tests/Controls tabs) */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by name"
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
          <div
            style={styles.pluginToggleRow}
            onClick={() => projectFilter.onChange(!projectFilter.on)}
            role="switch"
            aria-checked={projectFilter.on}
            aria-label="For this project"
          >
            <span>For this project</span>
            <span style={styles.toggleTrack(projectFilter.on)}>
              <span style={styles.toggleKnob(projectFilter.on)} />
            </span>
          </div>
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
        <div
          style={styles.pluginToggleRow}
          onClick={() => onPluginOnlyChange(!pluginOnly)}
          role="switch"
          aria-checked={pluginOnly}
        >
          <span>Plugin available</span>
          <span style={styles.toggleTrack(pluginOnly)}>
            <span style={styles.toggleKnob(pluginOnly)} />
          </span>
        </div>
      )}

      {/* The Wizard's "Recommended" control is NOT a sidebar filter, it lives
          in a prominent banner above the catalogue grid (see Catalogue.tsx),
          since it's a personalized recommendation, not a generic facet. */}

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
                onClick={() => {
                  toggleDimension(dim.slug);
                  if (dim.children) toggleExpandDimension(dim.slug);
                }}
              >
                {dim.label}
              </button>
              {/* Children as horizontal pills when expanded */}
              {dim.children && (isExpanded || isActive) && (
                <div style={styles.trustworthinesschildrenContainer}>
                  {dim.children.map((child) => {
                    const childActive = filters.selectedDimensions.includes(
                      child.slug
                    );
                    return (
                      <button
                        key={child.slug}
                        style={styles.childItem(childActive)}
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
              <span
                key={s}
                style={styles.sectorPills(filters.selectedSources.includes(s))}
                onClick={() => toggleSource(s)}
              >
                {s}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Sector, AI system, and License are test attributes, controls don't
          carry them, so show these facets on the Tests tab only. */}
      {filters.tab === "tests" && (
        <>
      {/* ── Sector ── */}
      {SHOW_SECTOR_FILTER && (
        <>
      <div style={styles.sectionTitle}>Sector</div>
      <div>
        {visibleSectors.map((s) => (
          <span
            key={s}
            style={styles.sectorPills(filters.selectedSectors.includes(s))}
            onClick={() => toggleSector(s)}
          >
            {s}
          </span>
        ))}
      </div>
      {SECTOR_OPTIONS.length > 8 && (
        <button style={styles.seeMore} onClick={() => setShowAllSectors((v) => !v)}>
          {showAllSectors ? "See less" : "See more +"}
        </button>
      )}
        </>
      )}

      {/* ── AI system under assessment ── */}
      <div style={styles.sectionTitle}>AI system under assessment</div>
      <div>
        {visibleAiSystems.map((s) => (
          <span
            key={s}
            style={styles.aiSystemUnderAssesment(filters.selectedAiSystems.includes(s))}
            onClick={() => toggleAiSystem(s)}
          >
            {s}
          </span>
        ))}
      </div>
      {AI_SYSTEM_OPTIONS.length > 6 && (
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
          <span
            key={l}
            style={styles.licence(filters.selectedLicenses.includes(l))}
            onClick={() => toggleLicense(l)}
          >
            {l}
          </span>
        ))}
      </div>
        </>
      )}
    </aside>
  );
};

export default CatalogueSidebar;
