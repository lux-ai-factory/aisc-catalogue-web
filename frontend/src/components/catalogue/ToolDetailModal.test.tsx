import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ToolDetailModal from "./ToolDetailModal";
import { CrossSiteProvider } from "../../crossSite/CrossSiteContext";
import { STORAGE_KEY } from "../../crossSite/connect";
import type { Tool } from "../../services/catalogueApi";
import type { Tag } from "../../services/catalogueApi";
import { fetchInstallInfo } from "../../services/catalogueApi";
import { setLocalDimensions } from "../../services/projectCatalogue";

// The modal resolves install coordinates on mount: the engine installs a
// distribution from the index, never a catalogue entry, so the footer can only
// offer an install once the platform has said which distribution and which
// version. The call the modal makes on mount is stubbed here. The page is the
// catalogue of a project (?project=acme): only a project's catalogue installs.

vi.mock("../../services/catalogueApi", () => ({
  fetchInstallInfo: vi.fn(),
}));

vi.mock("../../services/projectCatalogue", async (actual) => ({
  ...(await actual<typeof import("../../services/projectCatalogue")>()),
  setLocalDimensions: vi.fn(),
}));

const mockInstallInfo = vi.mocked(fetchInstallInfo);

const makeTool = (over: Partial<Tool> = {}): Tool =>
  ({
    id: 1,
    name: "Example",
    slug: "example",
    description: "desc",
    version: "1.0.0",
    licensing: "Open_Source",
    completion_status: "full",
    metadata: null,
    tags: [],
    metrics: [],
    ...over,
  }) as Tool;

const show = (tool: Tool = makeTool()) =>
  render(
    <CrossSiteProvider>
      <ToolDetailModal tool={tool} onClose={() => {}} />
    </CrossSiteProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/catalogue?project=acme");
});

describe("ToolDetailModal install action", () => {
  it("offers the install into this project once the index has a version", async () => {
    mockInstallInfo.mockResolvedValue({
      slug: "example",
      package_name: "aisc-plugin-example",
      version: "0.1.2",
      index_url: "http://devpi:3141/root/public/+simple/",
      installable: true,
      reason: null,
    });

    show();

    expect(await screen.findByRole("button", { name: /install into this project/i })).toBeInTheDocument();
    expect(mockInstallInfo).toHaveBeenCalledWith("example");
  });

  it("explains itself instead of offering an install that cannot work", async () => {
    mockInstallInfo.mockResolvedValue({
      slug: "example",
      package_name: "deepeval",
      version: null,
      index_url: "http://devpi:3141/root/public/+simple/",
      installable: false,
      reason: "deepeval is not on the index",
    });

    show();

    expect(await screen.findByText(/deepeval is not on the index/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /install into a project/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /install into a project/i })).toBeNull();
    // The unmodified Close button is still present (with the × button, also named Close).
    expect(screen.getAllByRole("button", { name: /close/i })).toHaveLength(2);
  });

  it("says so when the install service cannot be reached", async () => {
    mockInstallInfo.mockRejectedValue(new Error("network"));

    show();

    expect(await screen.findByText(/could not reach the catalogue/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /install into a project/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /install into a project/i })).toBeNull();
  });
});

describe("ToolDetailModal compliance questions", () => {
  const question = (id: number, text: string) => ({
    id,
    order: id,
    text,
    article: null,
    category: null,
  });

  it("folds the questions away under a summary that counts them", () => {
    mockInstallInfo.mockResolvedValue({
      slug: "example",
      package_name: "aisc-plugin-example",
      version: null,
      index_url: "",
      installable: false,
      reason: null,
    });
    show(makeTool({ questions: [question(1, "Is there a human in the loop?"), question(2, "Is bias measured?")] }));

    const summary = screen.getByText("Compliance questions (2)");
    expect(summary.tagName).toBe("SUMMARY");
    const details = summary.closest("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(details).toContainElement(screen.getByText("Is there a human in the loop?"));
    expect(details).toContainElement(screen.getByText("Is bias measured?"));
  });
});

describe("ToolDetailModal control install", () => {
  // The platform installs only what the catalogue exports as a control: an entry with the "control" type
  // tag (backend controls_export.is_control). A framework, or any entry with questions, is shown like a
  // control but must not take the control install, which the platform would refuse.
  const controlEntry = () =>
    makeTool({ slug: "accuracy", tags: [{ id: 1, slug: "control", label: "Control", section: "type" }] as Tool["tags"],
               questions: [{ id: 1, order: 1, text: "Q?" }] as Tool["questions"] });

  it("takes the control path for an entry with the control tag: without a handshake, it says how to reach it", async () => {
    sessionStorage.clear();
    mockInstallInfo.mockResolvedValue({ slug: "c", package_name: "", version: "", index_url: "", installable: false, reason: "a control" });
    show(controlEntry());
    expect(await screen.findByText(/install this control/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /install into a project/i })).toBeNull();
  });

  it("once the handshake has expired, says to open the catalogue again from the project page", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ url: "http://localhost/webapp", expires: Date.now() - 1, controls: "http://localhost/controls" })
    );
    try {
      show(controlEntry());
      expect(await screen.findByText("Open the catalogue again from the project page.")).toBeInTheDocument();
      expect(screen.queryByText(/Open the catalogue from your platform/)).toBeNull();
      expect(screen.queryByRole("link", { name: /install into a project/i })).toBeNull();
    } finally {
      sessionStorage.clear();
    }
  });

  it("is offered for an entry with the control tag once the platform's handshake says where its controls app is", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ url: "http://localhost/webapp", expires: Date.now() + 60_000, controls: "http://localhost/controls" })
    );
    try {
      show(controlEntry());
      expect(await screen.findByRole("link", { name: /install into a project/i })).toHaveAttribute(
        "href",
        "http://localhost/controls/install?slug=accuracy"
      );
      expect(screen.queryByText(/install this control/)).toBeNull();
    } finally {
      sessionStorage.clear();
    }
  });

  it("is not offered for a framework with questions", async () => {
    mockInstallInfo.mockResolvedValue({ slug: "f", package_name: "", version: "", index_url: "", installable: false, reason: "not on the index" });
    show(makeTool({ tags: [{ id: 2, slug: "framework", label: "Framework", section: "type" }] as Tool["tags"],
                    questions: [{ id: 1, order: 1, text: "Q?" }] as Tool["questions"] }));
    await screen.findByText(/Compliance questions/);
    await screen.findByText("Framework");
    expect(screen.queryByText(/install this control/)).toBeNull();
  });
});

describe("ToolDetailModal missing values", () => {
  beforeEach(() => {
    mockInstallInfo.mockResolvedValue({ slug: "example", package_name: "", version: null, index_url: "", installable: false, reason: "not on the index" });
  });

  it("shows '-' for a missing provider, branch, version and maturity, not the old form's placeholders", async () => {
    show(makeTool({ version: "", metadata: { provider: "", branch: "", project_maturity: "" } as Tool["metadata"] }));
    await screen.findByText("not on the index");
    expect(screen.queryByText("Provider name")).toBeNull();
    expect(screen.queryByText("XXXXXXXXXX")).toBeNull();
    for (const label of ["Provider", "Branch", "Version", "Project Maturity"]) {
      expect(screen.getByText(label).nextElementSibling).toHaveTextContent(/^-$/);
    }
  });

  it("hides the seed's 'Provider' placeholder, as the card does", async () => {
    show(makeTool({ metadata: { provider: "Provider" } as Tool["metadata"] }));
    await screen.findByText("not on the index");
    // the section's label only, not a value
    expect(screen.getAllByText("Provider")).toHaveLength(1);
    expect(screen.getByText("Provider").nextElementSibling).toHaveTextContent(/^-$/);
  });

  it("shows a real provider", async () => {
    show(makeTool({ metadata: { provider: "IBM Research" } as Tool["metadata"] }));
    expect(await screen.findByText("IBM Research")).toBeInTheDocument();
  });
});

describe("ToolDetailModal is a dialog", () => {
  beforeEach(() => {
    mockInstallInfo.mockResolvedValue({ slug: "example", package_name: "", version: null, index_url: "", installable: false, reason: "not on the index" });
  });

  const showWith = (onClose: () => void) =>
    render(
      <CrossSiteProvider>
        <ToolDetailModal tool={makeTool()} onClose={onClose} />
      </CrossSiteProvider>
    );

  it("is a modal dialog named by the entry", async () => {
    showWith(() => {});
    const dialog = await screen.findByRole("dialog", { name: "Example" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("names its × button Close, as the footer's", async () => {
    const onClose = vi.fn();
    showWith(onClose);
    const closers = await screen.findAllByRole("button", { name: "Close" });
    expect(closers).toHaveLength(2);
    fireEvent.click(closers[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    showWith(onClose);
    await screen.findByRole("dialog", { name: "Example" });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ToolDetailModal dimensions of a local test", () => {
  const tagOf = (slug: string, section: Tag["section"], label = slug) =>
    ({ id: Math.floor(Math.random() * 1e6), slug, label, section, color_bg: "#fff", _color_text: "#000", sort_order: 0 }) as Tag;
  const localTest = (dimensions: Tag[] = []) =>
    makeTool({
      slug: "local-my-probe",
      package_name: "my-probe",
      aisc_local: true,
      aisc_installed: true,
      tags: [tagOf("source-local", "source", "Local"), tagOf("test", "type"), ...dimensions],
    });
  const showWith = (tool: Tool, canClassify: boolean, onDimensionsSaved = vi.fn()) =>
    render(
      <CrossSiteProvider>
        <ToolDetailModal
          tool={tool}
          onClose={() => {}}
          canClassify={canClassify}
          onDimensionsSaved={onDimensionsSaved}
        />
      </CrossSiteProvider>
    );
  const box = (name: RegExp) => screen.getByRole("checkbox", { name });

  it("lets an admin of a private catalogue tick REQ1 to REQ11, starting from the entry's own", () => {
    showWith(localTest([tagOf("transparency", "dimension", "Transparency")]), true);
    expect(screen.getByRole("group", { name: "Dimensions" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(11);
    expect(box(/^REQ4 Transparency/)).toBeChecked();
    expect(box(/^REQ1 Human Agency/)).not.toBeChecked();
  });

  it("is not offered to someone who cannot classify", () => {
    showWith(localTest(), false);
    expect(screen.queryByRole("group", { name: "Dimensions" })).toBeNull();
  });

  it("is not offered for an entry that is not a local test", () => {
    showWith(makeTool({ package_name: "aisc-plugin-x", tags: [tagOf("aesia", "source"), tagOf("test", "type")] }), true);
    expect(screen.queryByRole("group", { name: "Dimensions" })).toBeNull();
    showWith(makeTool({ package_name: "x", tags: [tagOf("source-local", "source"), tagOf("control", "type")] }), true);
    expect(screen.queryByRole("group", { name: "Dimensions" })).toBeNull();
  });

  it("saves the ticked REQ ids in order under the entry's package, then says the catalogue changed", async () => {
    vi.mocked(setLocalDimensions).mockResolvedValue({ package_name: "my-probe", dimensions: ["REQ2", "REQ4"] });
    const saved = vi.fn();
    showWith(localTest([tagOf("transparency", "dimension")]), true, saved);
    fireEvent.click(box(/^REQ2 /));
    fireEvent.click(screen.getByRole("button", { name: "Save dimensions" }));
    expect(await screen.findByText("Dimensions saved.")).toBeInTheDocument();
    expect(setLocalDimensions).toHaveBeenCalledWith("my-probe", ["REQ2", "REQ4"]);
    expect(saved).toHaveBeenCalledTimes(1);
  });

  it("shows the platform's answer when the save is refused", async () => {
    vi.mocked(setLocalDimensions).mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { detail: "classifying a local plugin takes an admin" } },
    });
    const saved = vi.fn();
    showWith(localTest(), true, saved);
    fireEvent.click(screen.getByRole("button", { name: "Save dimensions" }));
    expect(await screen.findByText("classifying a local plugin takes an admin")).toBeInTheDocument();
    expect(saved).not.toHaveBeenCalled();
  });

  it("shows a plain message when the answer carries no text", async () => {
    vi.mocked(setLocalDimensions).mockRejectedValue(new Error("network"));
    showWith(localTest(), true);
    fireEvent.click(screen.getByRole("button", { name: "Save dimensions" }));
    expect(
      await screen.findByText("The dimensions could not be saved. Please try again.")
    ).toBeInTheDocument();
  });
});
