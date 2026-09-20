import { useState, useEffect, useCallback } from "react";

// Global event bus for triggering toasts from anywhere
const listeners = new Set();
export function showWhatsAppNotif(message, sender = "FoodShare", type = "info") {
  listeners.forEach(fn => fn({ message, sender, type, id: Date.now() }));
}

export default function WhatsAppNotifContainer() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((notif) => {
    setToasts(prev => [...prev.slice(-2), notif]); // max 3 at once
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== notif.id)), 5000);
  }, []);

  useEffect(() => {
    listeners.add(add);
    return () => listeners.delete(add);
  }, [add]);

  if (toasts.length === 0) return null;

  return (
    <div style={S.container}>
      {toasts.map(t => <WhatsAppToast key={t.id} {...t} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />)}
    </div>
  );
}

function WhatsAppToast({ message, sender, type, onClose }) {
  const colors = { info: "#25D366", warning: "#f59e0b", error: "#ef4444", success: "#10b981" };
  const color  = colors[type] || colors.info;

  return (
    <div style={S.toast}>
      {/* WhatsApp green header */}
      <div style={{ ...S.toastHeader, background: color }}>
        <div style={S.waIcon}>
          <span style={{ fontSize: 14 }}>💬</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={S.waApp}>FoodShare</p>
          <p style={S.waSender}>{sender}</p>
        </div>
        <button style={S.closeBtn} onClick={onClose}>✕</button>
      </div>
      <div style={S.toastBody}>
        <p style={S.toastMsg}>{message}</p>
        <p style={S.toastTime}>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    </div>
  );
}

const S = {
  container: { position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 },
  toast:     { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", animation: "fadeInUp 0.3s ease", minWidth: 280 },
  toastHeader: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" },
  waIcon:    { width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" },
  waApp:     { color: "#fff", fontWeight: 800, fontSize: 12, lineHeight: 1 },
  waSender:  { color: "rgba(255,255,255,0.8)", fontSize: 10, marginTop: 1 },
  closeBtn:  { background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", width: 22, height: 22, borderRadius: "50%", cursor: "pointer", fontSize: 10, fontWeight: 700 },
  toastBody: { padding: "10px 14px 12px" },
  toastMsg:  { fontSize: 13, color: "#111827", lineHeight: 1.5 },
  toastTime: { fontSize: 10, color: "#9ca3af", marginTop: 4, textAlign: "right" },
};
