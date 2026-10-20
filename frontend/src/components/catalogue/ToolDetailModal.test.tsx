import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ToolDetailModal from "./ToolDetailModal";
import { CrossSiteProvider } from "../../crossSite/CrossSiteContext";
import type { Tool } from "../../services/catalogueApi";
import { fetchInstallInfo, fetchToolTags } from "../../services/catalogueApi";

// The modal resolves install coordinates on mount: the engine installs a
// distribution from the index, never a catalogue entry, so the footer can only
// offer an enable once the platform has said which distribution and which
// version. Both calls the modal makes on mount are stubbed here.

vi.mock("../../services/catalogueApi", () => ({
  fetchToolTags: vi.fn().mockResolvedValue([]),
  fetchInstallInfo: vi.fn(),
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
    status: "approved",
    submitted_by: "admin",
    reviewed_by: "admin",
    reviewed_at: "",
    created_at: "",
    storage_path: "/packages/example",
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
});

describe("ToolDetailModal install action", () => {
  it("offers the enable once the index has a version", async () => {
    mockInstallInfo.mockResolvedValue({
      slug: "example",
      package_name: "aisc-plugin-example",
      version: "0.1.2",
      index_url: "http://devpi:3141/root/public/+simple/",
      installable: true,
      reason: null,
    });

    show();

    // The same label as a control's button.
    const link = await screen.findByRole("link", { name: /install into a project/i });
    // The URI is the whole contract with the engine: the distribution and the
    // version to install, plus the catalogue entry it came from.
    expect(link).toHaveAttribute(
      "href",
      "web+aiscplugin://enable?package=aisc-plugin-example&version=0.1.2&slug=example"
    );
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
    expect(screen.queryByRole("link", { name: /enable plugin/i })).toBeNull();
    // The unmodified Close button is still present.
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("says so when the install service cannot be reached", async () => {
    mockInstallInfo.mockRejectedValue(new Error("network"));

    show();

    expect(await screen.findByText(/could not reach the catalogue/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /enable plugin/i })).toBeNull();
  });
});

describe("ToolDetailModal compliance questions", () => {
  const question = (id: number, text: string) => ({
    id,
    tool_id: 1,
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
  const withTags = (tags: Tool["tags"]) => vi.mocked(fetchToolTags).mockResolvedValue(tags as never);

  // The platform installs only what the catalogue exports as a control: an entry with the "control" type
  // tag (backend controls_export.is_control). A framework, or any entry with questions, is shown like a
  // control but must not take the control install, which the platform would refuse.
  it("is offered for an entry with the control tag", async () => {
    withTags([{ id: 1, slug: "control", label: "Control", section: "type" }] as Tool["tags"]);
    mockInstallInfo.mockResolvedValue({ slug: "c", package_name: "", version: "", index_url: "", installable: false, reason: "a control" });
    show(makeTool({ tags: [{ id: 1, slug: "control", label: "Control", section: "type" }] as Tool["tags"],
                    questions: [{ id: 1, order: 1, text: "Q?" }] as Tool["questions"] }));
    // without a platform handshake the control path says how to reach it
    expect(await screen.findByText(/install this control/)).toBeInTheDocument();
  });

  it("is not offered for a framework with questions", async () => {
    withTags([{ id: 2, slug: "framework", label: "Framework", section: "type" }] as Tool["tags"]);
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
    // a test entry: an earlier test may have left the tag lookup answering a control's tags
    vi.mocked(fetchToolTags).mockResolvedValue([]);
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
