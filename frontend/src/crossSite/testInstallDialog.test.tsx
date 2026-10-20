// A test is installed without leaving the project's catalogue, as a control is: "Install into this
// project…" opens a dialog here, and Install asks the platform, on this page's own origin, to install it
// into the catalogue's project. Opened without a project, a test still goes to the engine, which is on
// another site.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import ToolDetailModal from "../components/catalogue/ToolDetailModal";
import { CrossSiteProvider } from "./CrossSiteContext";
import type { Tool } from "../services/catalogueApi";
import { installTest } from "../services/catalogueApi";
import { projectSlug } from "../services/projectCatalogue";

vi.mock("../services/catalogueApi", () => ({
  fetchInstallInfo: vi.fn().mockResolvedValue({
    slug: "langbite", package_name: "aisc-plugin-langbite", version: "0.1.1", index_url: "",
    installable: true, reason: null,
  }),
  installTest: vi.fn(),
}));
vi.mock("../services/projectCatalogue", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/projectCatalogue")>()),
  projectSlug: vi.fn(),
}));

const test = (): Tool =>
  ({
    id: 2, name: "LangBiTe", slug: "langbite", description: "d", version: "1", licensing: "Open_Source",
    created_at: "",
    completion_status: "full", metadata: null, metrics: [], tags: [],
  }) as unknown as Tool;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  (window as any).open = vi.fn().mockReturnValue({ focus: vi.fn() });
  vi.mocked(projectSlug).mockReturnValue("mcas");
});

async function openDialog(onInstalled?: (slug: string) => void, onClose: () => void = () => {}) {
  render(
    <CrossSiteProvider>
      <ToolDetailModal tool={test()} onClose={onClose} onInstalled={onInstalled} />
    </CrossSiteProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: /install into this project/i }));
  return screen.findByRole("dialog", { name: /install a test/i });
}

describe("installing a test stays in the project's catalogue", () => {
  it("opens a dialog here naming the package and version: no new tab", async () => {
    const dialog = await openDialog();
    expect(window.open).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/aisc-plugin-langbite/)).toBeTruthy();
    expect(within(dialog).getByText(/0\.1\.1/)).toBeTruthy();
  });

  it("names the project it installs into, so a link to another project cannot pass unnoticed", async () => {
    const dialog = await openDialog();
    expect(within(dialog).getByText(/into the project mcas/i)).toBeTruthy();
  });

  it("installs through the platform and says so; the card then says installed", async () => {
    vi.mocked(installTest).mockResolvedValue({ slug: "langbite", package_name: "aisc-plugin-langbite", version: "0.1.1" });
    const onInstalled = vi.fn();
    const dialog = await openDialog(onInstalled);
    fireEvent.click(within(dialog).getByRole("button", { name: /^install$/i }));
    expect(await within(dialog).findByText(/installed in this project/i)).toBeTruthy();
    expect(installTest).toHaveBeenCalledWith("langbite");
    expect(onInstalled).toHaveBeenCalledWith("langbite");
  });

  it("shows the platform's refusal and installs nothing", async () => {
    vi.mocked(installTest).mockRejectedValue({ response: { data: { detail: "Installing a test takes the admin role." } } });
    const onInstalled = vi.fn();
    const dialog = await openDialog(onInstalled);
    fireEvent.click(within(dialog).getByRole("button", { name: /^install$/i }));
    expect(await within(dialog).findByText("Installing a test takes the admin role.")).toBeTruthy();
    expect(onInstalled).not.toHaveBeenCalled();
  });

  it("a refusal whose detail is not text (e.g. a validation list) shows the plain message, not a crash", async () => {
    vi.mocked(installTest).mockRejectedValue({ response: { data: { detail: [{ loc: ["path"], msg: "bad" }] } } });
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^install$/i }));
    expect(await within(dialog).findByText("The platform did not install it.")).toBeTruthy();
  });

  it("takes the focus when it opens, and Escape closes it but not the test's page", async () => {
    const onClose = vi.fn();
    const dialog = await openDialog(undefined, onClose);
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /install a test/i })).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "LangBiTe" })).toBeInTheDocument();
  });

  it("Cancel closes it, and Close once it is installed", async () => {
    vi.mocked(installTest).mockResolvedValue({ slug: "langbite", package_name: "aisc-plugin-langbite", version: "0.1.1" });
    let dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /install a test/i })).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: /install into this project/i }));
    dialog = await screen.findByRole("dialog", { name: /install a test/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /^install$/i }));
    await within(dialog).findByText(/installed in this project/i);
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /install a test/i })).toBeNull());
    expect(screen.getByRole("dialog", { name: "LangBiTe" })).toBeInTheDocument();
  });

  it("says Installing… and disables the button while the install runs", async () => {
    vi.mocked(installTest).mockReturnValue(new Promise(() => {}));
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^install$/i }));
    expect(within(dialog).getByRole("button", { name: "Installing…" })).toBeDisabled();
  });

  it("opens again without the last attempt's error", async () => {
    vi.mocked(installTest).mockRejectedValue({ response: { data: { detail: "Installing a test takes the admin role." } } });
    let dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^install$/i }));
    await within(dialog).findByText("Installing a test takes the admin role.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: /install into this project/i }));
    dialog = await screen.findByRole("dialog", { name: /install a test/i });
    expect(within(dialog).queryByText("Installing a test takes the admin role.")).toBeNull();
    expect(within(dialog).getByRole("button", { name: /^install$/i })).toBeEnabled();
  });

  it("without a project, a test still goes to the engine", async () => {
    vi.mocked(projectSlug).mockReturnValue(null);
    render(
      <CrossSiteProvider>
        <ToolDetailModal tool={test()} onClose={() => {}} />
      </CrossSiteProvider>,
    );
    expect(await screen.findByRole("link", { name: /install into a project/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /install into this project/i })).toBeNull();
  });
});
