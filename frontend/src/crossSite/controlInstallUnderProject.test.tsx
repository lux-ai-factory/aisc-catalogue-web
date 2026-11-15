// The platform's ledger records an install only when it comes to the chosen project's own address in the
// controls app (/controls/p/<project>/...), where the gateway binds the request to that project. So the
// dialog installs there, and the link it falls back to opens the install page there too.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ToolDetailModal from "../components/catalogue/ToolDetailModal";
import { CrossSiteProvider } from "./CrossSiteContext";
import { STORAGE_KEY } from "./connect";
import type { Tool } from "../services/catalogueApi";

vi.mock("../services/catalogueApi", () => ({
  fetchInstallInfo: vi.fn().mockResolvedValue(null),
}));

const CONTROLS = "http://localhost/controls";
const P1 = "1e722ea2-4ce3-47fa-81bf-11a6b53ad679";
const LABEL = /install into a project/i;

const OPTIONS = {
  control: { title: "FRAIA", source: "S", topic: "Rights", questions: 2, description: null },
  projects: [{ pid: P1, name: "Mijke" }],
  preselect: P1,
  installed: {} as Record<string, string>,
};

const control = (): Tool =>
  ({
    id: 1, name: "FRAIA", slug: "fraia", description: "d", version: "1", licensing: "Open_Source",
    completion_status: "full", metadata: null, metrics: [],
    tags: [{ id: 9, slug: "control", label: "Control", section: "type" }],
  }) as unknown as Tool;

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ url: "http://localhost/webapp", expires: Date.now() + 60_000, controls: CONTROLS, project: P1 }),
  );
  fetchMock = vi.fn((_url: string, init?: RequestInit) =>
    init?.method === "POST" ? json({ path: `/p/${P1}/checklists/chk/fill` }) : json(OPTIONS));
  (globalThis as any).fetch = fetchMock;
});

function show() {
  render(
    <CrossSiteProvider>
      <ToolDetailModal tool={control()} onClose={() => {}} />
    </CrossSiteProvider>,
  );
}

describe("a control is installed through the chosen project's address", () => {
  it("the dialog posts the install under the project", async () => {
    show();
    fireEvent.click(await screen.findByRole("link", { name: LABEL }));
    const dialog = await screen.findByRole("dialog", { name: /install a control/i });
    fireEvent.click(await within(dialog).findByRole("button", { name: "Install" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    const [url] = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(url).toBe(`${CONTROLS}/p/${P1}/api/install`);
  });

  it("the fallback link opens the install page under the catalogue's project", async () => {
    show();
    const link = await screen.findByRole("link", { name: LABEL });
    expect(link.getAttribute("href")).toMatch(new RegExp(`^${CONTROLS}/p/${P1}/install\\?slug=fraia`));
  });
});
