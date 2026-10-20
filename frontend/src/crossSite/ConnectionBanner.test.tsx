import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CrossSiteProvider } from "./CrossSiteContext";
import ConnectionBanner from "./ConnectionBanner";
import { STORAGE_KEY } from "./connect";

const renderBanner = () =>
  render(
    <CrossSiteProvider>
      <ConnectionBanner />
    </CrossSiteProvider>
  );

describe("ConnectionBanner", () => {
  beforeEach(() => sessionStorage.clear());

  it("shows the connected state when a handshake is stored", async () => {
    const payload = {
      url: "http://localhost",
      expires: Date.now() + 60_000,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    renderBanner();
    expect(
      await screen.findByText(/Connected to local app/)
    ).toBeInTheDocument();
    expect(screen.getByText(/http:\/\/localhost/)).toBeInTheDocument();
  });

  it("shows the disconnected state otherwise", async () => {
    renderBanner();
    expect(
      await screen.findByText(/Not connected/)
    ).toBeInTheDocument();
  });

  it("disconnects when the Disconnect action is clicked", async () => {
    const payload = {
      url: "http://localhost",
      expires: Date.now() + 60_000,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    renderBanner();
    await screen.findByText(/Connected to local app/);
    await userEvent.click(screen.getByText("Disconnect"));

    expect(
      await screen.findByText(/Not connected/)
    ).toBeInTheDocument();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
