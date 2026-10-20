import React from "react";
import { Link } from "react-router-dom";

// Pill-shaped navigation link (rounded, light-blue fill, bold blue text) used
// for the switches between the catalogue and the metrics page: "Explore
// metrics" on the catalogue, "Back to catalogue" on the metrics page. The icon
// trails the label by default; pass `iconBefore` to lead with it.

interface NavPillProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  iconBefore?: boolean;
  /** Label font size in px (default 13). */
  fontSize?: number;
}

const NavPill: React.FC<NavPillProps> = ({
  to,
  label,
  icon,
  iconBefore = false,
  fontSize = 13,
}) => (
  <Link
    to={to}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 18px",
      borderRadius: "28px",
      border: "1px solid #dee2e6",
      backgroundColor: "#F6F8FF",
      color: "#000FDF",
      fontSize: `${fontSize}px`,
      fontWeight: 600,
      textDecoration: "none",
      cursor: "pointer",
    }}
  >
    {iconBefore && icon}
    {label}
    {!iconBefore && icon}
  </Link>
);

export default NavPill;
