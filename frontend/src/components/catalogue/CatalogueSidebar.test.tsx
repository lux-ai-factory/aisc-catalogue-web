import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CatalogueSidebar from "./CatalogueSidebar";
import type { SidebarFilters } from "./CatalogueSidebar";
import type { Tag } from "../../services/catalogueApi";

// The catalogue's tags as its API gives them (catalogue seed.py): labels with "&" and "well-being",
// which the sidebar's old built-in lists spelled "and" and "Wellbeing"; a sort_order per tag, not the
// order of the list; sub-dimensions of tests and of controls naming their dimension.
let nextId = 1;
const t = (label: string, slug: string, section: Tag["section"], sort_order: number, parent?: string): Tag => ({
  id: nextId++, slug, label, section, color_bg: "#fff", _color_text: "#000", sort_order,
  parent_dimension_slug: parent ?? null,
});
const TAGS: Tag[] = [
  t("Societal & environmental well-being", "societal-environmental-wellbeing", "dimension", 6),
  t("Technical Robustness & Safety", "technical-robustness-safety", "dimension", 1),
  t("Transparency", "transparency", "dimension", 5),
  t("Privacy & Data Governance", "privacy-data-governance", "dimension", 3),
  t("Accountability", "accountability", "dimension", 7),
  t("Drift detection", "drift-detection", "testing_subdim", 3, "technical-robustness-safety"),
  t("Stress testing", "stress-testing", "testing_subdim", 0, "technical-robustness-safety"),
  t("Prompt Injection", "prompt-injection", "testing_subdim", 6, "technical-robustness-safety"),
  t("Local interpretability", "local-interpretability", "testing_subdim", 25, "transparency"),
  t("PII detection testing", "pii-detection-testing", "testing_subdim", 18, "privacy-data-governance"),
  t("Energy consumption tracking", "energy-consumption-tracking", "testing_subdim", 30, "societal-environmental-wellbeing"),
  t("Human fallback", "human-fallback", "controls_subdim", 6, "technical-robustness-safety"),
  t("Model cards", "model-cards", "controls_subdim", 16, "transparency"),
  t("Pseudonymisation", "pseudonymisation", "controls_subdim", 9, "privacy-data-governance"),
  t("RASCI charts", "rasci-charts", "controls_subdim", 26, "accountability"),
  t("Audio", "audio", "ai_type", 2),
  t("Multimodal", "multimodal", "ai_type", 0),
  t("Computer Vision", "computer-vision", "ai_type", 1),
  t("Natural Language Processing", "natural-language-processing", "ai_type", 3),
  t("Knowledge & Retrieval", "knowledge-and-retrieval", "ai_type", 4),
  t("Decision & Optimization", "decision-and-optimization", "ai_type", 5),
  t("Agents & Agentic Systems", "agents-and-agentic-systems", "ai_type", 11),
];

const makeFilters = (over: Partial<SidebarFilters> = {}): SidebarFilters => ({
  tab: "tests",
  selectedDimensions: [],
  selectedAiSystems: [],
  selectedLicenses: [],
  selectedSources: [],
  ...over,
});

const baseProps = (over: Record<string, unknown> = {}) => ({
  filters: makeFilters(),
  onFiltersChange: vi.fn(),
  searchQuery: "",
  onSearchChange: vi.fn(),
  pluginOnly: false,
  onPluginOnlyChange: vi.fn(),
  tags: TAGS,
  ...over,
});

describe("CatalogueSidebar search + plugin filter", () => {
  it("renders the search box in the sidebar and reports typing", () => {
    const onSearchChange = vi.fn();
    render(<CatalogueSidebar {...(baseProps({ onSearchChange }) as any)} />);
    const input = screen.getByRole("textbox", { name: "Search the catalogue" });
    // the search matches the description too
    expect(input).toHaveAttribute("placeholder", "Search by name or description");
    fireEvent.change(input, { target: { value: "presidio" } });
    expect(onSearchChange).toHaveBeenCalledWith("presidio");
  });

  it("shows the Plugin-available toggle on the Tests tab and flips it", () => {
    const onPluginOnlyChange = vi.fn();
    render(
      <CatalogueSidebar
        {...(baseProps({ filters: makeFilters({ tab: "tests" }), onPluginOnlyChange }) as any)}
      />
    );
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");
    fireEvent.click(sw);
    expect(onPluginOnlyChange).toHaveBeenCalledWith(true);
  });

  it("reaches the switches with the keyboard and flips them with Space", () => {
    const onPluginOnlyChange = vi.fn();
    const onChange = vi.fn();
    render(
      <CatalogueSidebar
        {...(baseProps({
          onPluginOnlyChange,
          projectFilter: { on: true, onChange, noDimensions: false },
        }) as any)}
      />
    );
    const project = screen.getByRole("switch", { name: /for this project/i });
    const plugin = screen.getByRole("switch", { name: /plugin available/i });
    for (const sw of [project, plugin]) expect(sw.tagName).toBe("BUTTON");
    project.focus();
    expect(project).toHaveFocus();
    userEvent.tab();
    expect(plugin).toHaveFocus();
    userEvent.keyboard(" ");
    expect(onPluginOnlyChange).toHaveBeenCalledWith(true);
  });

  it("hides the Plugin-available toggle on the Controls tab", () => {
    render(
      <CatalogueSidebar {...(baseProps({ filters: makeFilters({ tab: "controls" }) }) as any)} />
    );
    expect(screen.queryByRole("switch")).toBeNull();
  });
});

describe("CatalogueSidebar sector facet", () => {
  it("does not show the Sector filter on the Tests tab", () => {
    render(<CatalogueSidebar {...(baseProps({ filters: makeFilters({ tab: "tests" }) }) as any)} />);
    expect(screen.queryByText("Sector")).toBeNull();
    expect(screen.queryByText("Agriculture")).toBeNull();
  });
});

describe("CatalogueSidebar filter buttons say whether they are on", () => {
  const sourceTag = { id: 1, slug: "aesia", label: "AESIA", section: "source" };

  it("Tests and Controls are buttons that say which one is on", () => {
    render(<CatalogueSidebar {...(baseProps({ filters: makeFilters({ tab: "controls" }) }) as any)} />);
    expect(screen.getByRole("button", { name: /controls/i, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tests/i, pressed: false })).toBeInTheDocument();
  });

  it("AI system and License are buttons, pressed when selected, and report a click", () => {
    const onFiltersChange = vi.fn();
    render(
      <CatalogueSidebar
        {...(baseProps({
          onFiltersChange,
          filters: makeFilters({ selectedAiSystems: ["Computer Vision"], selectedLicenses: ["Open"] }),
        }) as any)}
      />
    );
    expect(screen.getByRole("button", { name: "Computer Vision", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open", pressed: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Closed", pressed: false }));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ selectedLicenses: ["Open", "Closed"] })
    );
    fireEvent.click(screen.getByRole("button", { name: "Multimodal", pressed: false }));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ selectedAiSystems: ["Computer Vision", "Multimodal"] })
    );
  });

  it("Source is a button on the Controls tab, pressed when selected", () => {
    const onFiltersChange = vi.fn();
    render(
      <CatalogueSidebar
        {...(baseProps({ onFiltersChange, tags: [sourceTag], filters: makeFilters({ tab: "controls" }) }) as any)}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "AESIA", pressed: false }));
    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ selectedSources: ["AESIA"] }));
  });

  it("a dimension and its sub-dimensions say whether they are selected", () => {
    render(
      <CatalogueSidebar
        {...(baseProps({
          filters: makeFilters({ selectedDimensions: ["technical-robustness-safety", "stress-testing"] }),
        }) as any)}
      />
    );
    expect(screen.getByRole("button", { name: "Technical Robustness & Safety", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stress testing", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drift detection", pressed: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Privacy & Data Governance", pressed: false })).toBeInTheDocument();
  });
});

describe("CatalogueSidebar selected filters look selected", () => {
  it("a selected dimension, AI system and license have their own background", () => {
    render(
      <CatalogueSidebar
        {...(baseProps({
          filters: makeFilters({
            selectedDimensions: ["transparency"],
            selectedAiSystems: ["Computer Vision"],
            selectedLicenses: ["Open"],
          }),
        }) as any)}
      />
    );
    const bg = (name: string) => screen.getByRole("button", { name }).style.backgroundColor;
    for (const [on, off] of [
      ["Transparency", "Privacy & Data Governance"],
      ["Computer Vision", "Multimodal"],
      ["Open", "Closed"],
    ]) {
      expect(bg(on)).not.toBe(bg(off));
    }
  });
});

// on the Controls tab, as the catalogue opens
const controlsProps = (over: Record<string, unknown> = {}) =>
  baseProps({ filters: makeFilters({ tab: "controls" }), ...over });

describe("CatalogueSidebar 'For this project' switch", () => {
  it("is not shown without the project filter prop", () => {
    render(<CatalogueSidebar {...(controlsProps() as any)} />);
    expect(screen.queryByText("For this project")).toBeNull();
  });

  it("shows the switch and reports a flip", () => {
    const onChange = vi.fn();
    render(
      <CatalogueSidebar
        {...(controlsProps({ projectFilter: { on: true, onChange, noDimensions: false } }) as any)}
      />
    );
    const sw = screen.getByRole("switch", { name: /for this project/i });
    expect(sw).toHaveAttribute("aria-checked", "true");
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText(/No control objectives selected yet/)).toBeNull();
  });

  it("notes that everything shows when the project has no dimensions yet", () => {
    render(
      <CatalogueSidebar
        {...(controlsProps({ projectFilter: { on: true, onChange: vi.fn(), noDimensions: true } }) as any)}
      />
    );
    expect(
      screen.getByText("No control objectives selected yet: showing everything.")
    ).toBeInTheDocument();
  });
});

describe("CatalogueSidebar lists come from the catalogue's tags", () => {
  const names = (role: HTMLElement[]) => role.map((b) => b.textContent);
  const dimensionButtons = () =>
    screen.getAllByRole("button").filter((b) => TAGS.some((x) => x.section === "dimension" && x.label === b.textContent));

  it("shows the tags' labels, not the old built-in ones", () => {
    render(<CatalogueSidebar {...(baseProps() as any)} />);
    expect(screen.getByRole("button", { name: "Societal & environmental well-being" })).toBeInTheDocument();
    for (const old of ["Societal and Environmental Wellbeing", "Societal and Environmental Well-being",
                       "Technical Robustness and Safety", "Human Agency and Oversight"]) {
      expect(screen.queryByRole("button", { name: old })).toBeNull();
    }
  });

  it("orders the dimensions by their sort_order", () => {
    render(<CatalogueSidebar {...(controlsProps() as any)} />);
    expect(names(dimensionButtons())).toEqual([
      "Technical Robustness & Safety", "Privacy & Data Governance", "Transparency", "Accountability",
    ]);
  });

  it("shows on each tab the dimensions with sub-dimensions of that tab", () => {
    render(<CatalogueSidebar {...(baseProps() as any)} />);
    expect(names(dimensionButtons())).toEqual([
      "Technical Robustness & Safety", "Privacy & Data Governance", "Transparency", "Societal & environmental well-being",
    ]);
    expect(screen.queryByRole("button", { name: "Accountability" })).toBeNull();
  });

  it("a dimension that has no sub-dimensions at all shows on both tabs", () => {
    const extra = t("Record-keeping", "record-keeping", "dimension", 11);
    const { unmount } = render(<CatalogueSidebar {...(baseProps({ tags: [...TAGS, extra] }) as any)} />);
    expect(screen.getByRole("button", { name: "Record-keeping" })).toBeInTheDocument();
    unmount();
    render(<CatalogueSidebar {...(controlsProps({ tags: [...TAGS, extra] }) as any)} />);
    expect(screen.getByRole("button", { name: "Record-keeping" })).toBeInTheDocument();
  });

  it("opens a dimension on the tab's own sub-dimensions, in their sort_order", () => {
    render(<CatalogueSidebar {...(baseProps() as any)} />);
    fireEvent.click(screen.getByRole("button", { name: "Technical Robustness & Safety" }));
    const subs = ["Stress testing", "Drift detection", "Prompt Injection"];
    const shown = screen.getAllByRole("button").map((b) => b.textContent).filter((n) => subs.includes(n ?? ""));
    expect(shown).toEqual(subs);
    expect(screen.queryByRole("button", { name: "Human fallback" })).toBeNull();
  });

  it("lists the AI systems of the ai_type tags in their sort_order, six until See more", () => {
    render(<CatalogueSidebar {...(baseProps() as any)} />);
    const ai = TAGS.filter((x) => x.section === "ai_type").sort((a, b) => a.sort_order - b.sort_order).map((x) => x.label);
    const shown = () => screen.getAllByRole("button").map((b) => b.textContent).filter((n) => ai.includes(n ?? ""));
    expect(shown()).toEqual(ai.slice(0, 6));
    fireEvent.click(screen.getByRole("button", { name: "See more +" }));
    expect(shown()).toEqual(ai);
  });

  it("lists no dimension and no AI system before the tags have loaded", () => {
    render(<CatalogueSidebar {...(baseProps({ tags: [] }) as any)} />);
    expect(screen.queryByRole("button", { name: "Transparency" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Multimodal" })).toBeNull();
    expect(screen.queryByRole("button", { name: "See more +" })).toBeNull();
  });
});
