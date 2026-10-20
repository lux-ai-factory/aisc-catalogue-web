import React from "react";
import { useCrossSite } from "./CrossSiteContext";

/**
 * Global connection banner: shows whether this catalogue is connected to a
 * local app (via the #env handshake) so "enable plugin" actions can route
 * directly to it.
 */
const ConnectionBanner: React.FC = () => {
  const { targetUrl, disconnect } = useCrossSite();

  if (targetUrl) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          padding: "10px 20px",
          backgroundColor: "#ecfdf5",
          borderBottom: "1px solid #6ee7b7",
          color: "#065f46",
          fontSize: "14px",
          fontFamily: "Arial, sans-serif",
          flexWrap: "wrap" as const,
        }}
      >
        <span>
          <strong>✅ Connected to local app:</strong> {targetUrl}
        </span>
        <span
          onClick={disconnect}
          style={{
            cursor: "pointer",
            border: "none",
            background: "none",
            textDecoration: "underline",
            color: "#065f46",
            fontSize: "13px",
          }}
        >
          Disconnect
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "10px 20px",
        backgroundColor: "#f1f5f9",
        borderBottom: "1px solid #cbd5e1",
        color: "#475569",
        fontSize: "14px",
        textAlign: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      Not connected to a local app. "Enable plugin" will open a new tab via your
      OS protocol handler; open your local app once to connect for a direct handoff.
    </div>
  );
};

export default ConnectionBanner;
