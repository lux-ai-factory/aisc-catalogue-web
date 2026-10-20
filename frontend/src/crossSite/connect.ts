/**
 * The `#env=` handshake the AISC launcher adds to the catalogue's link.
 *
 * The fragment carries a short-lived, base64-encoded payload:
 *
 *   #env=<base64({ url, expires, controls?, project?, back? })>
 *
 * It is read when this module loads, kept for this tab and stripped from the
 * address. It says where the platform's controls app is, which project the
 * catalogue was opened from, and the page to go back to. It also names the
 * platform's webapp (`url`), which the launcher always sends: nothing opens it
 * any more, but a handshake without one on the platform is still refused.
 * Nothing is sent to any server.
 *
 * The fragment is anyone's to write, so: the handshake is kept per tab
 * (sessionStorage), so two tabs opened from two projects keep their own; it may
 * claim to last an hour at most; and its webapp, Back link and controls app are
 * taken only on the platform's own origins: the page's own (the launcher's) and
 * VITE_BACK_ORIGINS (comma-separated; the stack's http://localhost and
 * http://localhost:8100 by default).
 */
export const STORAGE_KEY = "aisc_target_env";
/** What the page says where the handshake's Back link or control install would
 *  be, once the handshake has run out of time. */
export const EXPIRED_MESSAGE = "Open the catalogue again from the project page.";

/** Set for the tab once its handshake has run out of time, until a fresh one arrives. */
const EXPIRED_KEY = "aisc_target_env_expired";

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
  /** The platform's webapp: required and checked, not used. */
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
 * The handshake as it may be used, or null. It must name a `url` on the platform
 * (isPlatformAddress: the handshake is anyone's to write, and the launcher always
 * sends its own) and must not have expired or claim to last more than
 * MAX_HANDSHAKE_MS. A `back` that is not http(s) is dropped.
 */
function validHandshake(p: unknown): HandshakePayload | null {
  const v = p as HandshakePayload | null;
  if (!v || typeof v.url !== "string" || typeof v.expires !== "number") return null;
  const now = Date.now();
  if (!isPlatformAddress(v.url) || v.expires <= now || v.expires > now + MAX_HANDSHAKE_MS) return null;
  if (v.back === undefined || isHttpUrl(v.back)) return v;
  const { back: _unsafe, ...rest } = v;
  return rest;
}

/** Remembers for the tab that a handshake from the platform was refused only
 *  because its time had run out: the page then says to open the catalogue
 *  again rather than to open it from the platform. */
function noteIfExpired(p: unknown): void {
  const v = p as HandshakePayload | null;
  if (v && typeof v.url === "string" && typeof v.expires === "number"
      && v.expires <= Date.now() && isPlatformAddress(v.url)) {
    store().setItem(EXPIRED_KEY, "1");
  }
}

function decodeHash(): HandshakePayload | null {
  const hash = window.location.hash;
  if (!hash.startsWith("#env=")) return null;
  try {
    const payload = JSON.parse(atob(hash.replace("#env=", "")));
    noteIfExpired(payload);
    return validHandshake(payload);
  } catch (e) {
    console.error("Invalid handshake payload:", e);
  }
  return null;
}

function readStoredPayload(): HandshakePayload | null {
  try {
    const raw = store().getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const payload = validHandshake(parsed);
    if (payload) return payload;
    noteIfExpired(parsed);
    store().removeItem(STORAGE_KEY);
  } catch (e) {
    /* ignore corrupt entries */
  }
  return null;
}

/** The whole stored handshake (or null if there is none or it expired). */
export function getHandshake(): HandshakePayload | null {
  return readStoredPayload();
}

/** Whether this tab's handshake ran out of time (the launcher gives an hour)
 *  and no fresh one has arrived since. */
export function handshakeExpired(): boolean {
  try {
    readStoredPayload();
    return store().getItem(EXPIRED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Consume a `#env=` handshake on load, if one is present. Returns the
 *  handshake kept for this tab (or null when there is none). */
export function startCrossSiteSession(): HandshakePayload | null {
  const handshake = decodeHash();
  if (handshake) {
    store().setItem(STORAGE_KEY, JSON.stringify(handshake));
    store().removeItem(EXPIRED_KEY);
    // Strip the token from the URL so it is never shared/history-logged.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
    return handshake;
  }
  return readStoredPayload();
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
