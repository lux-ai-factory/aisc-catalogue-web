import { render, screen, fireEvent } from "@testing-library/react";
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
    const input = screen.getByPlaceholderText("Search by name");
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
