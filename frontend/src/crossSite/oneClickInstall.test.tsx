// One-click install works the same way for tests and controls.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ToolDetailModal from "../components/catalogue/ToolDetailModal";
import { CrossSiteProvider } from "./CrossSiteContext";
import { dispatchInstall, buildEnableUri, STORAGE_KEY } from "./connect";
import type { Tool } from "../services/catalogueApi";
import { fetchInstallInfo } from "../services/catalogueApi";

vi.mock("../services/catalogueApi", () => ({
  fetchToolTags: vi.fn().mockResolvedValue([]),
  fetchInstallInfo: vi.fn(),
}));

const PID = "1e722ea2-4ce3-47fa-81bf-11a6b53ad679";
const ENTRY = { package: "aisc-plugin-example", version: "0.1.2", slug: "example" };
const LABEL = /install into a project/i;

const openMock = () => window.open as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  window.location.hash = "";
  (window as any).open = vi.fn().mockReturnValue({ focus: vi.fn() });
});

describe("dispatchInstall carries the project, and only safe values", () => {
  it("opens <targetEnv>/receiver?project=<pid>&uri=<enable URI> for a uuid project", () => {
    (dispatchInstall as any)("http://localhost/webapp", [ENTRY], PID);
    expect(openMock()).toHaveBeenCalledTimes(1);
    expect(openMock().mock.calls[0][0]).toBe(
      `http://localhost/webapp/receiver?project=${PID}&uri=${encodeURIComponent(buildEnableUri([ENTRY]))}`
    );
  });

  it("drops a project that is not a uuid", () => {
    (dispatchInstall as any)("http://localhost/webapp", [ENTRY], "../../evil");
    const url = openMock().mock.calls[0][0] as string;
    expect(url).not.toContain("project=");
    expect(url).not.toContain("evil");
    expect(url.startsWith("http://localhost/webapp/receiver?uri=")).toBe(true);
  });

  it("never opens a non-http(s) targetEnv, falls back to the custom protocol", () => {
    (dispatchInstall as any)("javascript:alert(1)//", [ENTRY], PID);
    expect(openMock()).toHaveBeenCalledWith(buildEnableUri([ENTRY]));
  });

  it("rejects a scheme-relative targetEnv too", () => {
    (dispatchInstall as any)("//elsewhere.example", [ENTRY], PID);
    expect(openMock()).toHaveBeenCalledWith(buildEnableUri([ENTRY]));
  });
});

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

const controlTool = () =>
  makeTool({
    slug: "iso-checklist",
    tags: [{ id: 9, slug: "control", label: "Control", section: "type" } as any],
  });

const withHandshake = () => {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      url: "http://localhost/webapp",
      expires: Date.now() + 60_000,
      controls: "http://localhost/controls",
      project: PID,
    })
  );
};

const show = (tool: Tool) =>
  render(
    <CrossSiteProvider>
      <ToolDetailModal tool={tool} onClose={() => {}} />
    </CrossSiteProvider>
  );

describe("the same button for tests and controls", () => {
  beforeEach(() => {
    vi.mocked(fetchInstallInfo).mockResolvedValue({
      slug: "example",
      package_name: "aisc-plugin-example",
      version: "0.1.2",
      index_url: "http://devpi:3141/root/public/+simple/",
      installable: true,
      reason: null,
    });
    withHandshake();
  });

  it("a test entry offers 'Install into a project…'", async () => {
    show(makeTool());
    expect(await screen.findByRole("link", { name: LABEL })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /enable plugin/i })).toBeNull();
  });

  it("both buttons carry the same style", async () => {
    const t = show(makeTool());
    const testStyle = (await screen.findByRole("link", { name: LABEL })).getAttribute("style");
    t.unmount();
    show(controlTool());
    const controlStyle = (await screen.findByRole("link", { name: LABEL })).getAttribute("style");
    expect(testStyle).toBe(controlStyle);
  });

  it("clicking install on a test opens one tab on the webapp receiver with the project", async () => {
    show(makeTool());
    fireEvent.click(await screen.findByRole("link", { name: LABEL }));
    expect(openMock()).toHaveBeenCalledTimes(1);
    const url = openMock().mock.calls[0][0] as string;
    expect(url.startsWith(`http://localhost/webapp/receiver?project=${PID}&uri=`)).toBe(true);
    expect(decodeURIComponent(url)).toContain("slug=example");
  });
});
