import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { getHostCoordinates, getNightlyRate } from "../utils/hostUtils";
import "leaflet/dist/leaflet.css";
import "./SearchResultsMap.css";

/* Fix Leaflet default icon path issue with webpack/CRA */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Component to auto-fit bounds
const RecenterMap = ({ locations }) => {
  const map = useMap();
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map((l) => [l.latitude, l.longitude]),
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [locations, map]);
  return null;
};

const SearchResultsMap = ({ hosts }) => {
  const navigate = useNavigate();

  // Filter hosts with valid coordinates
  const validHosts = (hosts || [])
    .map((host) => {
      const coordinates = getHostCoordinates(host);
      return coordinates ? { ...host, coordinates } : null;
    })
    .filter(Boolean);

  if (validHosts.length === 0) {
    return (
      <div className="map-empty">
        <div className="map-empty__icon">🗺️</div>
        <p>No locations to show on map</p>
      </div>
    );
  }

  const createIcon = (price) => {
    return L.divIcon({
      className: "custom-marker",
      html: `<div class="price-marker">$${price}</div>`,
      iconSize: [60, 28],
      iconAnchor: [30, 14],
    });
  };

  // Center on first valid host
  const defaultCenter = validHosts[0].coordinates;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      style={{ height: "100%", width: "100%", minHeight: "400px" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <RecenterMap locations={validHosts} />
      {validHosts.map((host) => (
        <Marker
          key={host.userId}
          position={host.coordinates}
          icon={createIcon(getNightlyRate(host))}
          eventHandlers={{
            click: () => navigate(`/rooms/${host.userId}`),
          }}
        />
      ))}
    </MapContainer>
  );
};

export default SearchResultsMap;
