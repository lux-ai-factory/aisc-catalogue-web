import { render } from "@testing-library/react";
import ToolCard from "./ToolCard";
import type { Tool } from "../../services/catalogueApi";

// Arrow accent colours from the two themes (jsdom serialises hex -> rgb).
const BLUE = "#000fdf"; // ready / control
const BLUE_RGB = "rgb(0, 15, 223)";
const PURPLE = "#8d00df"; // unfinished test
const PURPLE_RGB = "rgb(141, 0, 223)";

const has = (html: string, ...needles: string[]) =>
  needles.some((n) => html.toLowerCase().includes(n.toLowerCase()));

const makeTool = (over: Partial<Tool> = {}): Tool =>
  ({
    id: 1,
    name: "Example",
    slug: "example",
    description: "desc",
    version: "1.0.0",
    licensing: "Open_Source",
    status: "approved",
    submitted_by: "admin",
    reviewed_by: "admin",
    reviewed_at: "",
    created_at: "",
    storage_path: "/packages/example",
    completion_status: "full",
    metadata: null,
    tags: [],
    metrics: [],
    ...over,
  }) as Tool;

describe("ToolCard readiness colouring", () => {
  it("a fully-ready test renders the BLUE theme", () => {
    const { container } = render(
      <ToolCard tool={makeTool({ completion_status: "full" })} variant="tests" onClick={() => {}} />
    );
    expect(has(container.innerHTML, BLUE, BLUE_RGB)).toBe(true);
    expect(has(container.innerHTML, PURPLE, PURPLE_RGB)).toBe(false);
  });

  it("a stub test renders the PURPLE theme", () => {
    const { container } = render(
      <ToolCard tool={makeTool({ completion_status: "stub" })} variant="tests" onClick={() => {}} />
    );
    expect(has(container.innerHTML, PURPLE, PURPLE_RGB)).toBe(true);
    expect(has(container.innerHTML, BLUE, BLUE_RGB)).toBe(false);
  });

  it("a control is always BLUE, even when not full", () => {
    const { container } = render(
      <ToolCard tool={makeTool({ completion_status: "stub" })} variant="controls" onClick={() => {}} />
    );
    expect(has(container.innerHTML, BLUE, BLUE_RGB)).toBe(true);
    expect(has(container.innerHTML, PURPLE, PURPLE_RGB)).toBe(false);
  });

  it("renders the tool name", () => {
    const { getByText } = render(
      <ToolCard tool={makeTool({ name: "MLA-BiTe" })} variant="tests" onClick={() => {}} />
    );
    expect(getByText("MLA-BiTe")).toBeInTheDocument();
  });
});

describe("ToolCard provider chip", () => {
  const meta = { provider: "IBM Research" } as any;

  it("shows 'Provider: X' on a test card, from its metadata", () => {
    const { getByText } = render(
      <ToolCard tool={makeTool({ metadata: meta })} variant="tests" onClick={() => {}} />
    );
    expect(getByText("Provider: IBM Research")).toBeInTheDocument();
  });

  it("does not show a provider chip on a control card", () => {
    const { queryByText } = render(
      <ToolCard tool={makeTool({ metadata: meta })} variant="controls" onClick={() => {}} />
    );
    expect(queryByText("Provider: IBM Research")).toBeNull();
  });

  it("skips the seed's 'Provider' placeholder", () => {
    const { queryByText } = render(
      <ToolCard tool={makeTool({ metadata: { provider: "Provider" } as any })} variant="tests" onClick={() => {}} />
    );
    expect(queryByText(/^Provider: /)).toBeNull();
  });
});
