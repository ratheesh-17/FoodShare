const BADGES = [
  { min: 50, icon: "👑", label: "Legend",    color: "#f59e0b", bg: "linear-gradient(135deg,#f59e0b,#d97706)" },
  { min: 20, icon: "🥇", label: "Gold",      color: "#f59e0b", bg: "linear-gradient(135deg,#fbbf24,#f59e0b)" },
  { min: 10, icon: "🌟", label: "Star",      color: "#6366f1", bg: "linear-gradient(135deg,#6366f1,#8b5cf6)" },
  { min: 5,  icon: "🥈", label: "Silver",    color: "#9ca3af", bg: "linear-gradient(135deg,#9ca3af,#6b7280)" },
  { min: 1,  icon: "🌱", label: "New Hero",  color: "#10b981", bg: "linear-gradient(135deg,#10b981,#06b6d4)" },
];

export function getBadge(donationCount) {
  return BADGES.find(b => donationCount >= b.min) || BADGES[BADGES.length - 1];
}

export default function Leaderboard({ donors = [], compact = false }) {
  if (donors.length === 0) return <p style={{ color: "#9ca3af", textAlign: "center", padding: 24 }}>No donors yet.</p>;

  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {donors.slice(0, 5).map((d, i) => {
          const badge = getBadge(d.donations);
          return (
            <div key={i} style={CS.row}>
              <span style={{ ...CS.rank, background: ["#f59e0b","#9ca3af","#cd7f32","#6366f1","#10b981"][i] || "#6b7280" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 13 }}>{d.name}</p>
                <p style={{ fontSize: 11, color: "#6b7280" }}>{d.donations} donations · {d.meals} meals</p>
              </div>
              <span style={{ ...CS.badge, background: badge.bg }}>{badge.icon} {badge.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {/* Podium for top 3 */}
      {donors.length >= 3 && (
        <div style={S.podium}>
          {/* 2nd place */}
          <PodiumCard donor={donors[1]} rank={2} height={100} color="#9ca3af" />
          {/* 1st place */}
          <PodiumCard donor={donors[0]} rank={1} height={130} color="#f59e0b" crown />
          {/* 3rd place */}
          <PodiumCard donor={donors[2]} rank={3} height={80}  color="#cd7f32" />
        </div>
      )}

      {/* Full list */}
      <div style={S.list}>
        {donors.map((d, i) => {
          const badge = getBadge(d.donations);
          const pct   = donors[0]?.donations ? Math.round((d.donations / donors[0].donations) * 100) : 0;
          return (
            <div key={i} style={{ ...S.row, background: i === 0 ? "linear-gradient(135deg,#fffbeb,#fef3c7)" : "#fff", border: i === 0 ? "2px solid #f59e0b" : "1px solid #f3f4f6" }}>
              <span style={{ ...S.rankNum, background: ["linear-gradient(135deg,#f59e0b,#d97706)","linear-gradient(135deg,#9ca3af,#6b7280)","linear-gradient(135deg,#cd7f32,#a0522d)"][i] || "#f3f4f6", color: i < 3 ? "#fff" : "#6b7280" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
              </span>
              <div style={S.avatar}>{d.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{d.name}</p>
                  <span style={{ ...S.badgePill, background: badge.bg }}>{badge.icon} {badge.label}</span>
                </div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: badge.bg, borderRadius: 3, transition: "width 1s ease" }} />
                </div>
              </div>
              <div style={S.stats}>
                <p style={{ fontWeight: 800, fontSize: 20, color: badge.color }}>{d.donations}</p>
                <p style={{ fontSize: 10, color: "#9ca3af" }}>donations</p>
                <p style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginTop: 2 }}>{d.meals}</p>
                <p style={{ fontSize: 10, color: "#9ca3af" }}>meals</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PodiumCard({ donor, rank, height, color, crown }) {
  const badge = getBadge(donor.donations);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {crown && <span style={{ fontSize: 28 }}>👑</span>}
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: badge.bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 20, boxShadow: `0 4px 16px ${color}66` }}>
        {donor.name[0]}
      </div>
      <p style={{ fontWeight: 700, fontSize: 13, color: "#111827", textAlign: "center" }}>{donor.name}</p>
      <p style={{ fontSize: 11, color: "#6b7280" }}>{donor.donations} donations</p>
      <div style={{ width: 80, height, background: `linear-gradient(to top, ${color}, ${color}88)`, borderRadius: "8px 8px 0 0", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 8 }}>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>#{rank}</span>
      </div>
    </div>
  );
}

const S = {
  podium:   { display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 16, marginBottom: 32, padding: "20px 0" },
  list:     { display: "flex", flexDirection: "column", gap: 10 },
  row:      { display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, transition: "all 0.2s" },
  rankNum:  { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 },
  avatar:   { width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#f3f4f6,#e5e7eb)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 },
  badgePill:{ color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 },
  stats:    { textAlign: "center", minWidth: 60 },
};

const CS = {
  row:   { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f9fafb" },
  rank:  { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 12, flexShrink: 0 },
  badge: { color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 },
};
