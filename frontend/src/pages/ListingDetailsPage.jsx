import React, { useEffect, useMemo, useState } from "react";
import {
  FaBuilding,
  FaCar,
  FaCity,
  FaCouch,
  FaDumbbell,
  FaFire,
  FaLeaf,
  FaMountain,
  FaSnowflake,
  FaSwimmingPool,
  FaTree,
  FaTv,
  FaUmbrellaBeach,
  FaWater,
  FaWifi,
  FaWind,
} from "react-icons/fa";
import {
  MdBalcony,
  MdElevator,
  MdOutlineKitchen,
  MdOutlineLocalLaundryService,
  MdOutlineWorkOutline,
} from "react-icons/md";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import ReviewsSection from "../components/ReviewsSection";
import { useAuth } from "../context/AuthContext";
import {
  allowsPayLater,
  getHostAmenities,
  getHostCoordinates,
  getHostLocationParts,
  getNightlyRate,
  getPrimaryHostedProperty,
} from "../utils/hostUtils";
import api from "../utils/axiosConfig";
import "./ListingDetailsPage.css";

const AMENITY_ICONS = {
  "Air Conditioning": FaSnowflake,
  Balcony: MdBalcony,
  "Beach Access": FaUmbrellaBeach,
  "City View": FaCity,
  Dryer: FaWind,
  Elevator: MdElevator,
  Garden: FaLeaf,
  Gym: FaDumbbell,
  Heating: FaFire,
  Kitchen: MdOutlineKitchen,
  "Mountain View": FaMountain,
  "Ocean View": FaWater,
  Parking: FaCar,
  Pool: FaSwimmingPool,
  Terrace: FaTree,
  "Smart TV": FaTv,
  TV: FaTv,
  Washer: MdOutlineLocalLaundryService,
  WiFi: FaWifi,
  Workspace: MdOutlineWorkOutline,
};

const getAmenityIcon = (amenity) => {
  if (AMENITY_ICONS[amenity]) {
    return AMENITY_ICONS[amenity];
  }

  if (/view/i.test(amenity)) {
    return FaCity;
  }
  if (/kitchen/i.test(amenity)) {
    return MdOutlineKitchen;
  }
  if (/wifi/i.test(amenity)) {
    return FaWifi;
  }
  if (/washer|laundry/i.test(amenity)) {
    return MdOutlineLocalLaundryService;
  }
  if (/tv/i.test(amenity)) {
    return FaTv;
  }
  if (/workspace/i.test(amenity)) {
    return MdOutlineWorkOutline;
  }
  if (/sofa|living/i.test(amenity)) {
    return FaCouch;
  }

  return FaBuilding;
};

const ListingDetailsPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [host, setHost] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [checkIn, setCheckIn] = useState(
    searchParams.get("checkin")
      ? new Date(searchParams.get("checkin")).toISOString().split("T")[0]
      : "",
  );
  const [checkOut, setCheckOut] = useState(
    searchParams.get("checkout")
      ? new Date(searchParams.get("checkout")).toISOString().split("T")[0]
      : "",
  );
  const [guests, setGuests] = useState(
    parseInt(searchParams.get("guests") || "1", 10),
  );
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const fetchHostAndReviews = async () => {
      try {
        const [hostRes, reviewsRes] = await Promise.allSettled([
          api.get(`/api/users/${userId}`),
          api.get(`/api/reviews/host/${userId}`),
        ]);

        if (hostRes.status === "fulfilled") {
          setHost(hostRes.value.data);
        }

        if (reviewsRes.status === "fulfilled") {
          setReviews(reviewsRes.value.data || []);
        }
      } catch (err) {
        console.error("Failed to load host", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHostAndReviews();
  }, [userId]);

  const handleReserve = () => {
    if (!checkIn || !checkOut) {
      alert("Please select check-in and check-out dates");
      return;
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = (end - start) / (1000 * 60 * 60 * 24);

    if (nights < 1) {
      alert("Check-out must be after check-in");
      return;
    }

    const params = new URLSearchParams({
      hostId: userId,
      checkin: checkIn,
      checkout: checkOut,
      guests: guests.toString(),
    });

    navigate(`/reservation?${params.toString()}`);
  };

  const primaryProperty = useMemo(() => getPrimaryHostedProperty(host), [host]);
  const nightlyRate = getNightlyRate(host);
  const amenities = useMemo(() => getHostAmenities(host), [host]);
  const locationParts = useMemo(() => getHostLocationParts(host), [host]);
  const coordinates = useMemo(() => getHostCoordinates(host), [host]);
  const payLaterAvailable = allowsPayLater(host);
  const propertyType =
    host?.propertyTypesOffered?.[0] ||
    primaryProperty?.propertyType ||
    "Entire place";
  const guestCapacity =
    host?.guestCapacity || primaryProperty?.guestCapacity || 2;
  const bedroomCount =
    primaryProperty?.bedroomCount || host?.bedroomCount || host?.bedCount || 1;
  const bedCount = host?.bedCount || primaryProperty?.bedCount || 1;
  const bathroomCount =
    primaryProperty?.bathroomCount || host?.bathroomCount || 1;
  const displayAmenities =
    amenities.length > 0 ? amenities : ["WiFi", "Kitchen", "Free parking"];
  const nights =
    checkIn && checkOut
      ? Math.max(
          1,
          (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24),
        )
      : 0;
  const totalPrice = nights * nightlyRate;
  const serviceFee = Math.round(totalPrice * 0.12);
  const galleryImages =
    host?.hostPortfolioImages?.length > 0
      ? host.hostPortfolioImages
      : host?.profileImage
        ? [host.profileImage]
        : [];
  const mainImage = galleryImages[selectedImage] || galleryImages[0] || "";

  if (loading) {
    return (
      <div className="listing-page">
        <div className="listing-container">
          <div className="listing-loading">
            <div
              className="skeleton-pulse"
              style={{
                width: "60%",
                height: 32,
                borderRadius: 8,
                marginBottom: 24,
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: "100%",
                height: 400,
                borderRadius: 12,
                marginBottom: 32,
              }}
            />
            <div style={{ display: "flex", gap: 60 }}>
              <div style={{ flex: 2 }}>
                <div
                  className="skeleton-pulse"
                  style={{
                    width: "50%",
                    height: 24,
                    borderRadius: 6,
                    marginBottom: 12,
                  }}
                />
                <div
                  className="skeleton-pulse"
                  style={{
                    width: "40%",
                    height: 16,
                    borderRadius: 6,
                    marginBottom: 24,
                  }}
                />
                <div
                  className="skeleton-pulse"
                  style={{ width: "100%", height: 80, borderRadius: 6 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  className="skeleton-pulse"
                  style={{ width: "100%", height: 300, borderRadius: 12 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!host) {
    return (
      <div className="listing-page">
        <div
          className="listing-container"
          style={{ textAlign: "center", paddingTop: 80 }}
        >
          <h2>Host not found</h2>
          <p style={{ color: "#717171" }}>
            This listing may have been removed or is unavailable.
          </p>
          <button
            className="reserve-btn"
            style={{ marginTop: 20, width: "auto", padding: "12px 32px" }}
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="listing-page">
      <div className="listing-container">
        <h1>{host.hostDisplayName || `${host.firstName}'s place`}</h1>

        <div className="listing-gallery">
          {mainImage ? (
            <img src={mainImage} alt="Main" className="main-img" />
          ) : (
            <div className="main-img" />
          )}
          <div className="sub-imgs">
            {galleryImages.slice(1, 5).map((img, i) => (
              <img
                key={img}
                src={img}
                alt={`Sub ${i + 1}`}
                onClick={() => setSelectedImage(i + 1)}
                style={{
                  cursor: "pointer",
                  opacity: selectedImage === i + 1 ? 0.7 : 1,
                }}
              />
            ))}
          </div>
        </div>

        <div className="listing-content">
          <div className="listing-info">
            <h2>
              {propertyType} hosted by {host.firstName}
            </h2>
            <p className="listing-specs">
              {guestCapacity} guests · {bedroomCount} bedroom · {bedCount} bed ·{" "}
              {bathroomCount} bath
            </p>

            {host.superhost && (
              <div className="listing-superhost">
                <span className="listing-superhost__icon">*</span>
                <div>
                  <strong>{host.firstName} is a Superhost</strong>
                  <p>Superhosts are experienced, highly rated hosts.</p>
                </div>
              </div>
            )}

            <hr className="listing-hr" />

            <div className="listing-about">
              <h3>About this place</h3>
              <p>
                {host.hostAbout ||
                  primaryProperty?.description ||
                  "A beautiful place to stay. Enjoy your visit!"}
              </p>
            </div>

            <hr className="listing-hr" />

            <div className="listing-amenities">
              <h3>What this place offers</h3>
              <ul className="amenities-grid">
                {displayAmenities.map((amenity) => (
                  <li key={amenity} className="amenity-item">
                    <span className="amenity-icon">
                      {React.createElement(getAmenityIcon(amenity), {
                        "aria-hidden": true,
                      })}
                    </span>
                    {amenity}
                  </li>
                ))}
              </ul>
            </div>

            {host.houseRules && (
              <>
                <hr className="listing-hr" />
                <div className="listing-rules">
                  <h3>House Rules</h3>
                  <p>{host.houseRules}</p>
                </div>
              </>
            )}

            {locationParts.length > 0 && (
              <>
                <hr className="listing-hr" />
                <div className="listing-location">
                  <h3>Where you'll be</h3>
                  <p>{locationParts.join(", ")}</p>
                  {coordinates ? (
                    <div
                      style={{
                        height: 300,
                        borderRadius: 12,
                        overflow: "hidden",
                        marginTop: 16,
                      }}
                    >
                      <MapContainer
                        center={coordinates}
                        zoom={14}
                        style={{ height: "100%", width: "100%" }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution="&copy; OpenStreetMap contributors"
                        />
                        <Marker position={coordinates}>
                          <Popup>
                            {host.hostDisplayName || host.firstName}'s place
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  ) : (
                    <p className="booking-card__note" style={{ marginTop: 16 }}>
                      Exact map coordinates are unavailable for this listing.
                    </p>
                  )}
                </div>
              </>
            )}

            {reviews.length > 0 && (
              <>
                <hr className="listing-hr" />
                <ReviewsSection
                  reviews={reviews}
                  averageRating={host.averageRating || 0}
                  reviewCount={host.reviewCount || reviews.length}
                  categoryScores={{
                    cleanliness: host.cleanlinessRating || 4.8,
                    accuracy: host.accuracyRating || 4.7,
                    checkIn: host.checkInRating || 4.9,
                    communication: host.communicationRating || 4.8,
                    location: host.locationRating || 4.6,
                    value: host.valueRating || 4.7,
                  }}
                />
              </>
            )}
          </div>

          <div className="booking-card">
            <h3 className="booking-card__price">
              ${Math.round(nightlyRate)}{" "}
              <span style={{ fontSize: "16px", fontWeight: "400" }}>night</span>
            </h3>

            {host.averageRating && (
              <div className="booking-card__rating">
                <span>* {host.averageRating.toFixed(2)}</span>
                <span className="booking-card__dot">·</span>
                <span>{host.reviewCount || 0} reviews</span>
              </div>
            )}

            <div className="date-inputs">
              <div className="input-group">
                <label>CHECK-IN</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>CHECKOUT</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>

            <div className="guests-input">
              <label>GUESTS</label>
              <select
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value, 10))}
                style={{
                  border: "none",
                  width: "100%",
                  outline: "none",
                  fontSize: 14,
                  background: "transparent",
                }}
              >
                {Array.from({ length: guestCapacity }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} guest{i > 0 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>

            <button className="reserve-btn" onClick={handleReserve}>
              Reserve
            </button>

            <div className="booking-card__pay-later-badge">
              {payLaterAvailable ? "Pay later available" : "Have to pay now"}
            </div>

            <p className="booking-card__note">
              {payLaterAvailable
                ? "You can pay later during checkout."
                : "This listing requires payment during checkout."}
            </p>

            {user?.role !== "HOST" && (
              <button
                className="message-host-btn"
                onClick={() => {
                  if (!isAuthenticated) {
                    toast.info("Please log in to message this host");
                    navigate("/login");
                    return;
                  }

                  if (user?.userId === userId) {
                    toast.info("You can't message yourself");
                    return;
                  }

                  navigate(`/inbox?with=${userId}`);
                }}
                style={{
                  width: "100%",
                  padding: "14px",
                  marginTop: "12px",
                  border: "1px solid #222",
                  borderRadius: "8px",
                  background: "transparent",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#222";
                  e.target.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.color = "#222";
                }}
              >
                Message Host
              </button>
            )}

            {nights > 0 && (
              <div className="booking-card__breakdown">
                <div className="breakdown-row">
                  <span>
                    ${Math.round(nightlyRate)} x {nights} night
                    {nights > 1 ? "s" : ""}
                  </span>
                  <span>${Math.round(totalPrice)}</span>
                </div>
                <div className="breakdown-row">
                  <span>Service fee</span>
                  <span>${serviceFee}</span>
                </div>
                <div className="breakdown-row breakdown-row--total">
                  <span>Total</span>
                  <span>${Math.round(totalPrice + serviceFee)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ListingDetailsPage;
