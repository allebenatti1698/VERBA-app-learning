import AppBackground from "@/components/AppBackground";
import { User } from "lucide-react";

export default function ProfileScreen() {
  return (
    <div style={{ minHeight: "100%", width: "100%", background: "#0A0A0A", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <AppBackground showWords={false} />
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <User size={34} strokeWidth={1.5} color="#C7B8E8" />
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: "#FFFFFF", margin: 0 }}>Profile</h1>
      </div>
    </div>
  );
}
