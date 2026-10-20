import { describe, it, expect } from "vitest";
import type { Tag } from "../../services/catalogueApi";
import { matchesDimensions, subDimensionParents } from "./dimensions";

const tag = (slug: string, section: Tag["section"], parent?: string): Tag => ({
  id: 0, slug, label: slug, section, color_bg: "", _color_text: "", sort_order: 0,
  parent_dimension_slug: parent ?? null,
});

const ROBUSTNESS = "technical-robustness-safety";
const injection = tag("prompt-injection", "testing_subdim", ROBUSTNESS);
const stress = tag("stress-testing", "testing_subdim", ROBUSTNESS);
const drift = tag("drift-detection", "testing_subdim", ROBUSTNESS);
const pii = tag("pii-detection-testing", "testing_subdim", "privacy-data-governance");
const consent = tag("informed-consent", "controls_subdim", "human-agency-oversight");
const parents = subDimensionParents([injection, stress, drift, pii, consent, tag(ROBUSTNESS, "dimension")]);

// entries by what they carry
const onlyDimension = [tag(ROBUSTNESS, "dimension")];
const withInjection = [tag(ROBUSTNESS, "dimension"), injection];
const onlyInjection = [injection];
const withStress = [stress];
const withDrift = [drift];
const withPii = [pii];
const withConsent = [consent];
const unrelated = [tag("transparency", "dimension"), tag("control", "type")];

const match = (entry: Tag[], chosen: string[]) => matchesDimensions(entry, chosen, parents);

describe("subDimensionParents", () => {
  it("maps each sub-dimension, of tests and of controls, to its dimension, and nothing else", () => {
    expect(Object.fromEntries(parents)).toEqual({
      "prompt-injection": ROBUSTNESS,
      "stress-testing": ROBUSTNESS,
      "drift-detection": ROBUSTNESS,
      "pii-detection-testing": "privacy-data-governance",
      "informed-consent": "human-agency-oversight",
    });
  });
});

describe("matchesDimensions", () => {
  it("matches everything when nothing is chosen", () => {
    expect(match(unrelated, [])).toBe(true);
  });

  it("a dimension alone matches the entries with it or any of its sub-dimensions", () => {
    for (const entry of [onlyDimension, withInjection, onlyInjection, withStress, withDrift]) {
      expect(match(entry, [ROBUSTNESS])).toBe(true);
    }
    expect(match(withPii, [ROBUSTNESS])).toBe(false);
    expect(match(unrelated, [ROBUSTNESS])).toBe(false);
  });

  it("Technical Robustness and Safety with Prompt Injection matches only prompt-injection entries", () => {
    const chosen = [ROBUSTNESS, "prompt-injection"];
    expect(match(withInjection, chosen)).toBe(true);
    expect(match(onlyInjection, chosen)).toBe(true);
    expect(match(onlyDimension, chosen)).toBe(false);
    expect(match(withStress, chosen)).toBe(false);
    expect(match(withDrift, chosen)).toBe(false);
  });

  it("two sub-dimensions of one dimension match an entry with either", () => {
    const chosen = [ROBUSTNESS, "prompt-injection", "stress-testing"];
    expect(match(onlyInjection, chosen)).toBe(true);
    expect(match(withStress, chosen)).toBe(true);
    expect(match(withDrift, chosen)).toBe(false);
  });

  it("narrows only within its own dimension: another chosen dimension still matches all of its entries", () => {
    const chosen = [ROBUSTNESS, "prompt-injection", "privacy-data-governance"];
    expect(match(withPii, chosen)).toBe(true);
    expect(match(onlyInjection, chosen)).toBe(true);
    expect(match(withStress, chosen)).toBe(false);
  });

  it("a sub-dimension chosen without its dimension narrows that dimension all the same", () => {
    expect(match(onlyInjection, ["prompt-injection"])).toBe(true);
    expect(match(withStress, ["prompt-injection"])).toBe(false);
  });

  it("is the 'For this project' rule too: a sub-dimension counts for its parent", () => {
    expect(match(withConsent, ["human-agency-oversight"])).toBe(true);
    expect(match(withConsent, ["privacy-data-governance"])).toBe(false);
    expect(match(withInjection, ["transparency", ROBUSTNESS])).toBe(true);
  });
});
