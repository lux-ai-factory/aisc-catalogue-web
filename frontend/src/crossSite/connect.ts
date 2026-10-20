/**
 * Cross-site plugin handoff.
 *
 * The AISC launcher opens this catalogue with a `#env=` fragment carrying a
 * short-lived, base64-encoded payload:
 *
 *   #env=<base64({ url: <local origin>, expires: <epoch ms> })>
 *
 * We decode it, keep it for this tab, and later route "enable plugin" commands
 * back to that app. Nothing is sent to any server.
 *
 * The fragment is anyone's to write, so: the handshake is kept per tab
 * (sessionStorage), so two tabs opened from two projects keep their own; it may
 * claim to last an hour at most; and its Back link and controls app are taken
 * only on the platform's own origins: the page's own (the launcher's) and
 * VITE_BACK_ORIGINS (comma-separated; the stack's http://localhost and
 * http://localhost:8100 by default).
 */
import { PID } from "./controlsInstall";

export const STORAGE_KEY = "aisc_target_env";

/** Where the handshake is kept: per tab. */
const store = (): Storage => sessionStorage;

/** The origins a Back link may lead to. */
const BACK_ORIGINS: readonly string[] = (
  (import.meta.env.VITE_BACK_ORIGINS as string | undefined) || "http://localhost,http://localhost:8100"
)
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

export interface HandshakePayload {
  url: string;
  expires: number;
  /** Where the opening AISC's controls app lives, e.g. http://localhost/controls. */
  controls?: string;
  /** The platform project the catalogue was opened from, preselected on install. */
  project?: string;
  /** The page to return to. */
  back?: string;
}

/** The longest a handshake may claim to last. The fragment is written by
 *  whoever made the link, so a far-off `expires` is not taken at its word. The
 *  AISC launcher gives an hour; a minute more is allowed for the clocks. */
const MAX_HANDSHAKE_MS = 61 * 60 * 1000;

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * The handshake as it may be used, or null. It must name an http(s) `url`
 * (opened in a new tab when a plugin is enabled) and must not have expired or
 * claim to last more than MAX_HANDSHAKE_MS. A `back` that is not http(s) is dropped.
 */
function validHandshake(p: unknown): HandshakePayload | null {
  const v = p as HandshakePayload | null;
  if (!v || typeof v.url !== "string" || typeof v.expires !== "number") return null;
  const now = Date.now();
  if (!isHttpUrl(v.url) || v.expires <= now || v.expires > now + MAX_HANDSHAKE_MS) return null;
  if (v.back === undefined || isHttpUrl(v.back)) return v;
  const { back: _unsafe, ...rest } = v;
  return rest;
}

export interface InstallEntry {
  /** The catalogue entry's slug, when the caller knows it. */
  slug?: string;
  package: string;
  version: string;
}

/**
 * Build a custom-protocol install URI for one or more plugins. Repeated
 * `package`/`version` pairs let a single enable carry several plugins (the
 * local app shows them as a queue).
 */
export function buildEnableUri(entries: InstallEntry[]): string {
  const query = entries
    .map((e) => {
      const parts = [
        `package=${encodeURIComponent(e.package)}`,
        `version=${encodeURIComponent(e.version)}`,
      ];
      // The catalogue entry this came from. A distribution name is not an
      // identity: it can be renamed, and two entries could ship the same
      // package, so the engine records the slug rather than inferring it from a
      // filename. Omitted when unknown rather than sent empty.
      if (e.slug) parts.push(`slug=${encodeURIComponent(e.slug)}`);
      return parts.join("&");
    })
    .join("&");
  return `web+aiscplugin://enable?${query}`;
}

function decodeHash(): HandshakePayload | null {
  const hash = window.location.hash;
  if (!hash.startsWith("#env=")) return null;
  try {
    return validHandshake(JSON.parse(atob(hash.replace("#env=", ""))));
  } catch (e) {
    console.error("Invalid handshake payload:", e);
  }
  return null;
}

function readStoredPayload(): HandshakePayload | null {
  try {
    const raw = store().getItem(STORAGE_KEY);
    if (!raw) return null;
    const payload = validHandshake(JSON.parse(raw));
    if (payload) return payload;
    store().removeItem(STORAGE_KEY);
  } catch (e) {
    /* ignore corrupt entries */
  }
  return null;
}

function readStored(): string | null {
  return readStoredPayload()?.url ?? null;
}

/** The whole stored handshake (or null if there is none or it expired). */
export function getHandshake(): HandshakePayload | null {
  return readStoredPayload();
}

/** Consume a `#env=` handshake on load, if one is present. Returns the target
 *  origin (or null when there was no fresh handshake). */
export function startCrossSiteSession(): string | null {
  const handshake = decodeHash();
  if (handshake) {
    store().setItem(STORAGE_KEY, JSON.stringify(handshake));
    // Strip the token from the URL so it is never shared/history-logged.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
    return handshake.url;
  }
  return readStored();
}

// Capture any incoming `#env=` handshake at module load. App.tsx redirects
// "/" -> "/catalogue" with <Navigate replace>, which drops the URL fragment
// before React Router finishes mounting; reading here (before render) ensures
// the handshake is kept regardless of that redirect.
if (typeof window !== "undefined") {
  try {
    startCrossSiteSession();
  } catch (e) {
    /* ignore */
  }
}

/** The currently connected local-app origin (or null if expired/disconnected). */
export function getTargetEnv(): string | null {
  return readStored();
}

/** The project page the catalogue was opened from, while the handshake lasts.
 *  Null when it was opened on its own, and when the address is not on one of
 *  the platform's own origins. */
export function getBackUrl(): string | null {
  const back = readStoredPayload()?.back;
  return back && isPlatformAddress(back) ? back : null;
}

/** Whether an http(s) address is on the platform the catalogue belongs to: the page's own
 *  origin (AISC serves the catalogue on the launcher's) or one of BACK_ORIGINS. The handshake is
 *  anyone's to write, so its Back link and its controls app must pass this. */
export function isPlatformAddress(url: string): boolean {
  if (!isHttpUrl(url)) return false;
  const { origin } = new URL(url);
  return origin === window.location.origin || BACK_ORIGINS.includes(origin);
}

export function disconnectTargetEnv(): void {
  store().removeItem(STORAGE_KEY);
}

/**
 * Route "enable plugin" URIs to the local app.
 *
 * When we know the local origin (handshake), open it directly at its `/receiver`
 * route. Otherwise fire the registered `web+aiscplugin` protocol handler. Either
 * way we open a NEW tab and focus it (no service worker, no tab reuse). Returns
 * the opened window (or null).
 */
export function dispatchInstall(
  targetEnv: string | null,
  entries: InstallEntry[],
  /** The platform project the catalogue was opened from; the webapp preselects it. */
  project?: string | null
): Window | null {
  const uri = buildEnableUri(entries);
  // The handshake comes from a URL fragment, which anyone can write: only an
  // absolute http(s) address is a place to send somebody, and only a uuid is
  // a project. Anything else falls back to the custom protocol.
  const safeEnv = targetEnv && /^https?:\/\//i.test(targetEnv) ? targetEnv : null;
  const inProject = project && PID.test(project) ? `project=${encodeURIComponent(project)}&` : "";
  const win = safeEnv
    ? window.open(`${safeEnv}/receiver?${inProject}uri=${encodeURIComponent(uri)}`)
    : window.open(uri);
  try {
    win?.focus();
  } catch {
    /* ignore */
  }
  return win;
}
