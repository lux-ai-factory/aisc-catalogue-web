import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Layout from "./Layout";
import { CrossSiteProvider } from "../crossSite/CrossSiteContext";
import { STORAGE_KEY } from "../crossSite/connect";

const handshake = (back: string) =>
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ url: "http://localhost/webapp", expires: Date.now() + 60_000, back })
  );

const renderLayout = () =>
  render(
    <MemoryRouter>
      <CrossSiteProvider>
        <Layout><div /></Layout>
      </CrossSiteProvider>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe("Layout account and Back links", () => {
  it("has no Account link and no Log out", () => {
    renderLayout();
    expect(screen.queryByRole("link", { name: "Account" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Log out" })).toBeNull();
  });

  it("leads back to the project page it was opened from", async () => {
    handshake("http://localhost:8100/p/mcas");
    renderLayout();
    expect(await screen.findByRole("link", { name: "Back to the project" })).toHaveAttribute(
      "href",
      "http://localhost:8100/p/mcas"
    );
  });

  it("offers no Back to an address outside the platform", async () => {
    handshake("https://evil.example/p/mcas");
    renderLayout();
    await screen.findByRole("button", { name: "About the catalogue" });
    expect(screen.queryByRole("link", { name: "Back to the project" })).toBeNull();
  });

  it("shows no local-app bar and no Disconnect, also with a handshake", async () => {
    handshake("http://localhost:8100/p/mcas");
    renderLayout();
    await screen.findByRole("link", { name: "Back to the project" });
    expect(screen.queryByText(/local app/i)).toBeNull();
    expect(screen.queryByText("Disconnect")).toBeNull();
  });
});

describe("Layout once the handshake has expired", () => {
  const AGAIN = "Open the catalogue again from the project page.";

  it("says to open the catalogue again where the Back link was", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ url: "http://localhost/webapp", expires: Date.now() - 1, back: "http://localhost:8100/p/mcas" })
    );
    renderLayout();
    expect(await screen.findByText(AGAIN)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Back to the project" })).toBeNull();
  });

  it("says it once the hour runs out while the page is open", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ url: "http://localhost/webapp", expires: Date.now() + 300, back: "http://localhost:8100/p/mcas" })
    );
    renderLayout();
    expect(await screen.findByRole("link", { name: "Back to the project" })).toBeInTheDocument();
    expect(await screen.findByText(AGAIN, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Back to the project" })).toBeNull();
  });

  it("says nothing when the catalogue was opened without a handshake", async () => {
    renderLayout();
    await screen.findByRole("button", { name: "About the catalogue" });
    expect(screen.queryByText(AGAIN)).toBeNull();
  });
});

describe("Layout About the catalogue", () => {
  it("opens a panel explaining the methodology, and closes it", () => {
    renderLayout();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "About the catalogue" }));
    const text = screen.getByRole("dialog").textContent ?? "";
    expect(text).toContain("REgulation Meets Innovation (RE.M.I.)");
    expect(text).toContain("Commission Nationale pour la Protection des Données (CNPD)");
    expect(text).toContain("Luxembourg AI Factory.");
    expect(text).toContain("High-Level Expert Group");
    expect(text).toContain("AI Act");
    expect(text).toContain("Hugging Face");
    expect(text).toContain("published online");
    expect(text).toContain("Testing tools");
    expect(text).toContain("members of the Luxembourg AI Factory");
    expect(text).toContain("selected among the available open-source tools");
    expect(screen.getByRole("link", { name: /RE\.M\.I\./ }).getAttribute("href")).toBe(
      "https://cnpd.public.lu/en/professionnels/outils-conformite/remi.html"
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Layout About the catalogue, from the keyboard", () => {
  it("takes the focus when it opens, and Escape closes it", () => {
    renderLayout();
    fireEvent.click(screen.getByRole("button", { name: "About the catalogue" }));
    const dialog = screen.getByRole("dialog", { name: "About the catalogue" });
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Layout header logo", () => {
  it("is served with the app, under the build's base path, not from another site", () => {
    vi.stubEnv("BASE_URL", "/project-catalogue/");
    try {
      renderLayout();
      expect(screen.getByAltText("Luxembourg AI Factory")).toHaveAttribute(
        "src",
        "/project-catalogue/img/laif_cmyk_negatif.png"
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
