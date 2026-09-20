import { useState } from "react";
import Layout from "../components/Layout";
import api from "../api";

const COMMANDS = [
  { cmd: "/start",        desc: "Register with the bot & get welcome message"   },
  { cmd: "/help",         desc: "List all available commands"                    },
  { cmd: "/status",       desc: "Live platform stats — donations, meals, users"  },
  { cmd: "/urgent",       desc: "Show donations expiring in less than 2 hours"   },
  { cmd: "/leaderboard",  desc: "Top 5 donors on the platform"                   },
  { cmd: "/register ngo", desc: "Register as NGO to get donation alerts"         },
  { cmd: "/register donor",     desc: "Register as Donor to get claim alerts"    },
  { cmd: "/register volunteer", desc: "Register as Volunteer to get task alerts" },
];

const AUTO_ALERTS = [
  { event: "New Donation Posted",   who: "All NGOs",      icon: "🍱", color: "#10b981" },
  { event: "Donation Claimed",      who: "Donor",         icon: "✅", color: "#6366f1" },
  { event: "Volunteer Assigned",    who: "Volunteer",     icon: "🚴", color: "#f59e0b" },
  { event: "Delivery Completed",    who: "Donor + Admin", icon: "🎉", color: "#06b6d4" },
  { event: "Urgent Expiry (< 2h)",  who: "Everyone",      icon: "🚨", color: "#ef4444" },
];

export default function TelegramPage() {
  const [testMsg, setTestMsg] = useState("");
  const [sending, setSending] = useState(false);

  const sendTest = async () => {
    setSending(true);
    try {
      await api.post("/telegram/test");
      setTestMsg("success");
    } catch {
      setTestMsg("error");
    }
    setSending(false);
    setTimeout(() => setTestMsg(""), 4000);
  };

  return (
    <Layout>
      {/* Banner */}
      <div style={S.banner}>
        <div>
          <p style={S.eyebrow}>🤖 TELEGRAM INTEGRATION</p>
          <h1 style={S.title}>FoodShare Bot</h1>
          <p style={S.sub}>Real-time alerts on your phone — no app needed</p>
        </div>
        <span style={{ fontSize: 64 }}>✈️</span>
      </div>

      {/* Setup steps */}
      <div style={S.card}>
        <h3 style={S.cardTitle}>⚡ Setup in 3 Steps</h3>
        <div style={S.steps}>
          {[
            { n: 1, title: "Create Your Bot", desc: "Open Telegram → search @BotFather → send /newbot → follow instructions → copy the bot token" },
            { n: 2, title: "Add Token to .env", desc: 'Open backend/.env → set TELEGRAM_BOT_TOKEN=your_token_here → restart the backend server' },
            { n: 3, title: "Start the Bot", desc: "Open Telegram → search your bot name → send /start → send /register [your role] → done!" },
          ].map(s => (
            <div key={s.n} style={S.step}>
              <div style={S.stepNum}>{s.n}</div>
              <div>
                <p style={S.stepTitle}>{s.title}</p>
                <p style={S.stepDesc}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={S.grid2}>
        {/* Commands */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>📋 Bot Commands</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {COMMANDS.map(c => (
              <div key={c.cmd} style={S.cmdRow}>
                <code style={S.cmdCode}>{c.cmd}</code>
                <span style={S.cmdDesc}>{c.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auto alerts */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>🔔 Automatic Alerts</h3>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            These messages are sent automatically — no action needed
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {AUTO_ALERTS.map(a => (
              <div key={a.event} style={S.alertRow}>
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{a.event}</p>
                  <p style={{ fontSize: 12, color: "#6b7280" }}>Sent to: {a.who}</p>
                </div>
                <div style={{ ...S.alertDot, background: a.color }} />
              </div>
            ))}
          </div>

          {/* Test button */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
              Test your bot connection:
            </p>
            <button style={{ ...S.testBtn, opacity: sending ? 0.7 : 1 }} onClick={sendTest} disabled={sending}>
              {sending ? "Sending..." : "📤 Send Test Message"}
            </button>
            {testMsg === "success" && <p style={S.success}>✅ Test message sent! Check your Telegram.</p>}
            {testMsg === "error"   && <p style={S.error}>❌ Failed. Check your bot token in .env</p>}
          </div>
        </div>
      </div>

      {/* Sample message preview */}
      <div style={S.card}>
        <h3 style={S.cardTitle}>📱 Sample Messages Preview</h3>
        <div style={S.previewGrid}>
          {[
            {
              title: "New Donation Alert",
              color: "#10b981",
              msg: "🍱 New Food Donation!\n\n🥘 Biryani (cooked)\n⚖️ 5 kg  •  👥 Serves 20 people\n📍 Koramangala, Bangalore\n👤 Donated by: Ravi Kumar\n🟡 Expiry risk: MEDIUM (3.5h left)\n\n🌐 Open FoodShare app to claim!",
            },
            {
              title: "Urgent Expiry Alert",
              color: "#ef4444",
              msg: "🚨 URGENT — Food Expiring Soon!\n\n🍱 Dal Rice (2kg)\n👥 Serves 8 people\n📍 HSR Layout, Bangalore\n⏱️ Only 1.2h left!\n\n⚡ Claim immediately on FoodShare app!",
            },
            {
              title: "Delivery Complete",
              color: "#6366f1",
              msg: "🎉 Delivery Complete!\n\n🍱 Biryani has been delivered!\n🚴 Delivered by: Arjun\n👥 People fed: 20\n🌱 CO₂ saved: ~10 kg\n\nThank you for making a difference! 🌍❤️",
            },
          ].map(p => (
            <div key={p.title} style={{ ...S.preview, borderTop: `4px solid ${p.color}` }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: p.color, marginBottom: 10 }}>{p.title}</p>
              <div style={S.telegramBubble}>
                <pre style={S.previewText}>{p.msg}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

const S = {
  banner:    { background: "linear-gradient(135deg,#0088cc,#229ed9,#006699)", borderRadius: 16, padding: "28px 32px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" },
  eyebrow:   { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 6 },
  title:     { color: "#fff", fontSize: 28, fontWeight: 800 },
  sub:       { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 4 },
  card:      { background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.07)", marginBottom: 24 },
  cardTitle: { fontWeight: 800, fontSize: 16, color: "#111827", marginBottom: 20 },
  steps:     { display: "flex", flexDirection: "column", gap: 16 },
  step:      { display: "flex", gap: 16, alignItems: "flex-start" },
  stepNum:   { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#0088cc,#229ed9)", color: "#fff", fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepTitle: { fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 4 },
  stepDesc:  { fontSize: 13, color: "#6b7280", lineHeight: 1.6 },
  grid2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  cmdRow:    { display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #f9fafb" },
  cmdCode:   { background: "#f0f9ff", color: "#0088cc", padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 },
  cmdDesc:   { fontSize: 12, color: "#6b7280", lineHeight: 1.5 },
  alertRow:  { display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f9fafb" },
  alertDot:  { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  testBtn:   { padding: "10px 20px", background: "linear-gradient(135deg,#0088cc,#229ed9)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13 },
  success:   { color: "#10b981", fontSize: 13, marginTop: 8 },
  error:     { color: "#ef4444", fontSize: 13, marginTop: 8 },
  previewGrid:   { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 },
  preview:       { borderRadius: 12, padding: 16, background: "#f9fafb" },
  telegramBubble:{ background: "#fff", borderRadius: 12, padding: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  previewText:   { fontSize: 12, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" },
};
