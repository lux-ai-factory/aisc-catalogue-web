import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import App from "./App";

// Each page as its name, so the test sees only which route answered.
vi.mock("./pages/Catalogue", () => ({ default: () => <div>catalogue page</div> }));
vi.mock("./pages/Metrics", () => ({ default: () => <div>metrics page</div> }));

/** The address the router ended on. */
const Where = () => <div data-testid="path">{useLocation().pathname}</div>;

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Where />
    </MemoryRouter>
  );

describe("routes", () => {
  it("leads a path it does not have (an old account or add page) to the catalogue", () => {
    at("/add_tool");
    expect(screen.getByText("catalogue page")).toBeInTheDocument();
    expect(screen.getByTestId("path")).toHaveTextContent(/^\/catalogue$/);
  });

  it("leads / to /catalogue", () => {
    at("/");
    expect(screen.getByText("catalogue page")).toBeInTheDocument();
    expect(screen.getByTestId("path")).toHaveTextContent(/^\/catalogue$/);
  });

  it("keeps the catalogue and the metrics", () => {
    at("/metrics");
    expect(screen.getByText("metrics page")).toBeInTheDocument();
  });
});
