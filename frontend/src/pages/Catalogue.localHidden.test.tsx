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

// "For this project" is on by default and keeps the entries of the project's dimensions. A local test of this
// stack has no dimensions until an admin gives it some, so the switch hides it: the page says so, instead of
// leaving the person to find it by switching the filter off or searching.

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

/** Whether some element's own text says that local tests are hidden. */
function saysLocalTestsAreHidden(): boolean {
  return [...document.body.querySelectorAll("*")].some((el) => {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ");
    const text = own.trim() ? own : "";
    return /local/i.test(text) && /(hidden|not shown|hides)/i.test(text);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectSlug).mockReturnValue("mijke-the-matchbot");
  vi.mocked(fetchProjectCatalogue).mockResolvedValue({ mode: "private", updated_at: "2026-11-13T10:00:00Z", can_update: true });
  vi.mocked(fetchProjectDimensions).mockResolvedValue(["fairness"]);
  vi.mocked(fetchTags).mockResolvedValue([]);
});

describe("Catalogue: local tests hidden by 'For this project'", () => {
  it("says that 'For this project' hides this stack's local tests", async () => {
    vi.mocked(fetchToolsDetailed).mockResolvedValue([PUBLIC_FAIRNESS, ...MIJKE_TESTS]);
    renderPage();
    await openTestsTab();
    expect(screen.queryByText("StrongREJECT (Mijke)")).toBeNull();
    expect(saysLocalTestsAreHidden(), "a notice that local tests are hidden by the filter").toBe(true);
  });

  it("says nothing about local tests when none is hidden", async () => {
    vi.mocked(fetchToolsDetailed).mockResolvedValue([PUBLIC_FAIRNESS]);
    renderPage();
    await openTestsTab();
    expect(saysLocalTestsAreHidden()).toBe(false);
  });
});
