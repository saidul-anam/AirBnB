import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const defaultCenter = [23.8103, 90.4125];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const ClickHandler = ({ onSelect }) => {
  useMapEvents({
    click(event) {
      onSelect(event.latlng);
    },
  });

  return null;
};

const HostLocationMap = ({
  latitude,
  longitude,
  onLocationSelect,
  mapHeight = 360,
}) => {
  const [error, setError] = useState("");
  const selectedPosition = useMemo(() => {
    if (
      typeof latitude === "number" &&
      !Number.isNaN(latitude) &&
      typeof longitude === "number" &&
      !Number.isNaN(longitude)
    ) {
      return [latitude, longitude];
    }
    return null;
  }, [latitude, longitude]);

  useEffect(() => {
    setError("");
  }, [latitude, longitude]);

  const handleSelect = async ({ lat, lng }) => {
    setError("");
    let locationDetails = {
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
    };

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (response.ok) {
        const payload = await response.json();
        const address = payload.address || {};
        locationDetails = {
          ...locationDetails,
          street:
            [address.house_number, address.road]
              .filter(Boolean)
              .join(" ")
              .trim() || address.road || "",
          area:
            address.suburb ||
            address.neighbourhood ||
            address.quarter ||
            address.hamlet ||
            "",
          village: address.village || address.hamlet || "",
          district: address.county || address.state_district || "",
          division: address.state || address.region || "",
          city:
            address.city ||
            address.town ||
            address.municipality ||
            address.village ||
            "",
          country: address.country || "",
          zipCode: address.postcode || "",
          locationLabel: payload.display_name || "",
        };
      } else {
        setError("Map pin saved, but reverse geocoding could not fill address.");
      }
    } catch {
      setError("Map pin saved, but address auto-fill is unavailable right now.");
    }

    onLocationSelect(locationDetails);
  };

  return (
    <div className="host-map-card">
      <div className="host-map-card__header">
        <div>
          <h3>Pin host location</h3>
          <p>
            Click the map to place the host location. The pin helps power
            listing visibility and location-based search later.
          </p>
        </div>
        {selectedPosition && (
          <span className="badge badge-red">
            {selectedPosition[0].toFixed(4)}, {selectedPosition[1].toFixed(4)}
          </span>
        )}
      </div>

      <MapContainer
        center={selectedPosition || defaultCenter}
        zoom={selectedPosition ? 13 : 7}
        scrollWheelZoom
        className="host-map-card__map"
        style={{ height: mapHeight }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onSelect={handleSelect} />
        {selectedPosition && (
          <Marker position={selectedPosition}>
            <Popup>Selected host location</Popup>
          </Marker>
        )}
      </MapContainer>

      <p className="host-map-card__hint">
        {selectedPosition
          ? "The selected pin will be saved with the host profile."
          : "No location selected yet."}
      </p>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
};

export default HostLocationMap;
