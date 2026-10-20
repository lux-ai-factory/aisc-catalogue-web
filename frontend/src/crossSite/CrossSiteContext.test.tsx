import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CrossSiteProvider, useCrossSite } from "./CrossSiteContext";
import { STORAGE_KEY } from "./connect";

// the handshake is kept per tab (sessionStorage)
/** Shows what the context holds, and a button that disconnects. */
const Probe = () => {
  const { targetUrl, backUrl, handshake, disconnect } = useCrossSite();
  return (
    <div>
      <span data-testid="target">{targetUrl ?? "none"}</span>
      <span data-testid="back">{backUrl ?? "none"}</span>
      <span data-testid="project">{handshake?.project ?? "none"}</span>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
};

describe("CrossSiteContext disconnect", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it("forgets the whole handshake at once: target, Back link and project", async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      url: "http://localhost:8080",
      back: "http://localhost:8100/p/mcas",
      project: "3f2c0d1e-6a7b-4c8d-9e0f-112233445566",
      expires: Date.now() + 60_000,
    }));
    render(<CrossSiteProvider><Probe /></CrossSiteProvider>);
    expect(await screen.findByText("http://localhost:8100/p/mcas")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Disconnect"));

    expect(screen.getByTestId("target")).toHaveTextContent("none");
    expect(screen.getByTestId("back")).toHaveTextContent("none");
    expect(screen.getByTestId("project")).toHaveTextContent("none");
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
