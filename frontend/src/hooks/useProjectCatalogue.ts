import { useEffect, useRef, useState } from "react";
import {
  projectSlug,
  fetchProjectCatalogue,
  type ProjectCatalogueInfo,
} from "../services/projectCatalogue";

const NO_PROJECT = "Open this catalogue from a project in the AISC launcher.";
const NOT_CHOSEN = "This project has not chosen its catalogue yet: open it from the project page.";

/** The platform's HTTP status carried by a failed axios call, if any. */
const platformStatus = (err: unknown) =>
  (err as { response?: { status?: number } })?.response?.status;

/**
 * The project's catalogue, once the platform confirms the project chose one: its private copy, or the
 * public catalogue read live through the platform. `onReady` loads the page's data then, in the same
 * turn; until then `info` is null, and `stopped` says why the page loads nothing (no project, no
 * catalogue chosen yet, or the platform did not answer).
 */
export function useProjectCatalogue(onReady: () => void) {
  const [info, setInfo] = useState<ProjectCatalogueInfo | null>(null);
  const [stopped, setStopped] = useState<string | null>(null);
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    if (!projectSlug()) {
      setStopped(NO_PROJECT);
      return;
    }
    let cancelled = false;
    fetchProjectCatalogue().then(
      (answer) => {
        if (cancelled) return;
        if (answer.mode === "private" || answer.mode === "public") {
          setInfo(answer);
          ready.current();
        } else setStopped(NOT_CHOSEN);
      },
      (err) => {
        if (cancelled) return;
        setStopped(
          platformStatus(err) === 409
            ? NOT_CHOSEN
            : "Failed to load the project's catalogue. Please try again."
        );
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return { info, setInfo, stopped };
}
