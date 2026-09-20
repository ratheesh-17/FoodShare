import { useMemo } from "react";

export default function AnalyticsChart({ donations = [] }) {
  const days = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : d.toLocaleDateString("en-IN", { weekday: "short" });
      const count = donations.filter(don => don.created_at?.slice(0, 10) === key).length;
      const completed = donations.filter(don => don.created_at?.slice(0, 10) === key && don.status === "completed").length;
      result.push({ label, count, completed });
    }
    return result;
  }, [donations]);

  const maxCount = Math.max(...days.map(d => d.count), 1);
  const total    = days.reduce((s, d) => s + d.count, 0);
  const totalCompleted = days.reduce((s, d) => s + d.completed, 0);

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h3 style={S.title}>📈 7-Day Donation Activity</h3>
          <p style={S.sub}>Powered by real-time data</p>
        </div>
        <div style={S.headerStats}>
          <div style={S.hStat}>
            <p style={{ ...S.hVal, color: "#6366f1" }}>{total}</p>
            <p style={S.hLbl}>This Week</p>
          </div>
          <div style={S.hStat}>
            <p style={{ ...S.hVal, color: "#10b981" }}>{totalCompleted}</p>
            <p style={S.hLbl}>Completed</p>
          </div>
          <div style={S.hStat}>
            <p style={{ ...S.hVal, color: "#f59e0b" }}>{total > 0 ? Math.round((totalCompleted / total) * 100) : 0}%</p>
            <p style={S.hLbl}>Success Rate</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={S.chart}>
        {days.map((d, i) => {
          const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
          const compPct   = d.count > 0 ? (d.completed / d.count) * 100 : 0;
          const isToday   = i === 6;
          return (
            <div key={i} style={S.barCol}>
              {/* Count label */}
              {d.count > 0 && (
                <span style={{ ...S.barLabel, color: isToday ? "#6366f1" : "#6b7280" }}>{d.count}</span>
              )}
              {/* Bar */}
              <div style={S.barTrack}>
                <div style={{ ...S.bar, height: `${heightPct}%`, background: isToday ? "linear-gradient(to top,#6366f1,#8b5cf6)" : "linear-gradient(to top,#c7d2fe,#a5b4fc)", borderRadius: "6px 6px 0 0", position: "relative", overflow: "hidden" }}>
                  {/* Completed overlay */}
                  {d.completed > 0 && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${compPct}%`, background: isToday ? "linear-gradient(to top,#10b981,#06b6d4)" : "linear-gradient(to top,#6ee7b7,#34d399)", borderRadius: "6px 6px 0 0" }} />
                  )}
                </div>
              </div>
              {/* Day label */}
              <span style={{ ...S.dayLabel, color: isToday ? "#6366f1" : "#9ca3af", fontWeight: isToday ? 800 : 500 }}>{d.label}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={S.legend}>
        <div style={S.legendItem}><div style={{ ...S.legendDot, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} /><span>Total Posted</span></div>
        <div style={S.legendItem}><div style={{ ...S.legendDot, background: "linear-gradient(135deg,#10b981,#06b6d4)" }} /><span>Completed</span></div>
      </div>
    </div>
  );
}

const S = {
  wrap:   { background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.07)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title:  { fontWeight: 800, fontSize: 16, color: "#111827" },
  sub:    { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  headerStats: { display: "flex", gap: 20 },
  hStat:  { textAlign: "center" },
  hVal:   { fontWeight: 800, fontSize: 22 },
  hLbl:   { fontSize: 11, color: "#9ca3af" },
  chart:  { display: "flex", gap: 8, alignItems: "flex-end", height: 160, padding: "0 4px" },
  barCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  barLabel: { fontSize: 11, fontWeight: 700 },
  barTrack: { width: "100%", flex: 1, display: "flex", alignItems: "flex-end" },
  bar:    { width: "100%", minHeight: 4, transition: "height 0.8s ease" },
  dayLabel: { fontSize: 10, textAlign: "center" },
  legend: { display: "flex", gap: 20, marginTop: 16, justifyContent: "center" },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" },
  legendDot:  { width: 10, height: 10, borderRadius: "50%" },
};
