import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Metrics from "./Metrics";
import { CrossSiteProvider } from "../crossSite/CrossSiteContext";
import type { Metric, Tool } from "../services/catalogueApi";
import { fetchMetrics, fetchToolsDetailed, fetchTags } from "../services/catalogueApi";
import { projectSlug, fetchProjectCatalogue } from "../services/projectCatalogue";

vi.mock("../services/catalogueApi", () => ({
  fetchMetrics: vi.fn(),
  fetchToolsDetailed: vi.fn(),
  fetchTags: vi.fn(),
  fetchInstallInfo: vi.fn(),
}));

vi.mock("../services/projectCatalogue", () => ({
  projectSlug: vi.fn(),
  fetchProjectCatalogue: vi.fn(),
}));

const METRIC = {
  id: 1, name: "toxicity_rate", data_type: "float", range_str: "[0, 1]", unit: "ratio",
  represents: "Share of toxic answers", is_derived: false, formula: null, tool_id: 7,
  tool: { id: 7, slug: "langbite", name: "LangBiTe" }, dimensions: [],
} as Metric;

const TOOL = { id: 7, slug: "langbite", name: "LangBiTe", description: "", tags: [] } as unknown as Tool;

const INFO = { mode: "public" as const, chosen_at: null, updated_at: null, can_update: false };

const renderPage = () =>
  render(
    <CrossSiteProvider>
      <MemoryRouter>
        <Metrics />
      </MemoryRouter>
    </CrossSiteProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectSlug).mockReturnValue("acme");
  vi.mocked(fetchProjectCatalogue).mockResolvedValue(INFO);
  vi.mocked(fetchMetrics).mockResolvedValue([METRIC]);
  vi.mocked(fetchToolsDetailed).mockResolvedValue([TOOL]);
  vi.mocked(fetchTags).mockResolvedValue([]);
});

describe("Metrics page", () => {
  it("asks to open from a project when there is no slug, and loads nothing", async () => {
    vi.mocked(projectSlug).mockReturnValue(null);
    renderPage();
    expect(
      await screen.findByText("Open this catalogue from a project in the AISC launcher.")
    ).toBeInTheDocument();
    expect(fetchProjectCatalogue).not.toHaveBeenCalled();
    expect(fetchMetrics).not.toHaveBeenCalled();
    expect(fetchToolsDetailed).not.toHaveBeenCalled();
    expect(fetchTags).not.toHaveBeenCalled();
  });

  it("asks to choose the catalogue first on a 409, and loads nothing", async () => {
    vi.mocked(fetchProjectCatalogue).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { detail: "not chosen" } },
    });
    renderPage();
    expect(
      await screen.findByText("This project has not chosen its catalogue yet: open it from the project page.")
    ).toBeInTheDocument();
    expect(fetchMetrics).not.toHaveBeenCalled();
  });

  it("shows the project's metrics and the tool each belongs to", async () => {
    renderPage();
    expect(await screen.findByText("toxicity_rate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "LangBiTe" })).toBeInTheDocument();
    expect(fetchMetrics).toHaveBeenCalledTimes(1);
  });

  it("says so when the metrics cannot be loaded", async () => {
    vi.mocked(fetchMetrics).mockRejectedValue(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    expect(await screen.findByText("Failed to load metrics. Please try again.")).toBeInTheDocument();
  });
});
