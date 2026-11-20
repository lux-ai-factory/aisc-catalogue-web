import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Catalogue from "./Catalogue";
import { CrossSiteProvider } from "../crossSite/CrossSiteContext";
import type { Tool, Tag } from "../services/catalogueApi";
import { fetchToolsDetailed, fetchTags } from "../services/catalogueApi";
import {
  projectSlug,
  fetchProjectCatalogue,
  fetchProjectDimensions,
} from "../services/projectCatalogue";

// The catalogue shows every entry. A local test of this stack that has none of the project's dimensions is
// listed like any other, with no notice about a hidden entry and no project switch.

vi.stubGlobal("fetch", vi.fn());

vi.mock("../services/catalogueApi", () => ({
  fetchToolsDetailed: vi.fn(),
  fetchTags: vi.fn(),
  fetchInstallInfo: vi.fn(),
}));

vi.mock("../components/catalogue/ToolDetailModal", () => ({ default: () => null }));

vi.mock("../services/projectCatalogue", () => ({
  projectSlug: vi.fn(),
  fetchProjectCatalogue: vi.fn(),
  updateFromPublic: vi.fn(),
  fetchProjectDimensions: vi.fn(),
}));

const tag = (slug: string, section: Tag["section"]): Tag => ({
  id: Math.floor(Math.random() * 1e6),
  slug,
  label: slug,
  section,
  color_bg: "#fff",
  _color_text: "#000",
  sort_order: 0,
  parent_dimension_slug: null,
});

const test = (id: number, name: string, tags: Tag[], packageName: string | null = null): Tool =>
  ({
    id, name, slug: name.toLowerCase().replace(/\W+/g, "-"), description: "", version: "1",
    licensing: "Open_Source", completion_status: "full", metadata: null, metrics: [],
    package_name: packageName, tags: [tag("test", "type"), ...tags],
  }) as Tool;

const PUBLIC_FAIRNESS = test(1, "LangBiTe", [tag("fairness", "dimension")], "aisc-plugin-langbite");
const MIJKE_TESTS = [
  test(2, "StrongREJECT (Mijke)", [tag("source-local", "source")], "aisc-plugin-strongreject-mijke"),
  test(3, "LangBiTe (Mijke)", [tag("source-local", "source")], "aisc-plugin-langbite-mijke"),
];

const renderPage = () =>
  render(
    <CrossSiteProvider>
      <MemoryRouter>
        <Catalogue />
      </MemoryRouter>
    </CrossSiteProvider>
  );

async function openTestsTab() {
  await screen.findByRole("button", { name: /^Tests$/ });
  screen.getByRole("button", { name: /^Tests$/ }).click();
  await screen.findByText("LangBiTe");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectSlug).mockReturnValue("mijke-the-matchbot");
  vi.mocked(fetchProjectCatalogue).mockResolvedValue({ mode: "private", updated_at: "2026-11-13T10:00:00Z", can_update: true });
  vi.mocked(fetchProjectDimensions).mockResolvedValue(["fairness"]);
  vi.mocked(fetchTags).mockResolvedValue([]);
});

describe("Catalogue: local tests are listed", () => {
  it("shows a local test with none of the project's dimensions", async () => {
    vi.mocked(fetchProjectDimensions).mockResolvedValue(["REQ5"]);
    vi.mocked(fetchToolsDetailed).mockResolvedValue([
      test(2, "Local Probe", [tag("local", "source")], "aisc-plugin-local-probe"),
      PUBLIC_FAIRNESS,
    ]);
    renderPage();
    await openTestsTab();
    expect(screen.getByText("Local Probe")).toBeInTheDocument();
    expect(screen.queryByText(/hidden by "For this project"/)).toBeNull();
  });

  it("shows the page of a project without a 'For this project' switch", async () => {
    vi.mocked(fetchToolsDetailed).mockResolvedValue([PUBLIC_FAIRNESS, ...MIJKE_TESTS]);
    renderPage();
    await openTestsTab();
    expect(screen.queryByRole("switch", { name: /for this project/i })).toBeNull();
    expect(screen.getByText("StrongREJECT (Mijke)")).toBeInTheDocument();
  });
});
