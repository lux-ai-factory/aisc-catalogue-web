import type { HandshakePayload } from "./connect";

/** A platform project pid: the only project value ever put in a URL. */
export const PID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The opening AISC's page that asks which project gets this control, or null
 *  when no AISC opened the catalogue and so there is nowhere to send it. */
export function controlsInstallUrl(payload: HandshakePayload | null, slug: string): string | null {
  const base = controlsBase(payload);
  if (!base) return null;
  return `${base}/install?slug=${encodeURIComponent(slug)}${projectParam(payload)}`;
}

/** The opening AISC's controls app, or null when its address is not a safe one. */
export function controlsBase(payload: HandshakePayload | null): string | null {
  if (!payload?.controls) return null;
  // The address comes from the URL fragment, which anyone can write: only an
  // absolute http(s) URL is a place to send somebody.
  let parsed: URL;
  try {
    parsed = new URL(payload.controls);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return payload.controls.replace(/\/+$/, "");
}

/** `&project=<pid>` for the project the catalogue was opened from, when it is a pid. */
export function projectParam(payload: HandshakePayload | null): string {
  return payload?.project && PID.test(payload.project) ? `&project=${encodeURIComponent(payload.project)}` : "";
}
