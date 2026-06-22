import type { CSSProperties } from "react";

// Stile UNICO dei bottoni d'azione primari (Begin, Continue, Next, Check).
// Per un restyling futuro basta modificare QUESTO oggetto.
export const primaryButtonStyle: CSSProperties = {
  padding: "12px 32px",
  borderRadius: 9999,
  border: "none",
  cursor: "pointer",
  width: 200,
  background: "linear-gradient(to right, #F59E0B, #EA580C)",
  fontFamily: "'Inter', sans-serif",
  fontWeight: 500,
  fontSize: 15,
  letterSpacing: "0.04em",
  color: "#FFFFFF",
  outline: "none",
  boxShadow: "0 0 14px rgba(245,158,11,0.3)",
};
