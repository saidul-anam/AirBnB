/**
 * Host data utilities - generates consistent random values per host
 * using a simple string hash so values are stable across renders.
 */

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function uniqueCaseInsensitive(values) {
  return values.filter((value, index, list) => {
    return (
      list.findIndex((candidate) => {
        return candidate.toLowerCase() === value.toLowerCase();
      }) === index
    );
  });
}

function pushAmenity(target, value) {
  if (typeof value !== "string") {
    return;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }

  target.push(trimmed);
}

const BOOLEAN_AMENITY_MAP = [
  ["hasWiFi", "WiFi"],
  ["hasKitchen", "Kitchen"],
  ["hasParking", "Parking"],
  ["hasPool", "Pool"],
  ["hasGym", "Gym"],
  ["hasHeating", "Heating"],
  ["hasAirConditioning", "Air Conditioning"],
  ["hasWasher", "Washer"],
  ["hasDryer", "Dryer"],
  ["hasTV", "TV"],
  ["hasWorkspace", "Workspace"],
  ["hasElevator", "Elevator"],
];

export const TOP_OFFERING_FILTERS = [
  { key: "wifi", label: "WiFi", amenity: "WiFi" },
  {
    key: "air-conditioning",
    label: "Air conditioning",
    amenity: "Air Conditioning",
  },
  { key: "kitchen", label: "Kitchen", amenity: "Kitchen" },
  { key: "parking", label: "Parking", amenity: "Parking" },
  { key: "pool", label: "Pool", amenity: "Pool" },
];

function collectBooleanAmenityOverrides(property) {
  const enabled = new Set();
  const disabled = new Set();

  BOOLEAN_AMENITY_MAP.forEach(([flag, amenity]) => {
    if (property?.[flag] === true) {
      enabled.add(amenity.toLowerCase());
    }
    if (property?.[flag] === false) {
      disabled.add(amenity.toLowerCase());
    }
  });

  return { enabled, disabled };
}

export function getPrimaryHostedProperty(host) {
  return Array.isArray(host?.hostedProperties) &&
    host.hostedProperties.length > 0
    ? host.hostedProperties[0]
    : null;
}

export function getHostAmenities(host) {
  const amenities = [];
  const hostedProperties = Array.isArray(host?.hostedProperties)
    ? host.hostedProperties
    : [];
  const propertyAmenities = [];

  hostedProperties.forEach((property) => {
    const { enabled, disabled } = collectBooleanAmenityOverrides(property);

    (property?.amenities || []).forEach((amenity) => {
      const normalizedAmenity =
        typeof amenity === "string" ? amenity.trim().toLowerCase() : "";

      if (!normalizedAmenity || disabled.has(normalizedAmenity)) {
        return;
      }

      pushAmenity(propertyAmenities, amenity);
    });

    enabled.forEach((amenity) => {
      const displayAmenity = BOOLEAN_AMENITY_MAP.find(
        ([, label]) => label.toLowerCase() === amenity,
      )?.[1];
      pushAmenity(propertyAmenities, displayAmenity);
    });
  });

  if (propertyAmenities.length > 0) {
    return uniqueCaseInsensitive(propertyAmenities);
  }

  (host?.offeringHighlights || []).forEach((highlight) => {
    pushAmenity(amenities, highlight);
  });

  return uniqueCaseInsensitive(amenities);
}

export function getHostLocationParts(host) {
  const parts = [host?.area, host?.district, host?.city, host?.country]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return uniqueCaseInsensitive(parts);
}

export function getHostCoordinates(host) {
  const latitude = Number(host?.latitude);
  const longitude = Number(host?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return [latitude, longitude];
}

export function allowsPayLater(host) {
  if (typeof host?.payLaterAllowed === "boolean") {
    return host.payLaterAllowed;
  }

  return (host?.hostedProperties || []).some(
    (property) => property?.payLaterAllowed === true,
  );
}

/** Returns a consistent random float between min and max for a given host + seed */
export function seededRandom(hostId, seed = "default", min = 0, max = 1) {
  const h = hashCode(`${hostId}-${seed}`);
  const norm = (h % 10000) / 10000; // 0..0.9999
  return min + norm * (max - min);
}

/** Per-night rate: $5-$60, consistent per host */
export function getNightlyRate(host) {
  if (host?.nightlyRateUsd != null && host.nightlyRateUsd > 0) {
    return Math.round(host.nightlyRateUsd);
  }
  return Math.round(
    seededRandom(host?.userId || host?.id || "x", "price", 5, 60),
  );
}

/** Tax percentage: 0.01% - 5%, consistent per host */
export function getTaxPercent(host) {
  return parseFloat(
    seededRandom(host?.userId || host?.id || "x", "tax", 0.01, 5).toFixed(2),
  );
}

/** Total with tax */
export function getPriceWithTax(nightlyRate, nights, taxPercent) {
  const subtotal = nightlyRate * nights;
  const tax = subtotal * (taxPercent / 100);
  return Math.round(subtotal + tax);
}

/** Check if host has a specific amenity */
export function hasAmenity(host, amenity) {
  const q = amenity.toLowerCase();
  const aliases =
    q === "wifi" ? ["wifi", "wi-fi"] : q === "kitchen" ? ["kitchen"] : [q];

  return getHostAmenities(host).some((item) => {
    const normalizedItem = item.toLowerCase();
    return aliases.some((alias) => normalizedItem.includes(alias));
  });
}

/** Check if host is "Guest favorite" (superhost or high rating) */
export function isGuestFavorite(host) {
  return host?.superhost || (host?.averageRating && host.averageRating >= 4.7);
}
