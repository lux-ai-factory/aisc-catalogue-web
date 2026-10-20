import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

// Each page as its name, so the test sees only which route answered.
vi.mock("./pages/Catalogue", () => ({ default: () => <div>catalogue page</div> }));
vi.mock("./pages/Metrics", () => ({ default: () => <div>metrics page</div> }));

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

// Paths of account and add/edit pages, which this catalogue does not have.
const NOT_HERE: [string, string][] = [
  ["/account", "account page"],
  ["/account/verify-email/k", "verify email page"],
  ["/account/password/reset", "password reset page"],
  ["/add_tool", "add tool page"],
  ["/edit_tool/3", "add tool page"],
  ["/add_control", "add control page"],
];

describe("routes in a project's catalogue", () => {
  it.each(NOT_HERE)("%s is not there: it leads to the catalogue", (path) => {
    at(path);
    expect(screen.getByText("catalogue page")).toBeInTheDocument();
  });

  it("keeps the catalogue and the metrics", () => {
    at("/metrics");
    expect(screen.getByText("metrics page")).toBeInTheDocument();
  });
});
