import { render, screen } from "@testing-library/react";
import { CrossSiteProvider, useCrossSite } from "./CrossSiteContext";
import { STORAGE_KEY } from "./connect";

// the handshake is kept per tab (sessionStorage)
/** Shows what the context holds. */
const Probe = () => {
  const { backUrl, handshake } = useCrossSite();
  return (
    <div>
      <span data-testid="back">{backUrl ?? "none"}</span>
      <span data-testid="project">{handshake?.project ?? "none"}</span>
    </div>
  );
};

describe("CrossSiteContext", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it("holds the tab's handshake: its Back link and its project", async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      url: "http://localhost",
      back: "http://localhost:8100/p/mcas",
      project: "3f2c0d1e-6a7b-4c8d-9e0f-112233445566",
      expires: Date.now() + 60_000,
    }));
    render(<CrossSiteProvider><Probe /></CrossSiteProvider>);
    expect(await screen.findByText("http://localhost:8100/p/mcas")).toBeInTheDocument();
    expect(screen.getByTestId("project")).toHaveTextContent("3f2c0d1e-6a7b-4c8d-9e0f-112233445566");
  });

  it("holds nothing without a handshake", () => {
    render(<CrossSiteProvider><Probe /></CrossSiteProvider>);
    expect(screen.getByTestId("back")).toHaveTextContent("none");
    expect(screen.getByTestId("project")).toHaveTextContent("none");
  });
});
