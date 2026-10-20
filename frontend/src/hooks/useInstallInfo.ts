import { useEffect, useState } from "react";
import { fetchInstallInfo } from "../services/catalogueApi";
import type { InstallInfo } from "../services/catalogueApi";

export interface InstallInfoState {
  /** The backend's answer, or null while it is still being asked. */
  info: InstallInfo | null;
  /** Set when the install service could not be reached at all. */
  error: string | null;
}

/**
 * Which distribution a catalogue entry is, and which version the package index
 * actually has. The engine installs a distribution, not a catalogue entry, so
 * the backend is asked rather than the tool's own name and version used.
 * A null slug asks nothing (a build without installs).
 */
export function useInstallInfo(slug: string | null): InstallInfoState {
  const [info, setInfo] = useState<InstallInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setInfo(null);
    setError(null);
    if (slug === null) return;
    fetchInstallInfo(slug)
      .then((answer) => { if (!cancelled) setInfo(answer); })
      .catch(() => { if (!cancelled) setError("Could not reach the catalogue's install service."); });
    return () => { cancelled = true; };
  }, [slug]);
  return { info, error };
}
