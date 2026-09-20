import { useState, useEffect, useRef } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";
import Layout from "../components/Layout";

const BOT_NAME = "ratheesh_17_bot";

export default function ProfilePage() {
  const { user, login } = useAuth();
  const [connected, setConnected]   = useState(!!user?.telegram_chat_id);
  const [chatId, setChatId]         = useState(user?.telegram_chat_id || null);
  const [msg, setMsg]               = useState("");
  const [loading, setLoading]       = useState(false);
  const widgetRef = useRef(null);

  // Inject Telegram Login Widget script
  useEffect(() => {
    if (connected) return;
    if (!widgetRef.current) return;

    // Clear any previous widget
    widgetRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_NAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;
    widgetRef.current.appendChild(script);

    // Global callback Telegram widget calls
    window.onTelegramAuth = async (tgUser) => {
      setLoading(true); setMsg("");
      try {
        await api.post("/users/connect-telegram", {
          telegram_id: String(tgUser.id),
          first_name:  tgUser.first_name,
          username:    tgUser.username || null,
          hash:        tgUser.hash,
        });
        setChatId(String(tgUser.id));
        setConnected(true);
        setMsg("success");
        // Update local user state
        const token = localStorage.getItem("token");
        const updatedUser = { ...user, telegram_chat_id: String(tgUser.id) };
        login(token, updatedUser);
      } catch (err) {
        setMsg(err.response?.data?.detail || "Connection failed");
      }
      setLoading(false);
    };

    return () => { delete window.onTelegramAuth; };
  }, [connected]); // eslint-disable-line

  const disconnect = async () => {
    setLoading(true);
    try {
      await api.delete("/users/disconnect-telegram");
      setConnected(false); setChatId(null); setMsg("disconnected");
      const token = localStorage.getItem("token");
      login(token, { ...user, telegram_chat_id: null });
    } catch { setMsg("Failed to disconnect"); }
    setLoading(false);
  };

  const ROLE_GRAD = {
    donor:     "linear-gradient(135deg,#f97316,#ef4444)",
    ngo:       "linear-gradient(135deg,#6366f1,#8b5cf6)",
    volunteer: "linear-gradient(135deg,#10b981,#06b6d4)",
    admin:     "linear-gradient(135deg,#f59e0b,#ef4444)",
  };

  return (
    <Layout>
      {/* Banner */}
      <div style={{ ...S.banner, background: ROLE_GRAD[user?.role] || S.banner.background }}>
        <div style={S.bannerAvatar}>{user?.name?.[0]?.toUpperCase()}</div>
        <div>
          <h1 style={S.bannerName}>{user?.name}</h1>
          <p style={S.bannerRole}>{user?.role?.toUpperCase()} · {user?.email}</p>
        </div>
      </div>

      <div style={S.grid2}>
        {/* Profile info */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>👤 Profile Details</h3>
          {[
            ["Name",    user?.name],
            ["Email",   user?.email],
            ["Role",    user?.role],
            ["Address", user?.address || "Not set"],
            ["Rating",  user?.rating ? `⭐ ${user.rating}/5` : "5.0"],
            ["Location", user?.lat && user?.lng ? `${parseFloat(user.lat).toFixed(4)}, ${parseFloat(user.lng).toFixed(4)}` : "Not set"],
          ].map(([label, value]) => (
            <div key={label} style={S.infoRow}>
              <span style={S.infoLabel}>{label}</span>
              <span style={S.infoValue}>{value}</span>
            </div>
          ))}
        </div>

        {/* Telegram connect */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>✈️ Telegram Notifications</h3>

          {connected ? (
            <div>
              {/* Connected state */}
              <div style={S.connectedBox}>
                <div style={S.connectedIcon}>✅</div>
                <div>
                  <p style={{ fontWeight: 700, color: "#065f46", fontSize: 15 }}>Telegram Connected!</p>
                  <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Chat ID: {chatId}</p>
                  <p style={{ fontSize: 12, color: "#6b7280" }}>You'll receive all donation alerts on Telegram</p>
                </div>
              </div>

              <div style={S.alertList}>
                {[
                  { icon: "🍱", text: "New donations posted near you" },
                  { icon: "✅", text: "Your donation was claimed" },
                  { icon: "🚴", text: "Volunteer assigned to your task" },
                  { icon: "🎉", text: "Delivery completed with impact" },
                  { icon: "🚨", text: "Urgent expiry warnings" },
                ].map(a => (
                  <div key={a.text} style={S.alertItem}>
                    <span>{a.icon}</span>
                    <span style={{ fontSize: 13, color: "#374151" }}>{a.text}</span>
                  </div>
                ))}
              </div>

              <button
                style={S.disconnectBtn}
                onClick={disconnect}
                disabled={loading}
              >
                {loading ? "Disconnecting..." : "🔌 Disconnect Telegram"}
              </button>

              {msg === "disconnected" && <p style={S.infoMsg}>Telegram disconnected.</p>}
            </div>
          ) : (
            <div>
              {/* Not connected state */}
              <div style={S.notConnectedBox}>
                <span style={{ fontSize: 40 }}>✈️</span>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginTop: 8 }}>
                  Connect Telegram for instant alerts
                </p>
                <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4, lineHeight: 1.6 }}>
                  Click the button below. Telegram opens, you tap Confirm once — done. No bot searching, no commands needed.
                </p>
              </div>

              {/* Telegram Login Widget renders here */}
              <div style={S.widgetWrap}>
                {loading
                  ? <p style={{ color: "#6b7280", fontSize: 13 }}>Connecting...</p>
                  : <div ref={widgetRef} />
                }
              </div>

              {msg && msg !== "success" && (
                <div style={S.errorBox}>❌ {msg}</div>
              )}

              <div style={S.howItWorks}>
                <p style={{ fontWeight: 700, fontSize: 12, color: "#374151", marginBottom: 8 }}>How it works:</p>
                {["Click the Telegram button above", "Telegram opens and shows a confirmation", "Tap Confirm — your account is linked instantly", "Start receiving real-time alerts on your phone"].map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={S.stepNum}>{i + 1}</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {msg === "success" && (
            <div style={S.successBox}>
              🎉 Telegram connected! You'll now receive real-time alerts.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const S = {
  banner:      { borderRadius: 16, padding: "28px 32px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20 },
  bannerAvatar:{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 28, flexShrink: 0 },
  bannerName:  { color: "#fff", fontSize: 24, fontWeight: 800 },
  bannerRole:  { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 4 },
  grid2:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  card:        { background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.07)" },
  cardTitle:   { fontWeight: 800, fontSize: 16, color: "#111827", marginBottom: 20 },
  infoRow:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f9fafb" },
  infoLabel:   { fontSize: 13, color: "#6b7280", fontWeight: 500 },
  infoValue:   { fontSize: 13, color: "#111827", fontWeight: 600 },
  connectedBox:{ display: "flex", gap: 14, alignItems: "flex-start", background: "#ecfdf5", border: "2px solid #6ee7b7", borderRadius: 12, padding: 16, marginBottom: 16 },
  connectedIcon:{ fontSize: 28, flexShrink: 0 },
  alertList:   { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 },
  alertItem:   { display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f9fafb" },
  disconnectBtn:{ width: "100%", padding: "10px", background: "#fef2f2", color: "#dc2626", border: "2px solid #fecaca", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13 },
  notConnectedBox:{ textAlign: "center", padding: "20px 0 16px", borderBottom: "1px solid #f3f4f6", marginBottom: 20 },
  widgetWrap:  { display: "flex", justifyContent: "center", padding: "16px 0", minHeight: 56 },
  howItWorks:  { background: "#f9fafb", borderRadius: 10, padding: 14, marginTop: 16 },
  stepNum:     { width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#0088cc,#229ed9)", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  successBox:  { background: "#ecfdf5", border: "1px solid #6ee7b7", color: "#065f46", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginTop: 16 },
  errorBox:    { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",  padding: "10px 14px", borderRadius: 10, fontSize: 13, marginTop: 8 },
  infoMsg:     { fontSize: 12, color: "#9ca3af", marginTop: 8, textAlign: "center" },
};
