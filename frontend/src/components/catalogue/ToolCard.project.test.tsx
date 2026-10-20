import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ToolCard from "./ToolCard";
import type { Tool } from "../../services/catalogueApi";

const makeTool = (over: Partial<Tool> = {}): Tool =>
  ({
    id: 1, name: "Example", slug: "example", description: "desc", version: "1.0.0",
    licensing: "Open_Source", status: "approved", submitted_by: "", reviewed_by: "",
    reviewed_at: "", created_at: "", storage_path: "", completion_status: "full",
    metadata: null, tags: [], metrics: [], ...over,
  }) as Tool;

const card = (tool: Tool) => render(<ToolCard tool={tool} variant="tests" onClick={() => {}} />);

describe("ToolCard project badges", () => {
  it("shows Local and Installed when the entry carries them", () => {
    card(makeTool({ aisc_local: true, aisc_installed: true }));
    expect(screen.getByText("Local")).toBeInTheDocument();
    expect(screen.getByText("Installed")).toBeInTheDocument();
  });

  it("shows neither when the flags are false or absent", () => {
    card(makeTool({ aisc_local: false }));
    expect(screen.queryByText("Local")).toBeNull();
    expect(screen.queryByText("Installed")).toBeNull();
  });
});
