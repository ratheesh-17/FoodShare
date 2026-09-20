import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useTranslation } from "react-i18next";
import api from "../api";

const NAV = {
  donor: [
    { to: "/donor",         icon: "📦", label: "Post Donation",  badge: null },
    { to: "/donor/map",     icon: "🗺️", label: "My Map",         badge: null },
    { to: "/donor/history", icon: "📋", label: "History",        badge: null },
    { to: "/leaderboard",   icon: "🏆", label: "Leaderboard",    badge: null },
    { to: "/telegram",      icon: "✈️", label: "Telegram Bot",   badge: null },
    { to: "/profile",       icon: "👤", label: "Profile",        badge: null },
  ],
  ngo: [
    { to: "/ngo",           icon: "🏠", label: "Nearby Food",    badge: "live" },
    { to: "/ngo/claimed",   icon: "✅", label: "Claimed",        badge: null },
    { to: "/ngo/ai",        icon: "🧠", label: "Smart Engine",   badge: "ai" },
    { to: "/ngo/route",     icon: "🗺️", label: "Route Planner",  badge: null },
    { to: "/ngo/map",       icon: "🔥", label: "Live Map",       badge: null },
    { to: "/leaderboard",   icon: "🏆", label: "Leaderboard",    badge: null },
    { to: "/telegram",      icon: "✈️", label: "Telegram Bot",   badge: null },
    { to: "/profile",       icon: "👤", label: "Profile",        badge: null },
  ],
  volunteer: [
    { to: "/volunteer",     icon: "🚴", label: "My Tasks",       badge: null },
    { to: "/volunteer/map", icon: "🗺️", label: "Route Map",      badge: null },
    { to: "/leaderboard",   icon: "🏆", label: "Leaderboard",    badge: null },
    { to: "/telegram",      icon: "✈️", label: "Telegram Bot",   badge: null },
    { to: "/profile",       icon: "👤", label: "Profile",        badge: null },
  ],
  admin: [
    { to: "/dashboard",          icon: "📊", label: "Overview",    badge: "live" },
    { to: "/dashboard/users",    icon: "👥", label: "Users",       badge: null },
    { to: "/dashboard/food",     icon: "🍽️", label: "Donations",   badge: null },
    { to: "/dashboard/map",      icon: "🔥", label: "Heatmap",     badge: null },
    { to: "/leaderboard",        icon: "🏆", label: "Leaderboard", badge: null },
    { to: "/telegram",           icon: "✈️", label: "Telegram Bot", badge: null },
    { to: "/profile",            icon: "👤", label: "Profile",     badge: null },
  ],
};

const ROLE_META = {
  donor:     { label: "Food Donor",  color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA", avatar: "#FFF7ED" },
  ngo:       { label: "NGO",         color: "#059669", bg: "#ECFDF5", border: "#6EE7B7", avatar: "#ECFDF5" },
  volunteer: { label: "Volunteer",   color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", avatar: "#EFF6FF" },
  admin:     { label: "Admin",       color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", avatar: "#F5F3FF" },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { t, i18n } = useTranslation();
  const role      = user?.role || "donor";
  const links     = NAV[role] || [];
  const rm        = ROLE_META[role];

  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif]         = useState(false);
  const notifRef = useRef(null);

  const toggleLang = () => i18n.changeLanguage(i18n.language === "en" ? "ta" : "en");

  useEffect(() => {
    if (!user) return;  // don't poll when logged out
    const load = () => {
      if (!localStorage.getItem('token')) return;
      api.get("/volunteers/notifications").then(r => setNotifications(r.data)).catch(() => {});
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    const h = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <aside style={S.sidebar}>
      {/* ── Brand ── */}
      <div style={S.brand}>
        <div style={S.brandIcon}>
          <span style={{ fontSize: 20 }}>🌾</span>
        </div>
        <div>
          <p style={S.brandName}>FoodShare</p>
          <p style={S.brandSub}>Redistribution Platform</p>
        </div>
      </div>

      {/* ── User card ── */}
      <div style={{ ...S.userCard, borderColor: rm.border }}>
        <div style={{ ...S.avatar, background: rm.bg, color: rm.color, border: `1.5px solid ${rm.border}` }}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={S.userName}>{user?.name}</p>
          <p style={S.userEmail} title={user?.email}>{user?.email}</p>
        </div>
        <span style={{ ...S.rolePill, background: rm.bg, color: rm.color, border: `1px solid ${rm.border}` }}>
          {rm.label}
        </span>
      </div>

      {/* ── Nav ── */}
      <div style={S.navSection}>
        <p style={S.navLabel}>{i18n.language === "en" ? "Navigation" : "இயக்கம்"}</p>
        <nav style={S.nav}>
          {links.map((l) => {
            const isActive = location.pathname === l.to ||
              (l.to.split("/").length > 2 && location.pathname.startsWith(l.to));
            return (
              <NavLink key={l.to} to={l.to} end style={{ textDecoration: "none" }}>
                {({ isActive: ia }) => (
                  <div style={{ ...S.link, ...(ia ? { background: "#ECFDF5", borderColor: "#6EE7B7" } : {}) }}>
                    <span style={{ ...S.linkIconBox, background: ia ? "#D1FAE5" : "#F9FAFB" }}>
                      {l.icon}
                    </span>
                    <span style={{ ...S.linkLabel, color: ia ? "#065E3B" : "#374151", fontWeight: ia ? 600 : 400 }}>
                      {t(l.label)}
                    </span>
                    {l.badge === "live" && (
                      <span style={S.liveBadge}>
                        <span style={S.liveDot} />LIVE
                      </span>
                    )}
                    {l.badge === "ai" && (
                      <span style={S.aiBadge}>AI</span>
                    )}
                    {ia && <div style={S.activeIndicator} />}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div style={{ flex: 1 }} />

      {/* ── Bottom section ── */}
      <div style={S.bottomSection}>
        <div style={S.divider} />

        {/* Language toggle */}
        <button style={S.bottomBtn} onClick={toggleLang}>
          <span style={{ ...S.linkIconBox, background: "#F0FDF9" }}>🌐</span>
          <span style={{ ...S.linkLabel, color: "#374151" }}>
            {i18n.language === "en" ? "தமிழ்" : "English"}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#ECFDF5", border: "1px solid #D1FAE5", padding: "1px 6px", borderRadius: 99 }}>
            {i18n.language === "en" ? "EN" : "TA"}
          </span>
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button style={S.bottomBtn} onClick={() => { setShowNotif(v => !v); setNotifications(n => n.map(x => ({ ...x, is_read: true }))); }}>
            <span style={{ ...S.linkIconBox, background: unread > 0 ? "#FFFBEB" : "#F9FAFB" }}>🔔</span>
            <span style={{ ...S.linkLabel, color: "#374151" }}>{t("Notifications")}</span>
            {unread > 0 && <span style={S.notifBadge}>{unread > 9 ? "9+" : unread}</span>}
          </button>

          {showNotif && (
            <div style={S.notifPanel}>
              <div style={S.notifHead}>
                <p style={{ fontWeight: 700, fontSize: 13, color: "#064E3B" }}>Notifications</p>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{notifications.length} total</span>
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {notifications.length === 0
                  ? <p style={{ padding: "20px 16px", color: "#9CA3AF", fontSize: 12, textAlign: "center" }}>All caught up ✓</p>
                  : notifications.slice(0, 20).map(n => (
                    <div key={n.id} style={{ ...S.notifItem, background: n.is_read ? "#fff" : "#F0FDF9" }}>
                      <div style={{ ...S.notifDot, background: n.is_read ? "#D1FAE5" : "#059669" }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{n.message}</p>
                        <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3 }}>{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button style={{ ...S.bottomBtn, marginTop: 2 }} onClick={() => { logout(); navigate("/"); }}>
          <span style={{ ...S.linkIconBox, background: "#FEF2F2" }}>🚪</span>
          <span style={{ ...S.linkLabel, color: "#DC2626" }}>{t("Sign Out")}</span>
        </button>
      </div>
    </aside>
  );
}

const S = {
  sidebar: {
    width: 248, minHeight: "100vh", display: "flex", flexDirection: "column",
    background: "#FFFFFF", borderRight: "1.5px solid #D1FAE5",
    padding: "18px 12px", position: "fixed", left: 0, top: 0, bottom: 0,
    zIndex: 100, boxShadow: "2px 0 12px rgba(5,150,105,0.06)",
  },
  brand:     { display: "flex", alignItems: "center", gap: 10, padding: "4px 6px 16px", borderBottom: "1px solid #D1FAE5", marginBottom: 14 },
  brandIcon: { width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#059669,#047857)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(5,150,105,0.3)" },
  brandName: { fontWeight: 800, fontSize: 15, color: "#064E3B", letterSpacing: "-0.3px" },
  brandSub:  { fontSize: 10, color: "#9CA3AF", marginTop: 1 },
  userCard:  { display: "flex", alignItems: "center", gap: 9, background: "#F0FDF9", borderRadius: 10, border: "1.5px solid", padding: "10px 10px", marginBottom: 18 },
  avatar:    { width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 },
  userName:  { fontWeight: 600, fontSize: 12.5, color: "#064E3B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userEmail: { fontSize: 10.5, color: "#9CA3AF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 },
  rolePill:  { fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 99, flexShrink: 0, letterSpacing: 0.3 },
  navSection:{ flex: 1 },
  navLabel:  { fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1.2, padding: "0 6px 8px" },
  nav:       { display: "flex", flexDirection: "column", gap: 2 },
  link:      { display: "flex", alignItems: "center", gap: 9, padding: "8px 8px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s", border: "1px solid transparent", position: "relative" },
  linkIconBox:{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, transition: "all 0.15s" },
  linkLabel: { fontSize: 13, flex: 1, transition: "all 0.15s" },
  activeIndicator: { width: 3, height: 14, borderRadius: 99, background: "#059669", flexShrink: 0 },
  liveBadge: { display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 700, color: "#059669", background: "#ECFDF5", border: "1px solid #6EE7B7", padding: "1px 5px", borderRadius: 99, letterSpacing: 0.5 },
  liveDot:   { width: 5, height: 5, borderRadius: "50%", background: "#059669", animation: "pulse 1.5s infinite" },
  aiBadge:   { fontSize: 9, fontWeight: 800, color: "#7C3AED", background: "#F5F3FF", border: "1px solid #DDD6FE", padding: "1px 5px", borderRadius: 99 },
  bottomSection: { paddingTop: 4 },
  divider:   { height: 1, background: "#D1FAE5", marginBottom: 8 },
  bottomBtn: { display: "flex", alignItems: "center", gap: 9, width: "100%", background: "transparent", border: "none", borderRadius: 8, padding: "8px 8px", cursor: "pointer", transition: "all 0.15s" },
  notifBadge:{ background: "#DC2626", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 6px", minWidth: 18, textAlign: "center" },
  notifPanel:{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, width: 310, background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 14, boxShadow: "0 12px 32px rgba(5,150,105,0.12)", zIndex: 200, overflow: "hidden", animation: "slideDown .2s ease" },
  notifHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #D1FAE5", background: "#F0FDF9" },
  notifItem: { display: "flex", gap: 10, padding: "11px 16px", borderBottom: "1px solid #F0FDF9", alignItems: "flex-start" },
  notifDot:  { width: 7, height: 7, borderRadius: "50%", marginTop: 4, flexShrink: 0 },
};
