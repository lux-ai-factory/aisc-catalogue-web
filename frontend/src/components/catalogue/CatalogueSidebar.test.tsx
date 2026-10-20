import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CatalogueSidebar from "./CatalogueSidebar";
import type { SidebarFilters } from "./CatalogueSidebar";

const makeFilters = (over: Partial<SidebarFilters> = {}): SidebarFilters => ({
  tab: "tests",
  selectedDimensions: [],
  selectedSectors: [],
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
  tags: [],
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
    expect(screen.getByRole("button", { name: "Technical Robustness and Safety", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stress testing", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drift detection", pressed: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Human Agency and Oversight", pressed: false })).toBeInTheDocument();
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
      ["Transparency", "Privacy and Data Governance"],
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
