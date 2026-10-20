import React, { useEffect, useState } from "react";
import type { Tool, Tag } from "../../services/catalogueApi";
import { fetchToolTags } from "../../services/catalogueApi";
import { useIsMobile } from "../../hooks/useIsMobile";
import InstallPluginButton from "../../crossSite/InstallPluginButton";
import { useInstallInfo, type InstallInfoState } from "../../hooks/useInstallInfo";
import { installCoordinates } from "../../crossSite/coordinates";
import { useCrossSite } from "../../crossSite/CrossSiteContext";
import ControlInstall from "../../crossSite/ControlInstall";
import TestInstall from "../../crossSite/TestInstall";
import { projectSlug } from "../../services/projectCatalogue";

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 1000,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: "40px",
    overflowY: "auto" as const,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    width: "90%",
    maxWidth: "860px",
    padding: "32px 36px",
    position: "relative" as const,
    boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
    fontFamily: "Arial, sans-serif",
    marginBottom: "40px",
  },
  closeButton: {
    position: "absolute" as const,
    top: "16px",
    right: "16px",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: "#3b5bdb",
    color: "#fff",
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700 as const,
    color: "#1a1a2e",
    marginTop: 0,
    marginBottom: "24px",
    paddingRight: "50px",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px 40px",
  },
  sectionLabel: {
    fontSize: "13px",
    fontWeight: 700 as const,
    color: "#1a1a2e",
    marginBottom: "6px",
    marginTop: "16px",
  },
  sectionValue: {
    fontSize: "13px",
    color: "#495057",
    lineHeight: "1.6",
  },
  link: {
    fontSize: "13px",
    color: "#3b5bdb",
    textDecoration: "none",
  },
  tagPill: (bgColor: string, textColor: string) => ({
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 500 as const,
    backgroundColor: bgColor || "#e7f0ff",
    color: textColor || "#3b5bdb",
    marginRight: "6px",
    marginBottom: "4px",
  }),
  placeholder: {
    fontSize: "13px",
    color: "#adb5bd",
    fontStyle: "italic" as const,
  },
  divider: {
    border: "none",
    borderTop: "1px solid #e5e7eb",
    margin: "24px 0",
  },
  // ── §4 long-form fields (Mapping to the domain model) ──
  longBlock: {
    fontSize: "13px",
    color: "#495057",
    lineHeight: "1.6",
    backgroundColor: "#f8f9fa",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "10px 14px",
    marginBottom: "8px",
    whiteSpace: "pre-wrap" as const,
  },
  // ── Metrics sub-table inside the modal ──
  metricsTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "12px",
    marginTop: "8px",
  },
  metricsTh: {
    textAlign: "left" as const,
    padding: "8px 10px",
    fontWeight: 700 as const,
    color: "#1a1a2e",
    fontSize: "11px",
    letterSpacing: "0.3px",
    textTransform: "uppercase" as const,
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f1f3f5",
  },
  metricsTd: {
    padding: "8px 10px",
    color: "#495057",
    borderBottom: "1px solid #f1f3f5",
    verticalAlign: "top" as const,
  },
  actionsRow: {
    display: "flex",
    gap: "12px",
    marginTop: "24px",
    flexWrap: "wrap" as const,
  },
  actionBtn: (primary: boolean) => ({
    padding: "8px 20px",
    borderRadius: "8px",
    border: primary ? "none" : "1px solid #dee2e6",
    backgroundColor: primary ? "#3b5bdb" : "#fff",
    color: primary ? "#fff" : "#495057",
    fontSize: "13px",
    fontWeight: 600 as const,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.15s ease",
  }),
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface ToolDetailModalProps {
  tool: Tool;
  onClose: () => void;
  /** An install reached the catalogue's own project (its card then says installed). */
  onInstalled?: (slug: string) => void;
}

/** The footer's install action, through the AISC platform: a control goes to
 *  the platform's controls app, a test is installed in place when the project
 *  is known and sent to the engine otherwise, and anything not installable
 *  says why. */
const InstallAction: React.FC<{
  slug: string;
  isControls: boolean;
  install: InstallInfoState;
  style: React.CSSProperties;
  onInstalled?: (slug: string) => void;
}> = ({ slug, isControls, install, style, onInstalled }) => {
  const { handshake } = useCrossSite();
  if (isControls) {
    return <ControlInstall slug={slug} handshake={handshake} style={style} onInstalled={onInstalled} />;
  }
  const coordinates = installCoordinates(install.info);
  if (coordinates && projectSlug()) {
    return <TestInstall coordinates={coordinates} style={style} onInstalled={onInstalled} />;
  }
  if (coordinates) {
    return (
      <InstallPluginButton
        pkg={coordinates.pkg}
        version={coordinates.version}
        slug={coordinates.slug}
        project={handshake?.project}
        label="Install into a project…"
        style={style}
      />
    );
  }
  return (
    <span style={{ color: "#6b7280", fontSize: 13, alignSelf: "center" }}>
      {install.error
        || (install.info ? (install.info.reason ?? "Not installable here.") : "Checking the package index…")}
    </span>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const ToolDetailModal: React.FC<ToolDetailModalProps> = ({ tool, onClose, onInstalled }) => {
  const isMobile = useIsMobile();
  const [toolTags, setToolTags] = useState<Tag[]>(tool.tags ?? []);

  useEffect(() => {
    // If tags aren't already loaded, fetch them
    if (!tool.tags || tool.tags.length === 0) {
      fetchToolTags(tool.id)
        .then(setToolTags)
        .catch((err) => console.error("Failed to load tool tags:", err));
    }
  }, [tool.id, tool.tags]);

  const meta = tool.metadata;

  const dimensionTags = toolTags.filter((t) => t.section === "dimension");
  const sectorTags = toolTags.filter((t) => t.section === "sector");
  const typeTags = toolTags.filter((t) => t.section === "type");
  const aiTypeTags = toolTags.filter((t) => t.section === "ai_type");
  const sourceTags = toolTags.filter((t) => t.section === "source");
  const subdimTags = toolTags.filter((t) => t.section === "controls_subdim");

  // A control if it carries a control/framework type tag or has a questionnaire.
  // Controls are compliance checklists, so they must NOT show the test-shaped
  // metadata (provider/branch/version/project maturity/testing solution …).
  const isControls =
    typeTags.some((t) => t.slug === "control" || t.slug === "framework") ||
    (tool.questions?.length ?? 0) > 0;
  // Only an entry tagged `control` can be exported as a checklist.
  const isInstallableControl = typeTags.some((t) => t.slug === "control");
  // The AISC platform answers install-info for a test; a control's install goes to the controls app
  // and never uses it.
  const install = useInstallInfo(!isInstallableControl ? tool.slug : null);
  const sourceLabel =
    sourceTags.map((t) => t.label).join(", ") || meta?.provider || "";

  const questionList = (
    <ol style={{ margin: "0 0 4px", paddingLeft: "20px" }}>
      {(tool.questions ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((q) => (
          <li
            key={q.id}
            style={{
              marginBottom: "8px",
              fontSize: "13px",
              lineHeight: 1.4,
              color: "#343a40",
            }}
          >
            {q.text}
            {(q.article || q.category) && (
              <span
                style={{
                  marginLeft: "6px",
                  fontSize: "10px",
                  color: "#3b5bdb",
                  backgroundColor: "#eef2ff",
                  padding: "1px 6px",
                  borderRadius: "8px",
                  whiteSpace: "nowrap",
                }}
              >
                {[q.article, q.category].filter(Boolean).join(" · ")}
              </span>
            )}
          </li>
        ))}
    </ol>
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button style={styles.closeButton} onClick={onClose}>
          &times;
        </button>

        <h2 style={styles.title}>{tool.name}</h2>

        <div
          style={{
            ...styles.twoCol,
            ...(isMobile ? { gridTemplateColumns: "1fr" } : {}),
          }}
        >
          {/* ── Left column ── */}
          <div>
            <div style={styles.sectionLabel}>Description</div>
            <div style={styles.sectionValue}>
              {meta?.description || tool.description}
            </div>

            <div style={styles.sectionLabel}>License</div>
            <div style={styles.sectionValue}>
              {tool.licensing === "Open_Source" ? "Open Source" : "Proprietary"}
              {meta?.link && (
                <>
                  {" / "}
                  <a
                    href={meta.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    hyperlink
                  </a>
                </>
              )}
            </div>

            <div style={styles.sectionLabel}>Verification type</div>
            <div style={styles.sectionValue}>
              {typeTags.length > 0
                ? typeTags.map((t) => t.label).join(", ")
                : "Technical test/control"}
            </div>

            {isControls ? (
              <>
                <div style={styles.sectionLabel}>Source</div>
                <div style={styles.sectionValue}>
                  {sourceLabel || <span style={styles.placeholder}>-</span>}
                  {meta?.link && (
                    <>
                      {" / "}
                      <a
                        href={meta.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.link}
                      >
                        hyperlink
                      </a>
                    </>
                  )}
                </div>

                <div style={styles.sectionLabel}>Control topic</div>
                <div style={styles.sectionValue}>
                  {meta?.control_topic || (
                    <span style={styles.placeholder}>-</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={styles.sectionLabel}>Provider</div>
                <div style={styles.sectionValue}>
                  {meta?.provider || (
                    <span style={styles.placeholder}>Provider name</span>
                  )}
                </div>

                <div style={styles.sectionLabel}>Project</div>
                <div>
                  {meta?.link ? (
                    <a
                      href={meta.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.link}
                    >
                      hyperlink
                    </a>
                  ) : (
                    <span style={styles.placeholder}>-</span>
                  )}
                </div>

                <div style={styles.sectionLabel}>Testing solution</div>
                <div>
                  {aiTypeTags.length > 0 ? (
                    aiTypeTags.map((t) => (
                      <span
                        key={t.id}
                        style={styles.tagPill(t.color_bg, t._color_text)}
                      >
                        {t.label}
                      </span>
                    ))
                  ) : (
                    <span style={styles.placeholder}>-</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Right column ── */}
          <div>
            {isControls ? (
              <>
                <div style={styles.sectionLabel}>Control sub-dimensions</div>
                <div>
                  {subdimTags.length > 0 ? (
                    subdimTags.map((t) => (
                      <span
                        key={t.id}
                        style={styles.tagPill(t.color_bg, t._color_text)}
                      >
                        {t.label}
                      </span>
                    ))
                  ) : (
                    <span style={styles.placeholder}>-</span>
                  )}
                </div>

                <div style={styles.sectionLabel}>Sector</div>
                <div>
                  {sectorTags.length > 0 ? (
                    sectorTags.map((t) => (
                      <span
                        key={t.id}
                        style={styles.tagPill(t.color_bg, t._color_text)}
                      >
                        {t.label}
                      </span>
                    ))
                  ) : (
                    <span style={styles.placeholder}>-</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={styles.sectionLabel}>Branch</div>
                <div style={styles.sectionValue}>
                  {meta?.branch || (
                    <span style={styles.placeholder}>XXXXXXXXXX</span>
                  )}
                </div>

                <div style={styles.sectionLabel}>Version</div>
                <div style={styles.sectionValue}>
                  {tool.version || (
                    <span style={styles.placeholder}>XXXXXXXXXX</span>
                  )}
                </div>

                <div style={styles.sectionLabel}>Project Maturity</div>
                <div style={styles.sectionValue}>
                  {meta?.project_maturity || (
                    <span style={styles.placeholder}>XXXXXXXXXX</span>
                  )}
                </div>

                <div style={styles.sectionLabel}>Scientific reference</div>
                <div style={styles.sectionValue}>
                  {meta?.scientific_reference || (
                    <span style={styles.placeholder}>-</span>
                  )}
                </div>

                <div style={styles.sectionLabel}>Sector</div>
                <div>
                  {sectorTags.length > 0 ? (
                    sectorTags.map((t) => (
                      <span
                        key={t.id}
                        style={styles.tagPill(t.color_bg, t._color_text)}
                      >
                        {t.label}
                      </span>
                    ))
                  ) : (
                    <span style={styles.placeholder}>-</span>
                  )}
                </div>

                <div style={styles.sectionLabel}>Target system</div>
                <div>
                  {aiTypeTags.length > 0 ? (
                    aiTypeTags.map((t) => (
                      <span
                        key={t.id}
                        style={styles.tagPill(t.color_bg, t._color_text)}
                      >
                        {t.label}
                      </span>
                    ))
                  ) : (
                    <span style={styles.placeholder}>-</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <hr style={styles.divider} />

        {/* Trustworthiness dimension tags */}
        {dimensionTags.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            {dimensionTags.map((t) => (
              <span
                key={t.id}
                style={styles.tagPill(t.color_bg, t._color_text)}
              >
                {t.label}
              </span>
            ))}
          </div>
        )}

        {/* ── Target legal requirements ───────────────────── */}
        {meta?.target_legal_requirements && (
          <>
            <div style={styles.sectionLabel}>Target legal requirements</div>
            <div style={styles.longBlock}>{meta.target_legal_requirements}</div>
          </>
        )}

        {/* ── Input Specification ───────────────────────── */}
        {meta?.input_spec && (
          <>
            <div style={styles.sectionLabel}>Input specification</div>
            <div style={styles.longBlock}>{meta.input_spec}</div>
          </>
        )}

        {/* ── Configuration Parameters ──────────────────── */}
        {meta?.config_params && (
          <>
            <div style={styles.sectionLabel}>Configuration parameters</div>
            <div style={styles.longBlock}>{meta.config_params}</div>
          </>
        )}

        {/* ── Output specification: metrics ────────────── */}
        {(tool.metrics ?? []).length > 0 && (
          <>
            <div style={styles.sectionLabel}>
              Output specification: metrics
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.metricsTable}>
                <thead>
                  <tr>
                    <th style={styles.metricsTh}>Name</th>
                    <th style={styles.metricsTh}>Type</th>
                    <th style={styles.metricsTh}>Range</th>
                    <th style={styles.metricsTh}>Unit</th>
                    <th style={styles.metricsTh}>What it represents</th>
                  </tr>
                </thead>
                <tbody>
                  {(tool.metrics ?? []).map((m) => (
                    <tr key={m.id}>
                      <td style={styles.metricsTd}>
                        <strong>{m.name}</strong>
                        {m.is_derived && (
                          <span
                            style={{
                              marginLeft: "6px",
                              fontSize: "10px",
                              color: "#92400e",
                              backgroundColor: "#fff8e1",
                              padding: "1px 6px",
                              borderRadius: "8px",
                              textTransform: "uppercase",
                              letterSpacing: "0.3px",
                            }}
                          >
                            derived
                          </span>
                        )}
                        {m.formula && (
                          <div
                            style={{
                              fontFamily: "monospace",
                              fontSize: "11px",
                              color: "#6c757d",
                              marginTop: "2px",
                            }}
                          >
                            {m.formula}
                          </div>
                        )}
                      </td>
                      <td style={styles.metricsTd}>{m.data_type}</td>
                      <td style={styles.metricsTd}>{m.range_str}</td>
                      <td style={styles.metricsTd}>{m.unit}</td>
                      <td style={styles.metricsTd}>{m.represents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Additional output fields ────────────────── */}
        {meta?.additional_output_fields && (
          <>
            <div style={styles.sectionLabel}>Additional output fields</div>
            <div style={styles.longBlock}>{meta.additional_output_fields}</div>
          </>
        )}

        {/* ── Contextual guidance ─────────────────────── */}
        {meta?.contextual_guidance && (
          <>
            <div style={styles.sectionLabel}>Contextual guidance</div>
            <div style={styles.longBlock}>{meta.contextual_guidance}</div>
          </>
        )}

        {/* ── Visualisation ─────────────────────────────── */}
        {meta?.visualisation && (
          <>
            <div style={styles.sectionLabel}>Visualisation</div>
            <div style={styles.longBlock}>{meta.visualisation}</div>
          </>
        )}

        {/* ── Reporting ─────────────────────────────────── */}
        {meta?.reporting && (
          <>
            <div style={styles.sectionLabel}>Reporting</div>
            <div style={styles.longBlock}>{meta.reporting}</div>
          </>
        )}

        {/* ── Compliance questions: folded away, a checklist can run to dozens ── */}
        {(tool.questions ?? []).length > 0 && (
          <details>
            <summary style={{ ...styles.sectionLabel, cursor: "pointer" }}>
              Compliance questions ({(tool.questions ?? []).length})
            </summary>
            {questionList}
          </details>
        )}

        <div style={styles.actionsRow}>
          <button style={styles.actionBtn(true)} onClick={onClose}>
            Close
          </button>
          {/* A framework is shown like a control but not installed as one: it
              takes the test path, where install-info says why not. */}
          <InstallAction
            slug={tool.slug}
            isControls={isInstallableControl}
            install={install}
            style={styles.actionBtn(false)}
            onInstalled={onInstalled}
          />
        </div>
      </div>
    </div>
  );
};

export default ToolDetailModal;