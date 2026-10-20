import React, { useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import { useCrossSite } from "../crossSite/CrossSiteContext";
import AboutCatalogueModal from "./AboutCatalogueModal";
import { EXPIRED_MESSAGE } from "../crossSite/connect";

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  page: {
    display: "flex",
    flexDirection: "column" as const,
    minHeight: "100vh",
    backgroundColor: "#f8f9fa",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    background: "#000079",
    color: "#fff",
    padding: "12px 28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  logo: {
    height: "42px",
  },
  headerTitle: {
    fontSize: "15px",
    fontWeight: 600 as const,
    letterSpacing: "0.3px",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  aboutButton: {
    color: "#fff",
    backgroundColor: "transparent",
    fontSize: "14px",
    fontWeight: 600 as const,
    padding: "6px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.4)",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  // Back to the project page on the AISC launcher, where the other steps are.
  back: {
    color: "#fff",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: 600 as const,
    border: "1px solid rgba(255,255,255,.55)",
    padding: "6px 12px",
    whiteSpace: "nowrap" as const,
  },
  expired: {
    color: "#fff",
    fontSize: "13px",
  },
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface LayoutProps {
  children: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

/** Present when the catalogue was opened from a project: the launcher's
 *  handshake says which page it came from. Once the handshake has run out of
 *  time, it says how to get one again. */
const BackLink: React.FC = () => {
  const { backUrl, expired } = useCrossSite();
  if (!backUrl && expired) return <span style={s.expired}>{EXPIRED_MESSAGE}</span>;
  if (!backUrl) return null;
  return (
    <a href={backUrl} style={s.back} aria-label="Back to the project">
      ← Back
    </a>
  );
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div style={s.page}>
      <header
        style={{
          ...s.header,
          ...(isMobile
            ? { padding: "10px 14px", flexWrap: "wrap" as const, gap: "8px" }
            : {}),
        }}
      >
        <div style={s.headerLeft}>
          {/* served with the app, under the build's base path (CATALOGUE_BASE) */}
          <img
            src={`${import.meta.env.BASE_URL}img/laif_cmyk_negatif.png`}
            alt="Luxembourg AI Factory"
            style={{ ...s.logo, ...(isMobile ? { height: "30px" } : {}) }}
          />
          <span
            style={{
              ...s.headerTitle,
              ...(isMobile ? { fontSize: "13px" } : {}),
            }}
          >
            AI Assessment Sandbox Configurator
          </span>
        </div>
        <div style={s.headerRight}>
          <button
            type="button"
            style={s.aboutButton}
            onClick={() => setShowAbout(true)}
          >
            About the catalogue
          </button>
          {/* Back to the project page it was opened from. */}
          <BackLink />
        </div>
      </header>
      {children}
      {showAbout && <AboutCatalogueModal onClose={() => setShowAbout(false)} />}
    </div>
  );
};

export default Layout;
