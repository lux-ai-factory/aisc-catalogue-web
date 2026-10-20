import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Catalogue from "./Catalogue";
import { CrossSiteProvider } from "../crossSite/CrossSiteContext";
import type { Tool, Tag } from "../services/catalogueApi";
import { fetchToolsDetailed, fetchTags } from "../services/catalogueApi";
import {
  projectSlug,
  fetchProjectCatalogue,
  updateFromPublic,
  fetchProjectDimensions,
} from "../services/projectCatalogue";

// Every other call is mocked: whatever reaches the network is a stray request.
const net = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.stubGlobal("fetch", net.fetch);
const strayFetches = () => net.fetch.mock.calls.map((call) => String(call[0]));

vi.mock("../services/catalogueApi", () => ({
  fetchToolsDetailed: vi.fn(),
  fetchTags: vi.fn(),
  fetchInstallInfo: vi.fn(),
}));

// The detail pop-up as a button that reports an install of its entry, as an install dialog does.
vi.mock("../components/catalogue/ToolDetailModal", () => ({
  default: ({ tool, onInstalled }: { tool: Tool; onInstalled?: (slug: string) => void }) => (
    <button onClick={() => onInstalled?.(tool.slug)}>{`install ${tool.name}`}</button>
  ),
}));

vi.mock("../services/projectCatalogue", () => ({
  projectSlug: vi.fn(),
  fetchProjectCatalogue: vi.fn(),
  updateFromPublic: vi.fn(),
  fetchProjectDimensions: vi.fn(),
}));

const tag = (slug: string, section: Tag["section"], parent?: string): Tag => ({
  id: Math.floor(Math.random() * 1e6),
  slug,
  label: slug,
  section,
  color_bg: "#fff",
  _color_text: "#000",
  sort_order: 0,
  parent_dimension_slug: parent ?? null,
});

const tool = (id: number, name: string, tags: Tag[]): Tool =>
  ({
    id, name, slug: name.toLowerCase(), description: "", version: "1", licensing: "Open_Source",
    created_at: "",
    completion_status: "full", metadata: null, metrics: [],
    tags: [tag("control", "type"), ...tags],
  }) as Tool;

const TOOLS = [
  tool(1, "Fair", [tag("fairness", "dimension")]),
  tool(2, "Private", [tag("privacy", "dimension")]),
  tool(3, "SubFair", [tag("bias-audit", "controls_subdim", "fairness")]),
];

const INFO = {
  mode: "private" as const,
  chosen_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-10-02T10:00:00Z",
  can_update: true,
};

const renderPage = () =>
  render(
    <CrossSiteProvider>
      <MemoryRouter>
        <Catalogue />
      </MemoryRouter>
    </CrossSiteProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectSlug).mockReturnValue("acme");
  vi.mocked(fetchProjectCatalogue).mockResolvedValue(INFO);
  vi.mocked(fetchProjectDimensions).mockResolvedValue(["fairness"]);
  vi.mocked(fetchToolsDetailed).mockResolvedValue(TOOLS);
  vi.mocked(fetchTags).mockResolvedValue([]);
});

describe("Catalogue page of a project", () => {
  it("asks to open from a project when there is no slug, and loads nothing", async () => {
    vi.mocked(projectSlug).mockReturnValue(null);
    renderPage();
    expect(
      await screen.findByText("Open this catalogue from a project in the AISC launcher.")
    ).toBeInTheDocument();
    expect(fetchToolsDetailed).not.toHaveBeenCalled();
    expect(fetchProjectCatalogue).not.toHaveBeenCalled();
  });

  // A public project reads the public catalogue live through the platform, here
  it("loads a public project's catalogue, says it is the live public one, and offers no update", async () => {
    vi.mocked(fetchProjectCatalogue).mockResolvedValue({ ...INFO, mode: "public", updated_at: null, can_update: true });
    renderPage();
    expect(await screen.findByText("Public catalogue · live")).toBeInTheDocument();
    expect(fetchToolsDetailed).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Update from public" })).toBeNull();
    expect(screen.queryByText(/Private catalogue/)).toBeNull();
  });

  it("asks to choose the catalogue first when the project has not, and loads nothing", async () => {
    vi.mocked(fetchProjectCatalogue).mockResolvedValue({ ...INFO, mode: null, updated_at: null });
    renderPage();
    expect(
      await screen.findByText("This project has not chosen its catalogue yet: open it from the project page.")
    ).toBeInTheDocument();
    expect(fetchToolsDetailed).not.toHaveBeenCalled();
  });

  it("says the same on a 409", async () => {
    vi.mocked(fetchProjectCatalogue).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { detail: "not chosen" } },
    });
    renderPage();
    expect(
      await screen.findByText("This project has not chosen its catalogue yet: open it from the project page.")
    ).toBeInTheDocument();
    expect(fetchToolsDetailed).not.toHaveBeenCalled();
  });

  it("shows the private catalogue line with the locale date", async () => {
    renderPage();
    const date = new Date(INFO.updated_at).toLocaleDateString();
    expect(
      await screen.findByText(`Private catalogue · updated on ${date}`)
    ).toBeInTheDocument();
  });

  it("hides Update from public when the person cannot update", async () => {
    vi.mocked(fetchProjectCatalogue).mockResolvedValue({ ...INFO, can_update: false });
    renderPage();
    await screen.findByText(/Private catalogue/);
    expect(screen.queryByRole("button", { name: "Update from public" })).toBeNull();
  });

  it("updates from public, reloads tools and tags, and shows the counts", async () => {
    vi.mocked(updateFromPublic).mockResolvedValue({
      added: 1, updated: 2, unchanged: 3, removed: 4, local_kept: 5,
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Update from public" }));
    expect(
      await screen.findByText("1 added, 2 updated, 3 unchanged, 4 removed; 5 local kept")
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchToolsDetailed).toHaveBeenCalledTimes(2));
    expect(fetchTags).toHaveBeenCalledTimes(2);
  });

  it("shows the answer's detail when the update fails", async () => {
    vi.mocked(updateFromPublic).mockRejectedValue({
      isAxiosError: true,
      response: { status: 503, data: { detail: "The public catalogue is not answering." } },
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Update from public" }));
    expect(
      await screen.findByText("The public catalogue is not answering.")
    ).toBeInTheDocument();
  });

  it("keeps the entries of the project's dimensions, sub-dimensions counting for their parent", async () => {
    renderPage();
    expect(await screen.findByText("Fair")).toBeInTheDocument();
    expect(screen.getByText("SubFair")).toBeInTheDocument();
    expect(screen.queryByText("Private")).toBeNull();
  });

  it("shows everything once 'For this project' is switched off", async () => {
    renderPage();
    await screen.findByText("Fair");
    fireEvent.click(screen.getByRole("switch", { name: /for this project/i }));
    expect(await screen.findByText("Private")).toBeInTheDocument();
  });

  it("calls fetch neither on load nor on focus", async () => {
    net.fetch.mockClear();
    renderPage();
    await screen.findByText("Fair");
    fireEvent.focus(window);
    expect(strayFetches()).toEqual([]);
  });

  it("does not filter, and says so, when the project has no dimensions yet", async () => {
    vi.mocked(fetchProjectDimensions).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Private")).toBeInTheDocument();
    expect(
      screen.getByText("No control objectives selected yet: showing everything.")
    ).toBeInTheDocument();
  });

  it("says so, and does not claim to filter, when the project's dimensions cannot be loaded", async () => {
    vi.mocked(fetchProjectDimensions).mockRejectedValue(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    expect(await screen.findByText("Private")).toBeInTheDocument();
    expect(
      screen.getByText("The project's dimensions could not be loaded: showing everything.")
    ).toBeInTheDocument();
    const sw = screen.getByRole("switch", { name: /for this project/i });
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(sw).toHaveAttribute("aria-disabled", "true");
  });

  it("shows a test framework on the Tests tab, not the Controls tab", async () => {
    const framework = {
      ...tool(4, "Harness", [tag("fairness", "dimension")]),
      tags: [tag("test-framework", "type"), tag("fairness", "dimension")],
    };
    vi.mocked(fetchToolsDetailed).mockResolvedValue([...TOOLS, framework]);
    renderPage();
    await screen.findByText("Fair");
    expect(screen.queryByText("Harness")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /tests/i }));
    expect(await screen.findByText("Harness")).toBeInTheDocument();
    expect(screen.queryByText("Fair")).toBeNull();
  });

  it("says the project's catalogue failed to load on another error, and loads nothing", async () => {
    vi.mocked(fetchProjectCatalogue).mockRejectedValue({
      isAxiosError: true,
      response: { status: 502, data: { detail: "bad gateway" } },
    });
    renderPage();
    expect(
      await screen.findByText("Failed to load the project's catalogue. Please try again.")
    ).toBeInTheDocument();
    expect(fetchToolsDetailed).not.toHaveBeenCalled();
  });

  it("shows the plain message when the update's detail is not text", async () => {
    vi.mocked(updateFromPublic).mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { detail: [{ loc: ["body"], msg: "bad" }] } },
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Update from public" }));
    expect(await screen.findByText("The update failed. Please try again.")).toBeInTheDocument();
  });

  it("marks the card installed once its entry is installed, without loading the catalogue again", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Fair" }));
    expect(screen.queryByText("Installed")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "install Fair" }));
    expect(await screen.findByText("Installed")).toBeInTheDocument();
    expect(fetchToolsDetailed).toHaveBeenCalledTimes(1);
  });

  it("a dimension and one of its sub-dimensions show only the entries of that sub-dimension", async () => {
    const ROBUSTNESS = "technical-robustness-safety";
    const named = (slug: string, label: string, section: Tag["section"], parent?: string) =>
      ({ ...tag(slug, section, parent), label });
    const robustness = named(ROBUSTNESS, "Technical Robustness and Safety", "dimension");
    const injection = named("prompt-injection", "Prompt Injection", "testing_subdim", ROBUSTNESS);
    const stress = named("stress-testing", "Stress testing", "testing_subdim", ROBUSTNESS);
    const testEntry = (id: number, name: string, tags: Tag[]) =>
      ({ ...tool(id, name, []), tags: [tag("test", "type"), ...tags] }) as Tool;
    vi.mocked(fetchToolsDetailed).mockResolvedValue([
      testEntry(11, "Injector", [robustness, injection]),
      testEntry(12, "Stresser", [robustness, stress]),
      testEntry(13, "Robust", [robustness]),
    ]);
    vi.mocked(fetchTags).mockResolvedValue([robustness, injection, stress]);
    vi.mocked(fetchProjectDimensions).mockResolvedValue([]);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /tests/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Technical Robustness and Safety" }));
    expect(await screen.findByText("Stresser")).toBeInTheDocument();
    expect(screen.getByText("Injector")).toBeInTheDocument();
    expect(screen.getByText("Robust")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Prompt Injection" }));
    expect(screen.getByText("Injector")).toBeInTheDocument();
    expect(screen.queryByText("Stresser")).toBeNull();
    expect(screen.queryByText("Robust")).toBeNull();
  });

  it("serves the footer images under the build's base path", async () => {
    vi.stubEnv("BASE_URL", "/private-catalogue/");
    try {
      renderPage();
      expect(await screen.findByAltText("LIST")).toHaveAttribute(
        "src",
        "/private-catalogue/img/LIST_2016_rgb_H75px 3.png"
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
