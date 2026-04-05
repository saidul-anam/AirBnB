import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getBookingsByGuest,
  getBookingsByHost,
  cancelBooking,
} from "../services/bookingService";
import api from "../utils/axiosConfig";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import "./MyBookingsPage.css";

const STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "#856404", bg: "#ffeeba", icon: "⏳" },
  CONFIRMED: { label: "Confirmed", color: "#155724", bg: "#d4edda", icon: "✅" },
  CANCELLED: { label: "Cancelled", color: "#721c24", bg: "#f8d7da", icon: "❌" },
  CHECKED_IN: { label: "Checked In", color: "#004085", bg: "#cce5ff", icon: "🏨" },
  COMPLETED: { label: "Completed", color: "#0c5460", bg: "#d1ecf1", icon: "🎉" },
  REFUNDED: { label: "Refunded", color: "#383d41", bg: "#e2e3e5", icon: "💸" },
};

const PAYMENT_CONFIG = {
  PENDING: { label: "Payment Pending", color: "#856404", bg: "#ffeeba" },
  COMPLETED: { label: "Paid", color: "#155724", bg: "#d4edda" },
  PAY_LATER: { label: "Pay Later", color: "#0c5460", bg: "#d1ecf1" },
  FAILED: { label: "Payment Failed", color: "#721c24", bg: "#f8d7da" },
  REFUNDED: { label: "Payment Refunded", color: "#383d41", bg: "#e2e3e5" },
};

const MyBookingsPage = () => {
  const { user, isHost } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hostDetails, setHostDetails] = useState({});
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    if (!user) return;
    loadBookings();
    // eslint-disable-next-line
  }, [user]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      let data;
      if (isHost) {
        data = await getBookingsByHost(user.userId);
      } else {
        data = await getBookingsByGuest(user.userId);
      }
      // Sort by newest first
      data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setBookings(data);

      // Fetch host/guest names for display
      const ids = isHost
        ? [...new Set(data.map((b) => b.guestId))]
        : [...new Set(data.map((b) => b.hostId))];

      const details = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await api.get(`/api/users/${id}`);
            details[id] = res.data;
          } catch {
            details[id] = { firstName: "Unknown", lastName: "" };
          }
        })
      );
      setHostDetails(details);
    } catch (err) {
      console.error("Failed to load bookings", err);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    const reason = window.prompt("Please provide a reason for cancellation (required):");
    if (reason === null) return; // user dismissed
    if (!reason.trim()) {
      toast.error("Cancellation reason is required");
      return;
    }
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await cancelBooking(bookingId, reason.trim());
      toast.success("Booking cancelled. Admin will process your refund if applicable.");
      loadBookings();
    } catch (err) {
      toast.error("Failed to cancel booking");
    }
  };

  const filteredBookings =
    filter === "ALL"
      ? bookings
      : bookings.filter((b) => b.status === filter);

  const getNights = (b) => {
    if (!b.checkInDate || !b.checkOutDate) return 0;
    return Math.max(
      1,
      (new Date(b.checkOutDate) - new Date(b.checkInDate)) /
        (1000 * 60 * 60 * 24)
    );
  };

  const getOtherUser = (booking) => {
    const id = isHost ? booking.guestId : booking.hostId;
    return hostDetails[id] || {};
  };

  if (!user) {
    return (
      <div className="my-bookings-page">
        <div className="mb-container">
          <h2>Please log in to see your bookings</h2>
          <button
            className="mb-btn mb-btn--primary"
            onClick={() => navigate("/login")}
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-bookings-page">
      <div className="mb-container">
        <h1 className="mb-title">
          {isHost ? "Your Reservations" : "Your Bookings"}
        </h1>
        <p className="mb-subtitle">
          {isHost
            ? "Manage bookings for your properties"
            : "Track your travel plans"}
        </p>

        {/* Status Filters */}
        <div className="mb-filters">
          <button
            className={`mb-filter-pill ${filter === "ALL" ? "mb-filter-pill--active" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            All ({bookings.length})
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = bookings.filter((b) => b.status === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                className={`mb-filter-pill ${filter === key ? "mb-filter-pill--active" : ""}`}
                onClick={() => setFilter(key)}
              >
                {cfg.icon} {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="mb-loading">
            <div className="spinner" />
            <p>Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="mb-empty">
            <div className="mb-empty__icon">📋</div>
            <h3>No bookings found</h3>
            <p>
              {filter === "ALL"
                ? "You don't have any bookings yet."
                : `No ${STATUS_CONFIG[filter]?.label.toLowerCase()} bookings.`}
            </p>
            {!isHost && (
              <button
                className="mb-btn mb-btn--primary"
                onClick={() => navigate("/")}
              >
                Explore places
              </button>
            )}
          </div>
        ) : (
          <div className="mb-cards">
            {filteredBookings.map((booking) => {
              const other = getOtherUser(booking);
              const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
              const payment = PAYMENT_CONFIG[booking.paymentStatus] || PAYMENT_CONFIG.PENDING;
              const nights = getNights(booking);

              return (
                <div key={booking.id} className="mb-card" onClick={() => navigate(`/booking/${booking.id}`)} style={{ cursor: "pointer" }}>
                  <div className="mb-card__header">
                    <div className="mb-card__avatar">
                      {other.profileImage ? (
                        <img src={other.profileImage} alt="" />
                      ) : (
                        <div className="mb-card__avatar-placeholder">
                          {other.firstName?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <div className="mb-card__header-info">
                      <h3>
                        {isHost ? "Guest: " : "Host: "}
                        {other.firstName} {other.lastName}
                      </h3>
                      <p>
                        {other.hostDisplayName ||
                          (isHost
                            ? `Booking from ${other.firstName}`
                            : `Stay at ${other.firstName}'s place`)}
                      </p>
                    </div>
                    <div className="mb-card__badges">
                      <span
                        className="mb-status-badge"
                        style={{ color: status.color, background: status.bg }}
                      >
                        {status.icon} {status.label}
                      </span>
                      <span
                        className="mb-status-badge"
                        style={{ color: payment.color, background: payment.bg }}
                      >
                        {payment.label}
                      </span>
                    </div>
                  </div>

                  <div className="mb-card__details">
                    <div className="mb-card__detail-item">
                      <span className="mb-card__label">Check-in</span>
                      <span className="mb-card__value">
                        {new Date(booking.checkInDate).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </div>
                    <div className="mb-card__detail-item">
                      <span className="mb-card__label">Check-out</span>
                      <span className="mb-card__value">
                        {new Date(booking.checkOutDate).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </div>
                    <div className="mb-card__detail-item">
                      <span className="mb-card__label">Duration</span>
                      <span className="mb-card__value">
                        {nights} night{nights > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mb-card__detail-item">
                      <span className="mb-card__label">Total</span>
                      <span className="mb-card__value mb-card__value--price">
                        ${booking.totalPrice}
                      </span>
                    </div>
                  </div>

                  <div className="mb-card__footer">
                    <span className="mb-card__booking-id">
                      Booking #{booking.id?.substring(0, 8)}
                    </span>
                    <div className="mb-card__actions">
                      {booking.status === "PENDING" && (
                        <button
                          className="mb-btn mb-btn--danger"
                          onClick={() => handleCancel(booking.id)}
                        >
                          Cancel
                        </button>
                      )}
                      {booking.status === "CONFIRMED" &&
                        booking.paymentStatus === "PAY_LATER" && (
                          <button
                            className="mb-btn mb-btn--primary"
                            onClick={() =>
                              navigate(`/payment/${booking.id}`)
                            }
                          >
                            Pay Now
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default MyBookingsPage;
