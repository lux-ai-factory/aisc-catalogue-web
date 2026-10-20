import React, { useEffect } from "react";

const REMI_URL =
  "https://cnpd.public.lu/en/professionnels/outils-conformite/remi.html";

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 1000,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: "40px",
    overflowY: "auto" as const,
  },
  modal: {
    backgroundColor: "#fff",
    color: "#1a1a2e",
    borderRadius: "16px",
    width: "90%",
    maxWidth: "720px",
    padding: "32px 36px",
    position: "relative" as const,
    boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
    fontFamily: "Arial, sans-serif",
    marginBottom: "40px",
    boxSizing: "border-box" as const,
  },
  closeButton: {
    position: "absolute" as const,
    top: "16px",
    right: "16px",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: "#3b5bdb",
    color: "#fff",
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "24px",
    fontWeight: 700 as const,
    marginTop: 0,
    marginBottom: "20px",
    paddingRight: "50px",
  },
  heading: {
    fontSize: "15px",
    fontWeight: 700 as const,
    margin: "20px 0 6px",
  },
  paragraph: {
    fontSize: "14px",
    lineHeight: 1.6,
    margin: 0,
  },
  link: {
    color: "#3b5bdb",
  },
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface AboutCatalogueModalProps {
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const AboutCatalogueModal: React.FC<AboutCatalogueModalProps> = ({ onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={s.overlay} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-catalogue-title"
        style={s.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <button style={s.closeButton} onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 id="about-catalogue-title" style={s.title}>
          About the catalogue
        </h2>

        <div style={s.heading}>Methodology</div>
        <p style={s.paragraph}>
          The methodology behind this catalogue was established through the
          working group sessions of{" "}
          <a href={REMI_URL} target="_blank" rel="noopener noreferrer" style={s.link}>
            REgulation Meets Innovation (RE.M.I.)
          </a>
          , organised by the Commission Nationale pour la Protection des
          Données (CNPD) and the Luxembourg AI Factory.
        </p>

        <div style={s.heading}>Trustworthiness dimensions</div>
        <p style={s.paragraph}>
          The trustworthiness dimensions are taken from the Ethics Guidelines
          for Trustworthy AI of the European Commission's High-Level Expert
          Group on AI (AI HLEG), complemented by the other main requirements
          of the EU AI Act.
        </p>

        <div style={s.heading}>AI system under assessment</div>
        <p style={s.paragraph}>
          The classification of the AI system under assessment follows the
          Hugging Face task taxonomy.
        </p>

        <div style={s.heading}>Checklists</div>
        <p style={s.paragraph}>
          The checklists currently in the catalogue are those we found
          published online by the different authorities and organisations.
        </p>

        <div style={s.heading}>Testing tools</div>
        <p style={s.paragraph}>
          Some of the testing tools were contributed by the members of the
          Luxembourg AI Factory; the others were selected among the available
          open-source tools.
        </p>
      </div>
    </div>
  );
};

export default AboutCatalogueModal;
