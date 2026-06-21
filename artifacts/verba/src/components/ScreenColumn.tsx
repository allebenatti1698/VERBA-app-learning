import React from "react";

export const SCREEN_MAX = 640;

interface ScreenColumnProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  maxWidth?: number;
}

export default function ScreenColumn({ children, style, maxWidth = SCREEN_MAX }: ScreenColumnProps) {
  return (
    <div style={{ width: "100%", maxWidth, marginLeft: "auto", marginRight: "auto", boxSizing: "border-box", ...style }}>
      {children}
    </div>
  );
}
