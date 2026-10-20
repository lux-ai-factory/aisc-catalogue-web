import React, { useEffect, useRef, useState } from "react";
import { useCrossSite } from "./CrossSiteContext";
import {
  buildEnableUri,
  dispatchInstall,
  type InstallEntry,
} from "./connect";

export type InstallStatus = "idle" | "success" | "failed";

const defaultStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 20px",
  borderRadius: 8,
  border: "none",
  backgroundColor: "#8D00DF",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
};

/**
 * "Enable plugin" action. Routes a `web+aiscplugin://enable?...` URI (now
 * carrying this plugin's package+version) to the local app, opening a single
 * NEW tab that is left open and focused. No service worker or tab management.
 */
const InstallPluginButton: React.FC<{
  pkg: string;
  version: string;
  label?: string;
  /** The catalogue entry this distribution comes from, recorded by the engine. */
  slug?: string;
  /** The platform project the catalogue was opened from; the webapp preselects it. */
  project?: string | null;
  /** The anchor's style, so a test and a control look the same. */
  style?: React.CSSProperties;
}> = ({ pkg, version, label = "Enable plugin", slug, project, style }) => {
  const { targetUrl } = useCrossSite();
  const [status, setStatus] = useState<InstallStatus>("idle");
  const statusRef = useRef<InstallStatus>("idle");
  const timers = useRef<number[]>([]);

  const update = (s: InstallStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  useEffect(() => {
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  const after = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const resetSoon = () => after(() => update("idle"), 4000);

  const handleInstall = () => {
    const entry: InstallEntry = { package: pkg, version, slug };
    const win = dispatchInstall(targetUrl, [entry], project);
    if (!win) {
      // Popup blocked.
      update("failed");
      resetSoon();
      return;
    }
    update("success");
    resetSoon();
  };

  // Always prevent the default anchor navigation so the catalogue tab is never
  // navigated to the custom protocol; dispatchInstall opens a fresh tab instead.
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    handleInstall();
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <a
        href={buildEnableUri([{ package: pkg, version, slug }])}
        onClick={handleClick}
        style={style ?? defaultStyle}
      >
        {label}
      </a>
      {status === "success" &&
        (targetUrl ? (
          <span style={{ color: "#16a34a", fontWeight: 600, fontSize: 13 }}>
            ✅ Opened your local app in a new tab
          </span>
        ) : (
          <span style={{ color: "#16a34a", fontWeight: 600, fontSize: 13 }}>
            ✅ Sent to your local app
          </span>
        ))}
      {status === "failed" && (
        <span style={{ color: "#b91c1c", fontWeight: 600, fontSize: 13 }}>
          ❌ Couldn’t open a new tab. Allow pop-ups for this site, or open your
          local app once to connect.
        </span>
      )}
    </div>
  );
};

export default InstallPluginButton;
