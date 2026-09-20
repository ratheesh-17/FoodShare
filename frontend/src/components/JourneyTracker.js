const STEPS = [
  { key: "posted",    icon: "🍱", label: "Posted",           desc: "Food listed by donor"         },
  { key: "claimed",   icon: "🏢", label: "Claimed by NGO",   desc: "NGO reserved this donation"   },
  { key: "assigned",  icon: "🚴", label: "Volunteer Assigned", desc: "Pickup volunteer assigned"  },
  { key: "completed", icon: "✅", label: "Delivered",         desc: "Food reached the community"  },
];

const ORDER = ["posted", "claimed", "assigned", "completed"];

export default function JourneyTracker({ status, foodName, compact = false }) {
  const currentIdx = ORDER.indexOf(status);
  const isExpired  = status === "expired";

  if (compact) {
    return (
      <div style={CS.row}>
        {STEPS.map((step, i) => {
          const done    = i <= currentIdx && !isExpired;
          const active  = i === currentIdx && !isExpired;
          return (
            <div key={step.key} style={CS.stepWrap}>
              <div style={{ ...CS.dot, background: done ? "#10b981" : "#e5e7eb", transform: active ? "scale(1.3)" : "scale(1)", boxShadow: active ? "0 0 0 4px rgba(16,185,129,0.2)" : "none" }}>
                {done ? "✓" : <span style={{ fontSize: 10 }}>{step.icon}</span>}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ ...CS.line, background: i < currentIdx && !isExpired ? "#10b981" : "#e5e7eb" }} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <p style={S.title}>🛤️ Food Journey — <strong>{foodName}</strong></p>
      {isExpired && <div style={S.expiredBanner}>⛔ This donation expired before delivery</div>}
      <div style={S.track}>
        {STEPS.map((step, i) => {
          const done   = i < currentIdx && !isExpired;
          const active = i === currentIdx && !isExpired;
          const future = i > currentIdx || isExpired;
          return (
            <div key={step.key} style={S.stepRow}>
              {/* Connector line */}
              <div style={S.lineCol}>
                <div style={{ ...S.circle,
                  background: done ? "linear-gradient(135deg,#10b981,#06b6d4)" : active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#f3f4f6",
                  boxShadow: active ? "0 0 0 6px rgba(99,102,241,0.2)" : "none",
                  transform: active ? "scale(1.15)" : "scale(1)",
                }}>
                  {done ? "✓" : step.icon}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ ...S.vline, background: done ? "#10b981" : "#e5e7eb" }} />
                )}
              </div>
              {/* Content */}
              <div style={{ ...S.content, opacity: future ? 0.4 : 1 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: active ? "#6366f1" : done ? "#10b981" : "#9ca3af" }}>
                  {step.label}
                  {active && <span style={S.activePill}>● NOW</span>}
                </p>
                <p style={{ fontSize: 12, color: "#6b7280" }}>{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const S = {
  wrap:          { background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  title:         { fontSize: 14, color: "#374151", marginBottom: 16 },
  expiredBanner: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 12 },
  track:         { display: "flex", flexDirection: "column" },
  stepRow:       { display: "flex", gap: 16, minHeight: 60 },
  lineCol:       { display: "flex", flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0 },
  circle:        { width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontWeight: 700, transition: "all 0.3s", flexShrink: 0 },
  vline:         { width: 2, flex: 1, minHeight: 16, marginTop: 4, transition: "background 0.3s" },
  content:       { paddingTop: 8, paddingBottom: 8, transition: "opacity 0.3s" },
  activePill:    { marginLeft: 8, fontSize: 10, fontWeight: 800, color: "#6366f1", background: "#eef2ff", padding: "2px 6px", borderRadius: 10 },
};

// Compact styles
const CS = {
  row:      { display: "flex", alignItems: "center" },
  stepWrap: { display: "flex", alignItems: "center" },
  dot:      { width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, transition: "all 0.3s", flexShrink: 0 },
  line:     { width: 24, height: 2, transition: "background 0.3s" },
};
