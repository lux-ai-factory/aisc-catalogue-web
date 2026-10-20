// A control is installed without leaving the catalogue: "Install into a
// project…" opens a dialog here, which asks the platform's controls app (from
// the browser, with the person's sign-in) which projects may get it, and installs
// into the chosen one. The catalogue stays open: the dialog says it is
// installed and links to the checklist in a new tab, as a test's install opens the
// engine in one, so several controls can be installed in a row.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ToolDetailModal from "../components/catalogue/ToolDetailModal";
import { CrossSiteProvider } from "./CrossSiteContext";
import { STORAGE_KEY } from "./connect";
import type { Tool } from "../services/catalogueApi";
import { fetchInstallInfo } from "../services/catalogueApi";

vi.mock("../services/catalogueApi", () => ({
  fetchInstallInfo: vi.fn().mockResolvedValue(null),
}));

const CONTROLS = "http://localhost/controls";
const P1 = "1e722ea2-4ce3-47fa-81bf-11a6b53ad679";
const P2 = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const LABEL = /install into a project/i;

const OPTIONS = {
  control: { title: "Accuracy checklist", source: "AESIA", topic: "Accuracy", questions: 2, description: null },
  projects: [{ pid: P1, name: "MCAS" }, { pid: P2, name: "Other" }],
  preselect: P1,
  installed: {} as Record<string, string>,
};

const control = (): Tool =>
  ({
    id: 1, name: "Accuracy checklist", slug: "accuracy-checklist", description: "d", version: "1", licensing: "Open_Source",
    created_at: "",
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
  (window as any).open = vi.fn();
  fetchMock = vi.fn((_url: string, init?: RequestInit) => (init?.method === "POST" ? json({}) : json(OPTIONS)));
  (globalThis as any).fetch = fetchMock;
});

async function openDialog(onInstalled?: (slug: string) => void, onClose: () => void = () => {}) {
  render(
    <CrossSiteProvider>
      <ToolDetailModal tool={control()} onClose={onClose} onInstalled={onInstalled} />
    </CrossSiteProvider>,
  );
  fireEvent.click(await screen.findByRole("link", { name: LABEL }));
  return screen.findByRole("dialog", { name: /install a control/i });
}

describe("installing a control stays in the catalogue", () => {
  it("opens a dialog here: no new tab", async () => {
    await openDialog();
    expect(window.open).not.toHaveBeenCalled();
  });

  it("asks the controls app, with the person's sign-in, for this control and the catalogue's project", async () => {
    await openDialog();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${CONTROLS}/api/install?slug=accuracy-checklist&project=${P1}`);
    expect(init).toMatchObject({ credentials: "include" });
  });

  it("shows the control, and a project dropdown with the preselected project", async () => {
    const dialog = await openDialog();
    expect(await within(dialog).findByText("Accuracy checklist")).toBeInTheDocument();
    expect(within(dialog).getByText("AESIA · Accuracy · 2 questions")).toBeInTheDocument();
    const select = within(dialog).getByLabelText("Project") as HTMLSelectElement;
    expect(select.value).toBe(P1);
    expect(Array.from(select.options).map((o) => o.text)).toEqual(["MCAS", "Other"]);
  });

  it("installs into the chosen project and stays here, saying so, with the checklist a new tab away", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json({ checklistId: "chk_new", created: true, path: `/p/${P2}/checklists/chk_new/fill?installed=new` })
        : json(OPTIONS),
    );
    const dialog = await openDialog();
    fireEvent.change(await within(dialog).findByLabelText("Project"), { target: { value: P2 } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Install" }));

    expect(await within(dialog).findByText("Installed in Other.")).toBeInTheDocument();
    const open = within(dialog).getByRole("link", { name: /open the checklist/i });
    expect(open).toHaveAttribute("href", `${CONTROLS}/p/${P2}/checklists/chk_new/fill?installed=new`);
    expect(open).toHaveAttribute("target", "_blank");
    expect(open).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(within(dialog).queryByRole("button", { name: "Install" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(post[0]).toBe(`${CONTROLS}/api/install`);
    expect(post[1]).toMatchObject({ credentials: "include" });
    expect(Object.fromEntries(post[1].body as URLSearchParams)).toEqual({ slug: "accuracy-checklist", project: P2 });
  });

  it("tells the page when the catalogue's own project got it, so its card says installed", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json({ checklistId: "chk_new", created: true, path: `/p/${P1}/checklists/chk_new/fill?installed=new` })
        : json(OPTIONS),
    );
    const onInstalled = vi.fn();
    const dialog = await openDialog(onInstalled);
    fireEvent.click(await within(dialog).findByRole("button", { name: "Install" }));
    expect(await within(dialog).findByText("Installed in MCAS.")).toBeInTheDocument();
    expect(onInstalled).toHaveBeenCalledWith("accuracy-checklist");
  });

  it("does not tell the page when another project got it: the card is about the catalogue's project", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json({ checklistId: "chk_new", created: true, path: `/p/${P2}/checklists/chk_new/fill?installed=new` })
        : json(OPTIONS),
    );
    const onInstalled = vi.fn();
    const dialog = await openDialog(onInstalled);
    fireEvent.change(await within(dialog).findByLabelText("Project"), { target: { value: P2 } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Install" }));
    expect(await within(dialog).findByText("Installed in Other.")).toBeInTheDocument();
    expect(onInstalled).not.toHaveBeenCalled();
  });

  it("says when the chosen project already has it, links to it, and offers no Install", async () => {
    fetchMock.mockImplementation(() => json({ ...OPTIONS, installed: { [P1]: "chk_42" } }));
    const dialog = await openDialog();
    expect(await within(dialog).findByText(/already installed in this project/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /open it/i })).toHaveAttribute(
      "href",
      `${CONTROLS}/p/${P1}/checklists/chk_42/fill`,
    );
    expect(within(dialog).queryByRole("button", { name: "Install" })).toBeNull();
  });

  it("shows the refusal and stays when the install is refused", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST" ? json({ error: "You can read this project but not change it." }, 403) : json(OPTIONS),
    );
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole("button", { name: "Install" }));
    expect(await within(dialog).findByText("You can read this project but not change it.")).toBeInTheDocument();
  });

  it("shows the plain message when a refusal's error is not text, not a crash", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST" ? json({ error: { code: "forbidden" } }, 403) : json(OPTIONS),
    );
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole("button", { name: "Install" }));
    expect(await within(dialog).findByText("The platform did not install it.")).toBeInTheDocument();
  });

  it("shows the plain message when the offer's error is not text", async () => {
    fetchMock.mockImplementation(() => json({ error: ["no", "such", "control"] }, 404));
    const dialog = await openDialog();
    expect(await within(dialog).findByText("The platform could not offer this control.")).toBeInTheDocument();
  });

  it("passes on the controls app's reason when it cannot offer the control", async () => {
    fetchMock.mockImplementation(() => json({ error: "The catalogue has no control called “accuracy-checklist”." }, 404));
    const dialog = await openDialog();
    expect(await within(dialog).findByText("The catalogue has no control called “accuracy-checklist”.")).toBeInTheDocument();
  });

  it("says how to get in when the platform cannot be reached with a sign-in, and offers its own install page", async () => {
    fetchMock.mockImplementation(() => Promise.reject(new TypeError("Failed to fetch")));
    const dialog = await openDialog();
    expect(await within(dialog).findByText(/sign in to your platform/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /open the platform's install page/i })).toHaveAttribute(
      "href",
      `${CONTROLS}/install?slug=accuracy-checklist&project=${P1}`,
    );
  });

  it("says there is no project to install into when this person may change none", async () => {
    fetchMock.mockImplementation(() => json({ ...OPTIONS, projects: [], preselect: null }));
    const dialog = await openDialog();
    expect(await within(dialog).findByText(/cannot change any project/i)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Install" })).toBeNull();
  });

  it("Cancel closes the dialog and leaves the control's page as it was", async () => {
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /install a control/i })).toBeNull());
    expect(screen.getByRole("link", { name: LABEL })).toBeInTheDocument();
  });

  it("takes the focus when it opens, and Escape closes it but not the control's page", async () => {
    const onClose = vi.fn();
    const dialog = await openDialog(undefined, onClose);
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /install a control/i })).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Accuracy checklist" })).toBeInTheDocument();
  });

  it("says nothing was installed when the install gets no answer", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST" ? Promise.reject(new TypeError("Failed to fetch")) : json(OPTIONS),
    );
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole("button", { name: "Install" }));
    expect(await within(dialog).findByText("Your platform did not answer. Nothing was installed.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Install" })).toBeEnabled();
  });

  it("does not claim an install the answer does not show: a 200 without the checklist's path", async () => {
    const onInstalled = vi.fn();
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST" ? json({ created: true }) : json(OPTIONS),
    );
    const dialog = await openDialog(onInstalled);
    fireEvent.click(await within(dialog).findByRole("button", { name: "Install" }));
    expect(await within(dialog).findByText("The platform did not install it.")).toBeInTheDocument();
    expect(within(dialog).queryByText(/^Installed in/)).toBeNull();
    expect(onInstalled).not.toHaveBeenCalled();
  });

  it("says it could not offer the control when the offer is not JSON (a sign-in page)", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response("<html>sign in</html>", { status: 200, headers: { "content-type": "text/html" } })),
    );
    const dialog = await openDialog();
    expect(await within(dialog).findByText("The platform could not offer this control.")).toBeInTheDocument();
  });

  it("chooses the first project when the platform preselects none", async () => {
    fetchMock.mockImplementation(() =>
      json({ ...OPTIONS, projects: [{ pid: P2, name: "Other" }, { pid: P1, name: "MCAS" }], preselect: null }),
    );
    const dialog = await openDialog();
    expect(((await within(dialog).findByLabelText("Project")) as HTMLSelectElement).value).toBe(P2);
  });

  it("says Installing… and disables the button while the install runs", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST" ? new Promise(() => {}) : json(OPTIONS),
    );
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole("button", { name: "Install" }));
    expect(await within(dialog).findByRole("button", { name: "Installing…" })).toBeDisabled();
  });

  it("closes when the overlay around it is clicked", async () => {
    const dialog = await openDialog();
    await within(dialog).findByText("Accuracy checklist");
    fireEvent.click(dialog.parentElement!);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /install a control/i })).toBeNull());
    expect(screen.getByRole("dialog", { name: "Accuracy checklist" })).toBeInTheDocument();
  });

  it("does not ask install-info for a control: its install never uses it", async () => {
    await openDialog();
    expect(fetchInstallInfo).not.toHaveBeenCalled();
  });

  it("offers no install to a controls app outside the platform's origins (the fragment is anyone's to write)", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ url: "http://localhost/webapp", expires: Date.now() + 60_000, controls: "https://evil.example/controls", project: P1 }),
    );
    render(
      <CrossSiteProvider>
        <ToolDetailModal tool={control()} onClose={() => {}} />
      </CrossSiteProvider>,
    );
    expect(await screen.findByText(/open the catalogue from your platform/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: LABEL })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
