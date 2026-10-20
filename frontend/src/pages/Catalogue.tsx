import React, { useEffect, useState, useMemo } from "react";
import Layout from "../components/Layout";
import NavPill from "../components/NavPill";
import CatalogueSidebar from "../components/catalogue/CatalogueSidebar";
import ToolCard from "../components/catalogue/ToolCard";
import ToolDetailModal from "../components/catalogue/ToolDetailModal";
import type { SidebarFilters } from "../components/catalogue/CatalogueSidebar";
import type { Tool, Tag } from "../services/catalogueApi";
import { fetchToolsDetailed, fetchTags } from "../services/catalogueApi";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  projectSlug,
  fetchProjectCatalogue,
  updateFromPublic,
  fetchProjectDimensions,
  type ProjectCatalogueInfo,
} from "../services/projectCatalogue";


// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  // Header/page chrome is provided by <Layout>; this page only styles its body.
  // ── Body layout ──
  body: {
    display: "flex",
    flex: 1,
    overflow: "hidden" as const,
  },
  // ── Main content ──
  main: {
    flex: 1,
    padding: "28px 32px 0 32px",
    overflowY: "auto" as const,
    display: "flex",
    flexDirection: "column" as const,
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: "23px",
    fontWeight: 700 as const,
    color: "#1a1a2e",
    margin: 0,
  },
  pageTitleAccent: {
    color: "#3b5bdb",
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  // ── The line under the title about the project's copy ──
  projectRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "12px",
    marginBottom: "20px",
    fontSize: "13px",
    color: "#495057",
  },
  projectLabel: { fontWeight: 700 as const, color: "#1a1a2e" },
  updateBtn: {
    padding: "6px 12px",
    borderRadius: "28px",
    border: "1px solid #3b5bdb",
    backgroundColor: "#fff",
    color: "#3b5bdb",
    fontSize: "13px",
    fontWeight: 600 as const,
    cursor: "pointer",
  },
  // ── Card grid ──
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    flex: 1,
    alignContent: "start" as const,
  },
  // ── Loading / empty ──
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "80px 0",
    color: "#6c757d",
    fontSize: "15px",
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "60px 20px",
    color: "#6c757d",
    fontSize: "14px",
  },
  // ── Footer ──
  footer: {
    borderTop: "1px solid #e5e7eb",
    padding: "16px 32px",
    marginTop: "40px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
    backgroundColor: "#fff",
    fontSize: "12px",
    color: "#6c757d",
    marginLeft: "-32px",
    marginRight: "-32px",
    marginBottom: "0",
  },
};

/** The platform's HTTP answer carried by a failed axios call, if any. */
const platformAnswer = (err: unknown) =>
  (err as { response?: { status?: number; data?: { detail?: unknown } } })
    ?.response;

const NOT_CHOSEN = "This project has not chosen its catalogue yet: open it from the project page.";

// ─── Component ───────────────────────────────────────────────────────────────

const Catalogue: React.FC = () => {
  const isMobile = useIsMobile();

  // ── State ──
  const [tools, setTools] = useState<Tool[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pluginOnly, setPluginOnly] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  // The project's copy, its dimensions, and the "For this project" filter (on
  // by default).
  const [projectInfo, setProjectInfo] = useState<ProjectCatalogueInfo | null>(null);
  const [projectDimensions, setProjectDimensions] = useState<string[] | null>(null);
  const [forProject, setForProject] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);


  const [filters, setFilters] = useState<SidebarFilters>({
    tab: "controls",
    selectedDimensions: [],
    selectedSectors: [],
    selectedAiSystems: [],
    selectedLicenses: [],
    selectedSources: [],
  });

  // ── Fetch the tools and tags of the project's catalogue ──
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [toolsData, tagsData] = await Promise.all([
        fetchToolsDetailed(),
        fetchTags(),
      ]);
      setTools(toolsData);
      setTags(tagsData);
    } catch (err) {
      console.error("Failed to load catalogue data:", err);
      setError("Failed to load catalogue data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // The catalogue loads once the platform confirms the project chose one: its private copy, or the public catalogue read live through the
  // platform. Otherwise the page says why and loads nothing.
  const loadProjectCatalogue = async () => {
    const stop = (message: string) => {
      setError(message);
      setLoading(false);
    };
    if (!projectSlug())
      return stop("Open this catalogue from a project in the AISC launcher.");
    try {
      const info = await fetchProjectCatalogue();
      if (info.mode !== "private" && info.mode !== "public") return stop(NOT_CHOSEN);
      setProjectInfo(info);
    } catch (err) {
      return stop(
        platformAnswer(err)?.status === 409
          ? NOT_CHOSEN
          : "Failed to load the project's catalogue. Please try again."
      );
    }
    fetchProjectDimensions()
      .then(setProjectDimensions)
      .catch((err) => console.error("Failed to load the project's dimensions:", err));
    loadData();
  };

  // An admin refreshes a private copy from the public catalogue.
  const handleUpdateFromPublic = async () => {
    setUpdating(true);
    setUpdateMessage(null);
    try {
      const r = await updateFromPublic();
      setUpdateMessage(
        `${r.added} added, ${r.updated} updated, ${r.unchanged} unchanged, ` +
          `${r.removed} removed; ${r.local_kept} local kept`
      );
      fetchProjectCatalogue().then(setProjectInfo).catch(() => {});
      loadData();
    } catch (err) {
      const detail = platformAnswer(err)?.data?.detail;
      setUpdateMessage(
        typeof detail === "string" ? detail : "The update failed. Please try again."
      );
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    loadProjectCatalogue();
  }, []);

  // ── Filter tools based on sidebar + search ──
  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      // "Plugin available" toggle: tests only (controls have no plugin), and
      // only fully-ready tools have a usable plugin.
      if (pluginOnly && filters.tab === "tests" && tool.completion_status !== "full")
        return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = tool.name.toLowerCase().includes(q);
        const descMatch = tool.description.toLowerCase().includes(q);
        if (!nameMatch && !descMatch) return false;
      }

      const toolTags = tool.tags ?? [];

      // "For this project": keep the entries that carry one of the project's
      // dimensions; a sub-dimension counts for its parent. A project with no
      // dimensions yet shows everything.
      if (forProject && projectDimensions && projectDimensions.length > 0) {
        const toolDims = toolTags
          .filter(
            (t) =>
              t.section === "dimension" ||
              t.section === "testing_subdim" ||
              t.section === "controls_subdim"
          )
          .flatMap((t) => [t.slug, t.parent_dimension_slug ?? ""]);
        if (!projectDimensions.some((d) => toolDims.includes(d))) return false;
      }

      // Filter by trustworthiness dimension
      if (filters.selectedDimensions.length > 0) {
        // The sidebar's dimension list includes sub-dimensions (testing_subdim /
        // controls_subdim children) under each dimension, all toggled into
        // selectedDimensions. Match those sections too, or selecting a
        // sub-dimension on the left would match nothing.
        const toolDimSlugs = toolTags
          .filter(
            (t) =>
              t.section === "dimension" ||
              t.section === "testing_subdim" ||
              t.section === "controls_subdim"
          )
          .map((t) => t.slug);
        const hasMatchingDimension = filters.selectedDimensions.some((slug) =>
          toolDimSlugs.includes(slug)
        );
        if (!hasMatchingDimension) return false;
      }

      // Filter by sector
      if (filters.selectedSectors.length > 0) {
        const toolSectorLabels = toolTags
          .filter((t) => t.section === "sector")
          .map((t) => t.label);
        const hasMatchingSector = filters.selectedSectors.some((label) =>
          toolSectorLabels.includes(label)
        );
        if (!hasMatchingSector) return false;
      }

      // Filter by AI system type
      if (filters.selectedAiSystems.length > 0) {
        const toolAiLabels = toolTags
          .filter((t) => t.section === "ai_type")
          .map((t) => t.label);
        const hasMatchingAi = filters.selectedAiSystems.some((label) =>
          toolAiLabels.includes(label)
        );
        if (!hasMatchingAi) return false;
      }

      // Filter by source (originating body, AESIA, EUSAiR, …)
      if (filters.selectedSources.length > 0) {
        const toolSourceLabels = toolTags
          .filter((t) => t.section === "source")
          .map((t) => t.label);
        const hasMatchingSource = filters.selectedSources.some((label) =>
          toolSourceLabels.includes(label)
        );
        if (!hasMatchingSource) return false;
      }

      // Filter by license
      if (filters.selectedLicenses.length > 0) {
        const licensingLabel =
          tool.licensing === "Open_Source" ? "Open" : "Closed";
        if (!filters.selectedLicenses.includes(licensingLabel)) return false;
      }

      // Filter by tab type (tests vs controls)
      if (filters.tab === "tests" || filters.tab === "controls") {
        const toolTypeTags = toolTags
          .filter((t) => t.section === "type")
          .map((t) => t.slug);
        // If the tool has type tags, filter by tab; otherwise show it in both
        if (toolTypeTags.length > 0) {
          const matchesTab =
            filters.tab === "tests"
              ? toolTypeTags.some(
                  (slug) =>
                    slug.includes("test") || slug.includes("benchmark")
                )
              : toolTypeTags.some(
                  (slug) =>
                    slug.includes("control") || slug.includes("framework")
                );
          // Only filter if we can determine type; don't hide tools with unknown types
          if (
            toolTypeTags.some(
              (slug) =>
                slug.includes("test") ||
                slug.includes("benchmark") ||
                slug.includes("control") ||
                slug.includes("framework")
            ) &&
            !matchesTab
          ) {
            return false;
          }
        }
      }

      return true;
    });
  }, [tools, searchQuery, filters, pluginOnly, forProject, projectDimensions]);

  // ── Render ──
  return (
    <Layout>
      {/* ════════ Body: Sidebar + Main ════════ */}
      <div
        style={{
          ...s.body,
          ...(isMobile
            ? { flexDirection: "column" as const, overflow: "auto" as const }
            : {}),
        }}
      >
        {/* Sidebar */}
        <CatalogueSidebar
          filters={filters}
          onFiltersChange={setFilters}
          tags={tags}
          isMobile={isMobile}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          pluginOnly={pluginOnly}
          onPluginOnlyChange={setPluginOnly}
          projectFilter={
            projectInfo
              ? {
                  on: forProject,
                  onChange: setForProject,
                  noDimensions: projectDimensions?.length === 0,
                }
              : undefined
          }
        />

        {/* Main content area */}
        <div
          style={{
            ...s.main,
            ...(isMobile ? { padding: "16px 14px 0" } : {}),
          }}
        >
          {/* Title row */}
          <div
            style={{
              ...s.titleRow,
              ...(isMobile
                ? { flexWrap: "wrap" as const, alignItems: "flex-start" as const }
                : {}),
            }}
          >
            <h1 style={s.pageTitle}>
              Catalogue of{" "}
              <span style={s.pageTitleAccent}>
                Tests & Controls
              </span>
            </h1>
            {/* Search and "Plugin available" filter live in the sidebar (see
                CatalogueSidebar). This row holds the "Explore metrics" switch
                (tests only). */}
            <div style={s.searchRow}>
              {filters.tab === "tests" && (
                <NavPill
                  to="/metrics"
                  label="Explore metrics"
                  fontSize={16}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                  }
                />
              )}
            </div>
          </div>

          {projectInfo && (
            <div style={s.projectRow}>
              <span style={s.projectLabel}>
                {projectInfo.mode === "public"
                  ? "Public catalogue · live"
                  : `Private catalogue${
                      projectInfo.updated_at
                        ? ` · updated on ${new Date(projectInfo.updated_at).toLocaleDateString()}`
                        : ""
                    }`}
              </span>
              {/* a public project's catalogue is read live: there is no copy to update */}
              {projectInfo.mode === "private" && projectInfo.can_update && (
                <button
                  style={s.updateBtn}
                  disabled={updating}
                  onClick={handleUpdateFromPublic}
                >
                  Update from public
                </button>
              )}
              {updateMessage && <span>{updateMessage}</span>}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div style={s.loadingContainer}>Loading catalogue...</div>
          ) : error ? (
            <div style={s.loadingContainer}>{error}</div>
          ) : filteredTools.length === 0 ? (
            <div style={s.emptyState}>
              <p>No tools match your current filters.</p>
              <p>Try adjusting the sidebar filters or search query.</p>
            </div>
          ) : (
            <div
              style={{
                ...s.grid,
                ...(isMobile
                  ? { gridTemplateColumns: "1fr", gap: "14px" }
                  : {}),
              }}
            >
              {filteredTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  variant={
                    filters.tab
                      ? filters.tab
                      : (tool.tags ?? []).some(
                          (t) =>
                            t.slug === "control" || t.slug === "framework"
                        )
                        ? "controls"
                        : "tests"
                  }
                  onClick={setSelectedTool}
                />
              ))}
            </div>
          )}

          {/* ════════ Footer ════════ */}
          <footer style={s.footer}>
            <span>Provided by</span>
            {/* under the build's base path (CATALOGUE_BASE) */}
            <img src={`${import.meta.env.BASE_URL}img/LIST_2016_rgb_H75px 3.png`} alt="LIST" style={{ height: "28px" }} />
            <img src={`${import.meta.env.BASE_URL}img/SnT_Official_Blue_RedDot_RGB.png`} alt="uni.lu SnT" style={{ height: "28px" }} />
          </footer>
        </div>
      </div>

      {/* ════════ Detail Modal ════════ */}
      {selectedTool && (
        <ToolDetailModal
          tool={selectedTool}
          onClose={() => setSelectedTool(null)}
          // the card says installed without reloading the catalogue
          onInstalled={(slug) =>
            setTools((all) => all.map((t) => (t.slug === slug ? { ...t, aisc_installed: true } : t)))
          }
        />
      )}

    </Layout>
  );
};

export default Catalogue;
