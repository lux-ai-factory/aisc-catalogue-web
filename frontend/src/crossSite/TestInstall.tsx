import React, { useState } from "react";
import { installTest } from "../services/catalogueApi";
import type { InstallCoordinates } from "./coordinates";
import { Actions, s } from "./ControlInstall";

/**
 * "Install into this project…" for a test, without leaving the project's catalogue, as a control is
 * (ControlInstall). The catalogue's pages share an origin with the
 * platform, which installs the test in the engine with the person's sign-in: the engine checks the admin
 * role and records the install. The project is the catalogue's own, so there is nothing to choose.
 */
export default function TestInstall({
  coordinates,
  style,
  onInstalled,
}: {
  coordinates: InstallCoordinates;
  style: React.CSSProperties;
  onInstalled?: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const close = () => setOpen(false);

  const start = () => {
    setOpen(true);
    setPending(false);
    setError(null);
    setDone(false);
  };

  const install = () => {
    setPending(true);
    setError(null);
    installTest(coordinates.slug)
      .then(() => {
        setDone(true);
        setPending(false);
        onInstalled?.(coordinates.slug);
      })
      .catch((err) => {
        // only text is shown: a list (e.g. a validation error) would crash the page
        const detail = err?.response?.data?.detail;
        setError(typeof detail === "string" && detail ? detail : "The platform did not install it.");
        setPending(false);
      });
  };

  return (
    <>
      <button type="button" style={style} onClick={start}>
        Install into this project…
      </button>
      {open && (
        <div style={s.overlay} onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="test-install-title"
            style={s.dialog}
            onClick={(e) => e.stopPropagation()}
          >
            <div id="test-install-title" style={s.eyebrow}>Install a test</div>
            <div style={s.control}>
              <div style={s.title}>{coordinates.pkg}</div>
              <div style={s.muted}>{`Version ${coordinates.version}`}</div>
            </div>
            {done ? (
              <>
                <p style={s.already}>Installed in this project.</p>
                <p style={s.muted}>It is on the engine&apos;s Tests page, ready to configure and run.</p>
                <Actions onCancel={close} cancelLabel="Close" />
              </>
            ) : (
              <>
                {error && <p style={s.error}>{error}</p>}
                <Actions onCancel={close}>
                  <button type="button" style={s.primary(pending)} disabled={pending} onClick={install}>
                    {pending ? "Installing…" : "Install"}
                  </button>
                </Actions>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
