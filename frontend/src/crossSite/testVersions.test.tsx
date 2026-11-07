// A project may hold several versions of a test, one of them on. The entry says which version is on and
// offers to install another one the stack has (an older one from the index, a newer one, or one the project
// holds but has off); installing it turns the version on now off.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ToolDetailModal from "../components/catalogue/ToolDetailModal";
import { CrossSiteProvider } from "./CrossSiteContext";
import type { InstallInfo, Tool } from "../services/catalogueApi";
import { fetchInstallInfo, installTest } from "../services/catalogueApi";
import { projectSlug } from "../services/projectCatalogue";

vi.mock("../services/catalogueApi", () => ({ fetchInstallInfo: vi.fn(), installTest: vi.fn() }));
vi.mock("../services/projectCatalogue", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/projectCatalogue")>()),
  projectSlug: vi.fn(),
}));

const entry = (installed: boolean): Tool =>
  ({
    id: 9, name: "aisc-plugin-langbite-mijke", slug: "local-aisc-plugin-langbite-mijke", description: "d",
    version: "0.3.0", licensing: "Open_Source", completion_status: "full", metadata: null, metrics: [], tags: [],
    aisc_installed: installed,
  }) as unknown as Tool;

const info = (versions: InstallInfo["versions"], version = "0.3.0"): InstallInfo => ({
  slug: "local-aisc-plugin-langbite-mijke", package_name: "aisc-plugin-langbite-mijke", version,
  installable: true, reason: null, fetched_on_install: true, versions,
});
const v = (version: string, installed = false, enabled = false, installable = true) =>
  ({ version, installable, installed, enabled });

function show(installed: boolean) {
  render(
    <CrossSiteProvider>
      <ToolDetailModal tool={entry(installed)} onClose={() => {}} />
    </CrossSiteProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectSlug).mockReturnValue("mijke");
});

describe("several versions of a test", () => {
  it("says which version is on and offers the newer one, preselected", async () => {
    vi.mocked(fetchInstallInfo).mockResolvedValue(info([v("0.3.0"), v("0.2.9"), v("0.2.8", true, true)]));
    show(true);
    expect(await screen.findByText(/0\.2\.8 is on/i)).toBeTruthy();
    const select = screen.getByRole("combobox", { name: /version/i }) as HTMLSelectElement;
    expect(select.value).toBe("0.3.0");
    expect([...select.options].map((o) => o.value)).toEqual(["0.3.0", "0.2.9"]);
  });

  it("installs the version chosen and says the one on now is turned off", async () => {
    vi.mocked(fetchInstallInfo).mockResolvedValue(info([v("0.3.0"), v("0.2.9"), v("0.2.8", true, true)]));
    vi.mocked(installTest).mockResolvedValue({ slug: "s", package_name: "p", version: "0.2.9" });
    show(true);
    fireEvent.change(await screen.findByRole("combobox", { name: /version/i }), { target: { value: "0.2.9" } });
    fireEvent.click(screen.getByRole("button", { name: /install into this project/i }));
    const dialog = await screen.findByRole("dialog", { name: /install a test/i });
    expect(within(dialog).getByText(/version 0\.2\.9/i)).toBeTruthy();
    expect(within(dialog).getByText(/0\.2\.8 is turned off/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: /^install$/i }));
    expect(await within(dialog).findByText(/installed in this project/i)).toBeTruthy();
    expect(installTest).toHaveBeenCalledWith("local-aisc-plugin-langbite-mijke", "0.2.9");
  });

  it("offers a version the project holds but has off, and never one the stack cannot install", async () => {
    vi.mocked(fetchInstallInfo).mockResolvedValue(
      info([v("1.0", true, false, false), v("0.3.0", true, true), v("0.2.8", true, false)]));
    show(true);
    const select = (await screen.findByRole("combobox", { name: /version/i })) as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(["0.2.8 (installed, off)"]);
  });

  it("says Installed, with nothing to choose, when the only version offered is on", async () => {
    vi.mocked(fetchInstallInfo).mockResolvedValue(info([v("0.3.0", true, true)]));
    show(true);
    expect(await screen.findByText(/0\.3\.0 is on/i)).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: /version/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /install into this project/i })).toBeNull();
  });

  it("a test not installed yet installs the default version without naming it", async () => {
    vi.mocked(fetchInstallInfo).mockResolvedValue(info([v("0.3.0"), v("0.2.8")]));
    vi.mocked(installTest).mockResolvedValue({ slug: "s", package_name: "p", version: "0.3.0" });
    show(false);
    fireEvent.click(await screen.findByRole("button", { name: /install into this project/i }));
    const dialog = await screen.findByRole("dialog", { name: /install a test/i });
    expect(within(dialog).queryByText(/turned off/i)).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: /^install$/i }));
    await within(dialog).findByText(/installed in this project/i);
    expect(installTest).toHaveBeenCalledWith("local-aisc-plugin-langbite-mijke");
  });

  it("after an install, the entry reads its versions again: the one installed is on and no longer offered", async () => {
    vi.mocked(fetchInstallInfo)
      .mockResolvedValueOnce(info([v("0.3.0"), v("0.2.9"), v("0.2.8", true, true)]))
      .mockResolvedValue(info([v("0.3.0"), v("0.2.9", true, true), v("0.2.8", true, false)]));
    vi.mocked(installTest).mockResolvedValue({ slug: "s", package_name: "p", version: "0.2.9" });
    show(true);
    fireEvent.change(await screen.findByRole("combobox", { name: /version/i }), { target: { value: "0.2.9" } });
    fireEvent.click(screen.getByRole("button", { name: /install into this project/i }));
    const dialog = await screen.findByRole("dialog", { name: /install a test/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /^install$/i }));
    expect(await within(dialog).findByText(/installed in this project/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: /^close$/i }));
    expect(await screen.findByText(/0\.2\.9 is on/i)).toBeTruthy();
    const select = screen.getByRole("combobox", { name: /version/i }) as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(["0.3.0", "0.2.8"]);
    expect(select.value).toBe("0.3.0");
  });
});
