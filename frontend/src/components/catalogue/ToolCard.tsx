import React from "react";
import type { Tool } from "../../services/catalogueApi";
import { providerName } from "./entry";

// ─── Theme per variant ───────────────────────────────────────────────────────

const themes = {
  tests: {
    coloredBg: "#0A2EA41A",
    iconStroke: "#3b5bdb",
    tagBg: "#C5D2FF4D",
    tagColor: "#000FDF80",
    tagBorder: "#C5D2FF",
    arrowBg: "#000FDF",
  },
  // Pink/purple: used for controls and for Tests that are not fully ready.
  controls: {
    coloredBg: "#8D00DF1A",
    iconStroke: "#8D00DF",
    tagBg: "#D5A1F44D",
    tagColor: "#8D00DF80",
    tagBorder: "#D5A1F4",
    arrowBg: "#8D00DF",
  },
};

export type CardVariant = "tests" | "controls";

// ─── Styles ──────────────────────────────────────────────────────────────────

const baseStyles = {
  wrapper: (hovered: boolean) => ({
    backgroundColor: "#fff",
    borderRadius: "17px",
    boxShadow: hovered
      ? "0 8px 24px rgba(0,0,0,0.12)"
      : "0 2px 8px rgba(0,0,0,0.06)",
    cursor: "pointer",
    transition: "box-shadow 0.2s ease, transform 0.15s ease",
    transform: hovered ? "translateY(-2px)" : "none",
    overflow: "hidden" as const,
    fontFamily: "Arial, sans-serif",
    display: "flex",
    flexDirection: "column" as const,
  }),
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: "18px",
    fontWeight: 700 as const,
    color: "#1a1a2e",
    margin: 0,
  },
  // the title opens the entry: a button, so the keyboard reaches the card
  titleButton: {
    padding: 0,
    border: "none",
    background: "none",
    font: "inherit",
    color: "inherit",
    textAlign: "left" as const,
    cursor: "pointer",
  },
  iconsRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexShrink: 0,
  },
  iconSettings: {
    width: "22px",
    height: "22px",
    opacity: 0.4,
  },
  description: {
    fontSize: "14px",
    color: "#333",
    lineHeight: "1.6",
    flex: 1,
    overflow: "hidden" as const,
    display: "-webkit-box",
    WebkitLineClamp: 6,
    WebkitBoxOrient: "vertical" as const,
    margin: 0,
  },
  tagsRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  bottomArea: {
    backgroundColor: "#fff",
    padding: "14px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionText: {
    fontSize: "13px",
    fontWeight: 700 as const,
    color: "#1a1a2e",
  },
  natureRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
    alignItems: "center",
    marginTop: "2px",
  },
  metaChip: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 600 as const,
    whiteSpace: "nowrap" as const,
  },
  // Project catalogue: "Local" and "Installed" next to the title.
  projectBadge: {
    flexShrink: 0,
    marginLeft: "6px",
    padding: "2px 9px",
    borderRadius: "999px",
    border: "1px solid #000FDF",
    color: "#000FDF",
    backgroundColor: "#fff",
    fontSize: "11px",
    fontWeight: 700 as const,
    whiteSpace: "nowrap" as const,
  },
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface ToolCardProps {
  tool: Tool;
  variant?: CardVariant;
  onClick: (tool: Tool) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  variant = "tests",
  onClick,
}) => {
  const [hovered, setHovered] = React.useState(false);
  // Controls are always blue. Tests are blue when fully ready
  // (completion_status === "full"), otherwise the pink/purple theme.
  const isReady = tool.completion_status === "full";
  const t =
    variant === "controls" || isReady ? themes.tests : themes.controls;

  const isControls = variant === "controls";

  const allTags = tool.tags ?? [];
  const dimensionTags = allTags.filter((tag) => tag.section === "dimension");
  const subdimTags = allTags.filter((tag) => tag.section === "controls_subdim");
  const sourceTags = allTags.filter((tag) => tag.section === "source");

  // Controls read as compliance checklists (their control sub-dimensions);
  // tests read as measurement tools (their dimensions). Fall back to dimension
  // tags for a control that has no sub-dimensions yet.
  const primaryTags = isControls
    ? subdimTags.length > 0
      ? subdimTags
      : dimensionTags
    : dimensionTags;

  // Nature indicators, deliberately different per type so a control card does
  // not mirror a test card.
  const controlTopic = tool.metadata?.control_topic ?? null;
  // Tests show their provider (from metadata) the way controls show Source.
  const provider = providerName(tool.metadata);
  const questionCount = tool.questions?.length ?? 0;
  const metricCount = tool.metrics?.length ?? 0;

  return (
    <div
      style={baseStyles.wrapper(hovered)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(tool)}
    >
      {/* Top colored area */}
      <div
        style={{
          backgroundColor: t.coloredBg,
          padding: "24px 24px 16px 24px",
          margin: "4px 4px 0 4px",
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column" as const,
          gap: "10px",
          flex: 1,
        }}
      >
        <div style={baseStyles.topRow}>
          <h3 style={baseStyles.title}>
            <button
              type="button"
              style={baseStyles.titleButton}
              onClick={(e) => {
                e.stopPropagation();
                onClick(tool);
              }}
            >
              {tool.name}
            </button>
          </h3>
          {tool.aisc_local && (
            <span style={baseStyles.projectBadge}>Local</span>
          )}
          {tool.aisc_installed && (
            <span style={baseStyles.projectBadge}>Installed</span>
          )}
          <div style={baseStyles.iconsRow}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={t.iconStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><path d="M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3" /><path d="M9 3v4h6V3" /><path d="M9 14l2 2 4-4" /></svg>
          </div>
        </div>

        <p style={baseStyles.description}>{tool.description}</p>

        {primaryTags.length > 0 && (
          <div style={baseStyles.tagsRow}>
            {primaryTags.map((tag) => (
              <span
                key={tag.id}
                style={{
                  display: "inline-block",
                  padding: "4px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 400,
                  backgroundColor: t.tagBg,
                  color: t.tagColor,
                  border: `1px solid ${t.tagBorder}`,
                  alignSelf: "flex-start",
                }}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {/* Nature row, controls and tests deliberately show different info */}
        {(isControls
          ? !!controlTopic || sourceTags.length > 0 || questionCount > 0
          : !!provider || metricCount > 0) && (
          <div style={baseStyles.natureRow}>
            {isControls ? (
              <>
                {controlTopic && (
                  <span style={{ ...baseStyles.metaChip, backgroundColor: "#fff", color: "#1a1a2e", border: "1px solid #e0e0e0" }}>
                    {controlTopic}
                  </span>
                )}
                {sourceTags.map((tag) => (
                  <span
                    key={tag.id}
                    title="Source: originating body"
                    style={{ ...baseStyles.metaChip, backgroundColor: tag.color_bg, color: tag._color_text, border: `1px solid ${tag.color_bg}` }}
                  >
                    Source: {tag.label}
                  </span>
                ))}
                {questionCount > 0 && (
                  <span style={{ ...baseStyles.metaChip, backgroundColor: "#f3f4f6", color: "#444", border: "1px solid #e0e0e0" }}>
                    {questionCount} question{questionCount === 1 ? "" : "s"}
                  </span>
                )}
              </>
            ) : (
              <>
                {provider && (
                  <span
                    title="Provider of the test"
                    style={{ ...baseStyles.metaChip, backgroundColor: "#FDEAD7", color: "#9A5B00", border: "1px solid #FDEAD7" }}
                  >
                    Provider: {provider}
                  </span>
                )}
                {metricCount > 0 && (
                  <span style={{ ...baseStyles.metaChip, backgroundColor: "#f3f4f6", color: "#444", border: "1px solid #e0e0e0" }}>
                    {metricCount} metric{metricCount === 1 ? "" : "s"}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom white area */}
      <div style={baseStyles.bottomArea}>
        <span style={baseStyles.actionText}>
          Discover more
        </span>
        <button
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: t.arrowBg,
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.15s ease",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick(tool);
          }}
          title="View details"
          aria-label={`View details of ${tool.name}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ToolCard;
