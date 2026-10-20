import type { Metadata } from "../../services/catalogueApi";

/** The entry's provider, or null when unknown: "Provider" is the seed's
 *  placeholder for "unknown". */
export function providerName(metadata: Metadata | null | undefined): string | null {
  const raw = metadata?.provider?.trim() ?? "";
  return raw && raw !== "Provider" ? raw : null;
}
