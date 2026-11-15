import type { HandshakePayload } from "./connect";

/** A platform project pid: the only project value ever put in a URL. */
export const PID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The opening AISC's page that installs this control, or null when no AISC opened the catalogue and so
 *  there is nowhere to send it. It is the install page of the catalogue's project when there is one: an
 *  install is recorded in a project's ledger only when it is made at that project's address. */
export function controlsInstallUrl(payload: HandshakePayload | null, slug: string): string | null {
  const base = controlsBase(payload);
  if (!base) return null;
  const project = payload?.project && PID.test(payload.project) ? payload.project : null;
  if (project) return `${base}/p/${encodeURIComponent(project)}/install?slug=${encodeURIComponent(slug)}`;
  return `${base}/install?slug=${encodeURIComponent(slug)}`;
}

/** Where the catalogue's dialog posts the install: under the project it goes into, for the same reason. */
export function controlsInstallApi(base: string, project: string): string {
  return `${base}/p/${encodeURIComponent(project)}/api/install`;
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
