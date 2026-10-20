/**
 * Nothing secret is built into the bundle: whatever a VITE_ variable holds is inlined into the
 * JavaScript every visitor downloads. The Install button follows the #env= handshake instead of
 * taking a token.
 */
import { describe, expect, it } from "vitest";
import dockerfile from "../Dockerfile?raw";

const sources = import.meta.glob(["./**/*.{ts,tsx}", "!./**/*.test.{ts,tsx}"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("the bundle", () => {
  it("takes no token as a build variable", () => {
    const secret = /VITE_[A-Z_]*(TOKEN|SECRET|PASSWORD|KEY)\b/;
    const offenders = Object.entries({ Dockerfile: dockerfile, ...sources })
      .filter(([, text]) => secret.test(text))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
    expect(Object.keys(sources).length).toBeGreaterThan(20);      // it really read the sources
  });
});
