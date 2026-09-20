import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import axios from "axios";

// Fix default marker icons broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// ── Default center: Nagercoil / Kanyakumari district ─────────────────────────
const DISTRICT_CENTER = [8.1833, 77.4119];
const DISTRICT_ZOOM   = 12;

// ── Kanyakumari district approximate boundary polygon ────────────────────────
// Simplified boundary covering Nagercoil, Kanyakumari, Marthandam, Colachel, Thuckalay
const DISTRICT_BOUNDARY = [
  [8.4200, 77.1500],  // NW — Kalkulam area
  [8.4500, 77.3000],  // N  — Vilavancode
  [8.3800, 77.4500],  // NE — Agastheeswaram
  [8.2500, 77.5600],  // E  — Rajakkamangalam
  [8.1500, 77.5700],  // SE — near Kanyakumari coast
  [8.0700, 77.5500],  // S  — Kanyakumari tip
  [8.0750, 77.4800],  // SW coast
  [8.1200, 77.3500],  // W  — Colachel area
  [8.2000, 77.2000],  // W  — Thuckalay
  [8.3200, 77.1600],  // NW — back up
  [8.4200, 77.1500],  // close
];

// ── Custom icons ──────────────────────────────────────────────────────────────
// Status-specific icons for donation markers
const STATUS_ICONS = {
  posted:    new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",  shadowUrl: require("leaflet/dist/images/marker-shadow.png"), iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34] }),
  claimed:   new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",   shadowUrl: require("leaflet/dist/images/marker-shadow.png"), iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34] }),
  assigned:  new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png", shadowUrl: require("leaflet/dist/images/marker-shadow.png"), iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34] }),
  completed: new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",   shadowUrl: require("leaflet/dist/images/marker-shadow.png"), iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34] }),
  expired:   new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",    shadowUrl: require("leaflet/dist/images/marker-shadow.png"), iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34] }),
};

const ngoIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

// ── Heatmap layer ─────────────────────────────────────────────────────────────
function HeatmapLayer({ points }) {
  const map = useMap();
  const heatRef = useRef(null);

  useEffect(() => {
    if (!points || points.length === 0) return;
    if (heatRef.current) map.removeLayer(heatRef.current);
    heatRef.current = L.heatLayer(points, {
      radius: 35, blur: 25, maxZoom: 13,
      gradient: { 0.2: "#3B82F6", 0.5: "#F59E0B", 0.8: "#EA580C", 1.0: "#DC2626" },
    }).addTo(map);
    return () => { if (heatRef.current) map.removeLayer(heatRef.current); };
  }, [points, map]);

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FoodMap({
  donations = [],
  ngos = [],
  heatPoints = [],
  route = null,
  showBoundary = true,
}) {
  const center = donations.length > 0
    ? [parseFloat(donations[0].lat), parseFloat(donations[0].lng)]
    : DISTRICT_CENTER;

  const zoom = donations.length > 0 ? 13 : DISTRICT_ZOOM;

  const FOOD_COLOR = { cooked: "#EA580C", raw: "#059669", packaged: "#2563EB", event: "#7C3AED" };
  const FOOD_ICON  = { cooked: "🍳", raw: "🥦", packaged: "📦", event: "🎊" };

  return (
    <div style={{ position: "relative" }}>
      {/* District info banner */}
      <div style={{
        position: "absolute", top: 10, left: 10, zIndex: 1000,
        background: "rgba(255,255,255,0.95)", border: "1px solid #D1FAE5",
        borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600,
        color: "#059669", boxShadow: "0 2px 8px rgba(5,150,105,0.15)",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span>📍</span>
        <span>Nagercoil & Kanyakumari District</span>
        {donations.length > 0 && (
          <span style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 99, padding: "1px 7px", marginLeft: 4 }}>
            {donations.length} donations
          </span>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "500px", width: "100%", borderRadius: "12px" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* District boundary */}
        {showBoundary && (
          <Polygon
            positions={DISTRICT_BOUNDARY}
            pathOptions={{
              color: "#059669",
              weight: 2,
              opacity: 0.7,
              fillColor: "#059669",
              fillOpacity: 0.04,
              dashArray: "6 4",
            }}
          />
        )}

        {/* Heatmap */}
        {heatPoints.length > 0 && <HeatmapLayer points={heatPoints} />}

        {/* Donation markers — color by status */}
        {donations.map((d) => {
          const icon = STATUS_ICONS[d.status] || STATUS_ICONS.posted;
          const statusColor = { posted: "#059669", claimed: "#2563EB", assigned: "#D97706", completed: "#6B7280", expired: "#DC2626" }[d.status] || "#059669";
          const statusBg    = { posted: "#ECFDF5", claimed: "#EFF6FF", assigned: "#FFFBEB", completed: "#F9FAFB", expired: "#FEF2F2" }[d.status] || "#ECFDF5";
          return (
            <Marker key={d.id} position={[parseFloat(d.lat), parseFloat(d.lng)]} icon={icon}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{FOOD_ICON[d.food_type] || "🍱"}</span>
                    <strong style={{ fontSize: 14, color: "#064E3B" }}>{d.food_name}</strong>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: FOOD_COLOR[d.food_type] + "18", color: FOOD_COLOR[d.food_type], border: `1px solid ${FOOD_COLOR[d.food_type]}33` }}>
                      {d.food_type}
                    </span>
                    <span style={{ fontSize: 10, color: "#6B7280" }}>⚖️ {d.quantity_kg} kg</span>
                    <span style={{ fontSize: 10, color: "#6B7280" }}>👥 {d.serves_people} people</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>📍 {d.address}</p>
                  <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>
                    ⏰ Expires: {new Date(d.expires_at).toLocaleString("en-IN")}
                  </p>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: statusBg, color: statusColor, border: `1px solid ${statusColor}33` }}>
                    ● {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* NGO markers */}
        {ngos.map((n, i) =>
          n.lat && n.lng ? (
            <Marker key={n.ngo_id || n.id || i} position={[parseFloat(n.lat || n.ngo_lat), parseFloat(n.lng || n.ngo_lng)]} icon={ngoIcon}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>🏢</span>
                    <strong style={{ fontSize: 13, color: "#064E3B" }}>{n.ngo_name || n.name}</strong>
                  </div>
                  {n.distance_km !== undefined && <p style={{ fontSize: 11, color: "#6B7280" }}>📍 {n.distance_km} km away</p>}
                  {n.match_score !== undefined && <p style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>🎯 Match Score: {n.match_score}</p>}
                  {n.demand_score !== undefined && <p style={{ fontSize: 11, color: "#6B7280" }}>📊 Demand: {n.demand_score}</p>}
                </div>
              </Popup>
            </Marker>
          ) : null
        )}

        {/* Route polyline */}
        {route && route.length > 0 && (
          <Polyline positions={route} color="#059669" weight={4} dashArray="8 4" />
        )}
      </MapContainer>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 14, padding: "10px 14px",
        background: "#F0FDF9", borderTop: "1px solid #D1FAE5",
        borderRadius: "0 0 12px 12px", flexWrap: "wrap",
      }}>
        <LegendItem color="#059669" label="Posted (waiting)"   icon="🟢" />
        <LegendItem color="#2563EB" label="Claimed by NGO"     icon="🔵" />
        <LegendItem color="#D97706" label="Volunteer assigned" icon="🟠" />
        <LegendItem color="#6B7280" label="Completed"          icon="⚫" />
        <LegendItem color="#DC2626" label="Expired"            icon="🔴" />
        {heatPoints.length > 0 && <LegendItem color="#DC2626" label="High Demand" icon="🌡️" />}
        <LegendItem color="#059669" label="KK District" icon="▭" dashed />
      </div>
    </div>
  );
}

function LegendItem({ color, label, icon, dashed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#374151" }}>
      <span style={{ fontSize: 10 }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export async function fetchRoute(fromLat, fromLng, toLat, toLng) {
  const key = process.env.REACT_APP_ORS_KEY;
  try {
    const res = await axios.get(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      { params: { api_key: key, start: `${fromLng},${fromLat}`, end: `${toLng},${toLat}` } }
    );
    const coords = res.data.features[0].geometry.coordinates;
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch {
    return [];
  }
}
