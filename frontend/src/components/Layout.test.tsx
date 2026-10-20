import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Layout from "./Layout";
import { CrossSiteProvider } from "../crossSite/CrossSiteContext";

const renderLayout = () =>
  render(
    <MemoryRouter>
      <CrossSiteProvider>
        <Layout><div /></Layout>
      </CrossSiteProvider>
    </MemoryRouter>
  );

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
