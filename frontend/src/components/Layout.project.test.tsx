import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

describe("Layout in a project's catalogue", () => {
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
    await screen.findByText(/Connected to local app/);
    expect(screen.queryByRole("link", { name: "Back to the project" })).toBeNull();
  });
});
