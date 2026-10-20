import React, { useEffect, useState, useMemo } from "react";
import Layout from "../components/Layout";
import NavPill from "../components/NavPill";
import ToolDetailModal from "../components/catalogue/ToolDetailModal";
import type { Tool, Tag, Metric } from "../services/catalogueApi";
import { useProjectCatalogue } from "../hooks/useProjectCatalogue";
import {
  fetchToolsDetailed,
  fetchTags,
  fetchMetrics,
} from "../services/catalogueApi";

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  // Main content area inside the Layout shell
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
    flexWrap: "wrap" as const,
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
  filtersRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap" as const,
  },
  searchInput: {
    padding: "8px 14px",
    paddingRight: "32px",
    borderRadius: "28px",
    border: "1px solid #dee2e6",
    backgroundColor: "#F6F8FF",
    fontSize: "13px",
    color: "#49454F",
    width: "220px",
    outline: "none",
  },
  dimensionSelect: {
    padding: "8px 14px",
    borderRadius: "28px",
    border: "1px solid #dee2e6",
    backgroundColor: "#F6F8FF",
    fontSize: "13px",
    color: "#49454F",
    outline: "none",
    cursor: "pointer",
    minWidth: "200px",
  },
  // ── View-mode toggle (Table | Cards) ──
  viewToggleGroup: {
    display: "inline-flex",
    border: "1px solid #dee2e6",
    borderRadius: "28px",
    overflow: "hidden",
    backgroundColor: "#F6F8FF",
  },
  viewToggleBtn: (active: boolean) => ({
    padding: "8px 16px",
    border: "none",
    background: active ? "#3b5bdb" : "transparent",
    color: active ? "#fff" : "#49454F",
    fontSize: "12px",
    fontWeight: 600 as const,
    cursor: "pointer",
    transition: "background 0.15s ease",
  }),
  // ── Card grid ──
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    padding: "18px 20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap" as const,
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: 700 as const,
    color: "#1a1a2e",
    margin: 0,
    fontFamily: "monospace",
  },
  cardSpecRow: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "4px 12px",
    fontSize: "12px",
    color: "#495057",
  },
  cardSpecLabel: {
    fontWeight: 600 as const,
    color: "#6c757d",
    textTransform: "uppercase" as const,
    letterSpacing: "0.3px",
    fontSize: "10px",
    alignSelf: "center" as const,
  },
  cardSpecValue: {
    fontFamily: "monospace",
    fontSize: "12px",
  },
  cardRepresents: {
    fontSize: "13px",
    color: "#1a1a2e",
    lineHeight: 1.5,
  },
  cardFooter: {
    marginTop: "auto",
    paddingTop: "10px",
    borderTop: "1px solid #f1f3f5",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12px",
  },
  cardFooterLabel: {
    color: "#6c757d",
    textTransform: "uppercase" as const,
    letterSpacing: "0.3px",
    fontSize: "10px",
    fontWeight: 600 as const,
  },
  // ── Table ──
  // scrolls sideways when the columns do not fit (a phone)
  tableWrap: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    overflowX: "auto" as const,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "13px",
  },
  thead: {
    backgroundColor: "#f1f3f5",
  },
  th: {
    textAlign: "left" as const,
    padding: "12px 16px",
    fontWeight: 700 as const,
    color: "#1a1a2e",
    fontSize: "12px",
    letterSpacing: "0.3px",
    textTransform: "uppercase" as const,
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap" as const,
  },
  td: {
    padding: "14px 16px",
    color: "#495057",
    borderBottom: "1px solid #f1f3f5",
    verticalAlign: "top" as const,
  },
  metricName: {
    fontWeight: 600 as const,
    color: "#1a1a2e",
    fontSize: "13px",
    marginBottom: "4px",
  },
  derivedTag: {
    display: "inline-block",
    marginLeft: "6px",
    padding: "1px 6px",
    borderRadius: "8px",
    fontSize: "10px",
    fontWeight: 600 as const,
    backgroundColor: "#fff8e1",
    color: "#92400e",
    letterSpacing: "0.3px",
    textTransform: "uppercase" as const,
  },
  formula: {
    fontSize: "11px",
    color: "#6c757d",
    fontStyle: "italic" as const,
    marginTop: "4px",
    fontFamily: "monospace",
  },
  dimensionPill: (bg: string, fg: string) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 500 as const,
    backgroundColor: bg || "#e7f0ff",
    color: fg || "#3b5bdb",
    marginRight: "4px",
    marginTop: "2px",
  }),
  toolButton: {
    background: "none",
    border: "none",
    color: "#3b5bdb",
    fontSize: "13px",
    fontWeight: 600 as const,
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  },
  toolButtonDisabled: {
    color: "#adb5bd",
    fontSize: "13px",
    fontStyle: "italic" as const,
  },
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
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

const Metrics: React.FC = () => {
  // ── State ──
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDimension, setSelectedDimension] = useState<string>("");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  // Nothing loads until the platform confirms the project chose its catalogue.
  const { info: projectInfo, stopped } = useProjectCatalogue();
  const ready = projectInfo !== null;

  // ── Fetch data once the project's catalogue is known ──
  useEffect(() => {
    if (!ready) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [metricsData, toolsData, tagsData] = await Promise.all([
          fetchMetrics(),
          fetchToolsDetailed(),
          fetchTags(),
        ]);
        setMetrics(metricsData);
        setTools(toolsData);
        setTags(tagsData);
      } catch (err) {
        console.error("Failed to load metrics data:", err);
        setError("Failed to load metrics. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ready]);

  // ── Lookups ──
  const toolBySlug = useMemo(() => {
    const map = new Map<string, Tool>();
    tools.forEach((t) => map.set(t.slug, t));
    return map;
  }, [tools]);

  const dimensionTags = useMemo(
    () => tags.filter((t) => t.section === "dimension"),
    [tags]
  );

  // ── Filter ──
  const filteredMetrics = useMemo(() => {
    return metrics.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!m.name.toLowerCase().includes(q)) return false;
      }
      if (selectedDimension) {
        const dimSlugs = (m.dimensions ?? []).map((d) => d.slug);
        if (!dimSlugs.includes(selectedDimension)) return false;
      }
      return true;
    });
  }, [metrics, searchQuery, selectedDimension]);

  // ── Render ──
  return (
    <Layout>
      <div style={s.main}>
        <div style={s.titleRow}>
          <h1 style={s.pageTitle}>
            Catalogue by{" "}
            <span style={s.pageTitleAccent}>Metric</span>
          </h1>
          <div style={s.filtersRow}>
            {/* Return to the catalogue (the shared top nav was removed). */}
            <NavPill
              to="/catalogue"
              label="Back to catalogue"
              iconBefore
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
              }
            />
            <div style={{ position: "relative", display: "inline-block" }}>
              <input
                type="text"
                placeholder="Type metric name"
                aria-label="Search metrics by name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={s.searchInput}
              />
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6c757d"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <select
              aria-label="Trustworthiness dimension"
              style={s.dimensionSelect}
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
            >
              <option value="">All trustworthiness dimensions</option>
              {dimensionTags.map((d) => (
                <option key={d.id} value={d.slug}>
                  {d.label}
                </option>
              ))}
            </select>
            <div style={s.viewToggleGroup} role="group" aria-label="View mode">
              <button
                style={s.viewToggleBtn(viewMode === "table")}
                onClick={() => setViewMode("table")}
                aria-pressed={viewMode === "table"}
              >
                Table
              </button>
              <button
                style={s.viewToggleBtn(viewMode === "cards")}
                onClick={() => setViewMode("cards")}
                aria-pressed={viewMode === "cards"}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {stopped ? (
          <div style={s.loadingContainer}>{stopped}</div>
        ) : loading ? (
          <div style={s.loadingContainer}>Loading metrics…</div>
        ) : error ? (
          <div style={s.loadingContainer}>{error}</div>
        ) : filteredMetrics.length === 0 ? (
          <div style={s.emptyState}>
            <p>No metrics match your current filters.</p>
            <p>Try clearing the search or the dimension filter.</p>
          </div>
        ) : viewMode === "cards" ? (
          <div style={s.cardGrid}>
            {filteredMetrics.map((m) => {
              const tool = m.tool ? toolBySlug.get(m.tool.slug) : null;
              return (
                <div key={m.id} style={s.card}>
                  <div style={s.cardHeader}>
                    <h3 style={s.cardTitle}>{m.name}</h3>
                    {m.is_derived && (
                      <span style={s.derivedTag}>derived</span>
                    )}
                  </div>
                  {(m.dimensions ?? []).length > 0 && (
                    <div>
                      {(m.dimensions ?? []).map((d) => (
                        <span
                          key={d.id}
                          style={s.dimensionPill(d.color_bg, d._color_text)}
                        >
                          {d.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={s.cardSpecRow}>
                    <span style={s.cardSpecLabel}>Type</span>
                    <span style={s.cardSpecValue}>{m.data_type}</span>
                    <span style={s.cardSpecLabel}>Range</span>
                    <span style={s.cardSpecValue}>{m.range_str}</span>
                    <span style={s.cardSpecLabel}>Unit</span>
                    <span style={s.cardSpecValue}>{m.unit}</span>
                  </div>
                  {m.formula && (
                    <div style={s.formula}>{m.formula}</div>
                  )}
                  <div style={s.cardRepresents}>{m.represents}</div>
                  <div style={s.cardFooter}>
                    <span style={s.cardFooterLabel}>Tool</span>
                    {tool ? (
                      <button
                        style={s.toolButton}
                        onClick={() => setSelectedTool(tool)}
                      >
                        {tool.name}
                      </button>
                    ) : (
                      <span style={s.toolButtonDisabled}>
                        {m.tool?.name ?? "n/a"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead style={s.thead}>
                <tr>
                  <th style={s.th}>Metric name</th>
                  <th style={s.th}>Data type</th>
                  <th style={s.th}>Range</th>
                  <th style={s.th}>Unit</th>
                  <th style={s.th}>What it represents</th>
                  <th style={s.th}>Tool</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.map((m) => {
                  const tool = m.tool ? toolBySlug.get(m.tool.slug) : null;
                  return (
                    <tr key={m.id}>
                      <td style={s.td}>
                        <div style={s.metricName}>
                          {m.name}
                          {m.is_derived && (
                            <span style={s.derivedTag}>derived</span>
                          )}
                        </div>
                        {m.formula && (
                          <div style={s.formula}>{m.formula}</div>
                        )}
                        <div style={{ marginTop: "4px" }}>
                          {(m.dimensions ?? []).map((d) => (
                            <span
                              key={d.id}
                              style={s.dimensionPill(d.color_bg, d._color_text)}
                            >
                              {d.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={s.td}>{m.data_type}</td>
                      <td style={s.td}>{m.range_str}</td>
                      <td style={s.td}>{m.unit}</td>
                      <td style={{ ...s.td, maxWidth: "320px" }}>
                        {m.represents}
                      </td>
                      <td style={s.td}>
                        {tool ? (
                          <button
                            style={s.toolButton}
                            onClick={() => setSelectedTool(tool)}
                          >
                            {tool.name}
                          </button>
                        ) : (
                          <span style={s.toolButtonDisabled}>
                            {m.tool?.name ?? "n/a"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer style={s.footer}>
          <span>Provided by</span>
          <img
            src={`${import.meta.env.BASE_URL}img/LIST_2016_rgb_H75px 3.png`}
            alt="LIST"
            style={{ height: "28px" }}
          />
          <img
            src={`${import.meta.env.BASE_URL}img/SnT_Official_Blue_RedDot_RGB.png`}
            alt="uni.lu SnT"
            style={{ height: "28px" }}
          />
        </footer>
      </div>

      {selectedTool && (
        <ToolDetailModal
          tool={selectedTool}
          onClose={() => setSelectedTool(null)}
        />
      )}
    </Layout>
  );
};

export default Metrics;
