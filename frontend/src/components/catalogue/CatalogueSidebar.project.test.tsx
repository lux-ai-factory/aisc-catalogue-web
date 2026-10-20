import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CatalogueSidebar from "./CatalogueSidebar";

const props = (over: Record<string, unknown> = {}) => ({
  filters: {
    tab: "controls", selectedDimensions: [], selectedSectors: [],
    selectedAiSystems: [], selectedLicenses: [], selectedSources: [],
  },
  onFiltersChange: vi.fn(),
  searchQuery: "",
  onSearchChange: vi.fn(),
  pluginOnly: false,
  onPluginOnlyChange: vi.fn(),
  tags: [],
  ...over,
});

describe("CatalogueSidebar 'For this project' switch", () => {
  it("is not shown without the project filter prop", () => {
    render(<CatalogueSidebar {...(props() as any)} />);
    expect(screen.queryByText("For this project")).toBeNull();
  });

  it("shows the switch and reports a flip", () => {
    const onChange = vi.fn();
    render(
      <CatalogueSidebar
        {...(props({ projectFilter: { on: true, onChange, noDimensions: false } }) as any)}
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
        {...(props({ projectFilter: { on: true, onChange: vi.fn(), noDimensions: true } }) as any)}
      />
    );
    expect(
      screen.getByText("No control objectives selected yet: showing everything.")
    ).toBeInTheDocument();
  });
});
