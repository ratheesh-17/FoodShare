import { useState, useEffect } from "react";

export default function CountdownTimer({ expiresAt, compact = false }) {
  const [timeLeft, setTimeLeft] = useState(calcLeft(expiresAt));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calcLeft(expiresAt)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!timeLeft) return <span style={S.expired}>⛔ Expired</span>;

  const urgent = timeLeft.totalSeconds < 3600;
  const warning = timeLeft.totalSeconds < 7200;

  const color = urgent ? "#ef4444" : warning ? "#f59e0b" : "#10b981";
  const bg    = urgent ? "#fef2f2" : warning ? "#fffbeb" : "#ecfdf5";

  if (compact) {
    return (
      <span style={{ ...S.compact, color, background: bg, animation: urgent ? "pulse 1s infinite" : "none" }}>
        ⏱ {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
      </span>
    );
  }

  return (
    <div style={{ ...S.box, borderColor: color, background: bg, animation: urgent ? "pulse 1.2s infinite" : "none" }}>
      <span style={{ fontSize: 16 }}>{urgent ? "🔴" : warning ? "⚠️" : "🟢"}</span>
      <div style={S.segments}>
        {[["HRS", timeLeft.h], ["MIN", timeLeft.m], ["SEC", timeLeft.s]].map(([lbl, val]) => (
          <div key={lbl} style={S.seg}>
            <span style={{ ...S.segVal, color }}>{String(val).padStart(2, "0")}</span>
            <span style={S.segLbl}>{lbl}</span>
          </div>
        ))}
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700 }}>
        {urgent ? "URGENT!" : warning ? "Expiring soon" : "Time left"}
      </span>
    </div>
  );
}

function calcLeft(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  return {
    totalSeconds,
    h: Math.floor(totalSeconds / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  };
}

const S = {
  box:     { display: "inline-flex", alignItems: "center", gap: 10, border: "2px solid", borderRadius: 12, padding: "8px 14px", transition: "all 0.3s" },
  segments:{ display: "flex", gap: 6, alignItems: "center" },
  seg:     { display: "flex", flexDirection: "column", alignItems: "center" },
  segVal:  { fontSize: 18, fontWeight: 800, lineHeight: 1 },
  segLbl:  { fontSize: 9, color: "#9ca3af", fontWeight: 700, letterSpacing: 1 },
  compact: { fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 },
  expired: { fontSize: 11, fontWeight: 700, color: "#6b7280", background: "#f9fafb", padding: "2px 8px", borderRadius: 20 },
};
