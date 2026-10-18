import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [12.9716, 77.5946];
const API_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const stationIcon = L.divIcon({
  className: "ev-charger-marker",
  html: '<span style="display:grid;place-items:center;width:32px;height:32px;border:2px solid #b7ff65;border-radius:50%;background:#142016;color:#b7ff65;font-size:18px;box-shadow:0 0 14px #b7ff6560">⚡</span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}

function distanceKm(from, to) {
  const rad = (v) => (v * Math.PI) / 180;
  const dLat = rad(to[0] - from[0]);
  const dLon = rad(to[1] - from[1]);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from[0])) * Math.cos(rad(to[0])) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, Math.max(map.getZoom(), 12), { duration: 0.6 }); }, [center, map]);
  return null;
}

export default function ChargingMap() {
  const [stations, setStations] = useState([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [radius, setRadius] = useState(10000);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const visibleStations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return stations;
    return stations.filter((s) => `${s.name} ${s.address} ${s.operator} ${s.connectors}`.toLowerCase().includes(term));
  }, [stations, search]);

  async function loadStations(lat, lon, searchRadius = radius) {
    setLoading(true);
    setMessage("");
    const query = `[out:json][timeout:25];(node["amenity"="charging_station"](around:${searchRadius},${lat},${lon});way["amenity"="charging_station"](around:${searchRadius},${lat},${lon});relation["amenity"="charging_station"](around:${searchRadius},${lat},${lon}););out center tags;`;
    let lastError = "Could not load station data. Check your internet connection and try again.";
    for (const url of API_URLS) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (!response.ok) throw new Error(`Station service returned HTTP ${response.status}.`);
        const data = await response.json();
        const result = (data.elements || []).map((item) => {
          const tags = item.tags || {};
          const latValue = item.lat ?? item.center?.lat;
          const lonValue = item.lon ?? item.center?.lon;
          if (typeof latValue !== "number" || typeof lonValue !== "number") return null;
          const connectors = [
            ["socket:type2", "Type 2"], ["socket:type2_combo", "CCS Combo"],
            ["socket:chademo", "CHAdeMO"], ["socket:ccs", "CCS"],
          ].filter(([key]) => tags[key] && tags[key] !== "no").map(([key, name]) => `${name}${tags[key] === "yes" ? "" : ` (${tags[key]})`}`);
          const address = [tags["addr:street"], tags["addr:suburb"] || tags["addr:neighbourhood"], tags["addr:city"]].filter(Boolean).join(", ");
          return {
            id: `${item.type}-${item.id}`,
            name: tags.name || tags.operator || "EV charging station",
            operator: tags.operator || "Not listed",
            address: address || tags["addr:full"] || "Address not listed",
            lat: latValue,
            lon: lonValue,
            connectors: connectors.join(", ") || "Connector details not listed",
            power: tags["charging_station:output"] || tags["socket:output"] || "Not listed",
            website: tags.website || tags["contact:website"] || "",
          };
        }).filter(Boolean).filter((s, i, all) => all.findIndex((other) => other.id === s.id) === i)
          .sort((a, b) => distanceKm([lat, lon], [a.lat, a.lon]) - distanceKm([lat, lon], [b.lat, b.lon]));
        setStations(result);
        setCenter([lat, lon]);
        setMapCenter([lat, lon]);
        if (!result.length) setMessage("No mapped charging stations found in this area. Try a larger radius or move the map.");
        setLoading(false);
        return;
      } catch (error) {
        lastError = error?.message || lastError;
      }
    }
    setLoading(false);
    setMessage(lastError.includes("Failed to fetch") ? "Could not reach OpenStreetMap station data. Check your internet connection and try again." : lastError);
  }

  useEffect(() => { loadStations(DEFAULT_CENTER[0], DEFAULT_CENTER[1], radius); /* initial load */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locateMe() {
    if (!navigator.geolocation) {
      setMessage("This browser does not support location access.");
      return;
    }
    setMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => loadStations(position.coords.latitude, position.coords.longitude, radius),
      (error) => setMessage(error.code === 1 ? "Location permission denied. Allow location access in browser settings." : "Could not get your location. Try again or search around Bengaluru."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  return (
    <section className="ev-charging-map" style={{ width: "100%", minWidth: 0, color: "#f1f5ef" }}>
      <div className="ev-map-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div><p className="eyebrow">CHARGING NETWORK</p><h1 style={{ margin: 0 }}>Charging Station Map</h1><p style={{ color: "#a4aea1", fontSize: 13 }}>Mapped EV charging locations from OpenStreetMap.</p></div>
        <span className="badge">OPENSTREETMAP DATA</span>
      </div>
      <div className="ev-map-controls" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <input aria-label="Filter stations" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by station, area, connector…" style={{ flex: "1 1 220px", minWidth: 0, padding: 12, border: "1px solid #29342a", borderRadius: 8, background: "#121713", color: "white" }} />
        <select aria-label="Search radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ padding: 12, border: "1px solid #29342a", borderRadius: 8, background: "#121713", color: "white" }}><option value={5000}>5 km radius</option><option value={10000}>10 km radius</option><option value={20000}>20 km radius</option><option value={40000}>40 km radius</option></select>
        <button className="primary-button" type="button" disabled={loading} onClick={() => loadStations(mapCenter[0], mapCenter[1], radius)}>{loading ? "Loading…" : "Search this area"}</button>
        <button className="outline-button" type="button" onClick={locateMe}>◎ Use my location</button>
      </div>
      <p role="status" aria-live="polite" style={{ minHeight: 20, color: message ? "#ffc18c" : "#b7ff65", fontSize: 12 }}>{loading ? "Loading station records…" : `${visibleStations.length} mapped station${visibleStations.length === 1 ? "" : "s"} shown`}{message ? ` · ${message}` : ""}</p>
      <div className="ev-map-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.55fr) minmax(240px, .8fr)", gap: 14, minWidth: 0 }}>
        <div style={{ height: "min(62vh, 600px)", minHeight: 360, minWidth: 0, overflow: "hidden", border: "1px solid #29342a", borderRadius: 12 }}>
          <MapContainer center={DEFAULT_CENTER} zoom={12} scrollWheelZoom style={{ width: "100%", height: "100%", minHeight: 360, background: "#121713" }}>
            <ResizeMap /><FlyTo center={center} />
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {visibleStations.map((station) => <Marker key={station.id} position={[station.lat, station.lon]} icon={stationIcon}><Popup><strong>{station.name}</strong><p>{station.address}</p><p>Operator: {station.operator}</p><p>Connectors: {station.connectors}</p><p>Power: {station.power}</p><p>Live availability and pricing are not provided by this map data.</p>{station.website && <a href={station.website} target="_blank" rel="noreferrer">Operator website ↗</a>}</Popup></Marker>)}
          </MapContainer>
        </div>
        <aside style={{ minWidth: 0, maxHeight: "min(62vh, 600px)", minHeight: 360, overflow: "auto", border: "1px solid #29342a", borderRadius: 12, background: "#121713" }}>
          <div style={{ padding: 16, borderBottom: "1px solid #29342a" }}><p className="eyebrow">NEARBY RESULTS</p><h2 style={{ margin: 0 }}>Stations ({visibleStations.length})</h2></div>
          {!visibleStations.length && !loading ? <p style={{ padding: 16, color: "#929d91", fontSize: 12 }}>No station records to show. Try another radius or location.</p> : visibleStations.slice(0, 40).map((station) => <button key={station.id} type="button" onClick={() => { setCenter([station.lat, station.lon]); setMapCenter([station.lat, station.lon]); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: 12, border: 0, borderBottom: "1px solid #263027", background: "transparent", color: "#f1f5ef", textAlign: "left", cursor: "pointer" }}><span style={{ color: "#b7ff65" }}>⚡</span><span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}><strong style={{ fontSize: 12, overflowWrap: "anywhere" }}>{station.name}</strong><small style={{ color: "#929d91", fontSize: 10 }}>{station.address}</small><small style={{ color: "#929d91", fontSize: 10 }}>{station.connectors}</small></span><small style={{ color: "#b7ff65", flexShrink: 0 }}>{distanceKm(center, [station.lat, station.lon]).toFixed(1)} km</small></button>)}
          <p style={{ margin: 0, padding: 12, borderTop: "1px solid #29342a", color: "#929d91", fontSize: 10, lineHeight: 1.6 }}>OpenStreetMap records may be incomplete. Live plug availability, occupancy, and current prices require separate operator data.</p>
        </aside>
      </div>
      <style>{`@media(max-width:900px){.ev-map-layout{grid-template-columns:minmax(0,1fr)!important}.ev-map-layout>div{height:420px!important}.ev-map-layout>aside{max-height:350px!important;min-height:180px!important}}@media(max-width:560px){.ev-map-layout>div{height:320px!important;min-height:320px!important}.ev-map-controls button{flex:1 1 100%}}`}</style>
    </section>
  );
}
