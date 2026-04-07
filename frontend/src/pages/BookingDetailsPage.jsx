import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getBooking, cancelBooking, hostConfirmCheckIn, hostConfirmCheckOut, hostCancelBooking } from "../services/bookingService";
import api from "../utils/axiosConfig";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import BookingTimeline from "../components/BookingTimeline";
import "./BookingDetailsPage.css";

const STATUS_CONFIG = {
  PENDING:    { label: "Pending",    color: "#856404", bg: "#ffeeba", icon: "⏳", desc: "Waiting for admin approval" },
  NOT_PAID_YET: { label: "Not Paid Yet", color: "#856404", bg: "#fff3cd", icon: "💳", desc: "Payment pending" },
  CONFIRMED:  { label: "Confirmed",  color: "#155724", bg: "#d4edda", icon: "✅", desc: "Booking has been confirmed" },
  CANCELLED:  { label: "Cancelled",  color: "#721c24", bg: "#f8d7da", icon: "❌", desc: "This booking was cancelled" },
  CHECKED_IN: { label: "Checked In", color: "#004085", bg: "#cce5ff", icon: "🏨", desc: "Guest has checked in" },
  COMPLETED:  { label: "Completed",  color: "#0c5460", bg: "#d1ecf1", icon: "🎉", desc: "Stay completed successfully" },
  REFUNDED:   { label: "Refunded",   color: "#383d41", bg: "#e2e3e5", icon: "💸", desc: "Payment has been refunded" },
};

const PAYMENT_CONFIG = {
  PENDING:   { label: "Payment Pending", color: "#856404", bg: "#ffeeba" },
  COMPLETED: { label: "Paid",            color: "#155724", bg: "#d4edda" },
  PAY_LATER: { label: "Yet to Pay",      color: "#0c5460", bg: "#d1ecf1" },
  FAILED:    { label: "Payment Failed",  color: "#721c24", bg: "#f8d7da" },
  REFUNDED:  { label: "Refunded",        color: "#383d41", bg: "#e2e3e5" },
};

const BookingDetailsPage = () => {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [host, setHost] = useState(null);
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookingDetails();
    // eslint-disable-next-line
  }, [bookingId]);

  const loadBookingDetails = async () => {
    setLoading(true);
    try {
      const bookingData = await getBooking(bookingId);
      setBooking(bookingData);

      // Fetch host and guest details in parallel
      const [hostRes, guestRes] = await Promise.allSettled([
        api.get(`/api/users/${bookingData.hostId}`),
        api.get(`/api/users/${bookingData.guestId}`),
      ]);

      if (hostRes.status === "fulfilled") setHost(hostRes.value.data);
      if (guestRes.status === "fulfilled") setGuest(guestRes.value.data);
    } catch (err) {
      console.error("Failed to load booking", err);
      toast.error("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await cancelBooking(bookingId);
      toast.success("Booking cancelled successfully");
      loadBookingDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel booking");
    }
  };

  const handleHostCheckIn = async () => {
    if (!window.confirm("Confirm guest check-in?")) return;
    try {
      await hostConfirmCheckIn(bookingId, user.userId);
      toast.success("✅ Check-in confirmed!");
      loadBookingDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to confirm check-in");
    }
  };

  const handleHostCheckOut = async () => {
    if (!window.confirm("Confirm guest check-out?")) return;
    try {
      await hostConfirmCheckOut(bookingId, user.userId);
      toast.success("👋 Check-out confirmed! Payout will be processed.");
      loadBookingDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to confirm check-out");
    }
  };

  const handleHostCancel = async () => {
    const reason = window.prompt("Reason for cancellation (required):");
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("Cancellation reason is required");
      return;
    }
    if (!window.confirm("Are you sure you want to cancel this booking? Guest will receive a refund based on policy.")) return;
    try {
      await hostCancelBooking(bookingId, reason.trim());
      toast.success("Booking cancelled.");
      loadBookingDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel booking");
    }
  };

  const handlePayNow = () => {
    navigate(`/payment/${bookingId}`);
  };

  if (loading) {
    return (
      <div className="bd-page">
        <div className="bd-container">
          <div className="bd-loading">
            <div className="spinner" />
            <p>Loading booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="bd-page">
        <div className="bd-container">
          <h2>Booking not found</h2>
          <button className="bd-btn bd-btn--primary" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
  const payment = PAYMENT_CONFIG[booking.paymentStatus] || PAYMENT_CONFIG.PENDING;
  const nights = Math.max(1, (new Date(booking.checkOutDate) - new Date(booking.checkInDate)) / (1000 * 60 * 60 * 24));
  const isGuest = user?.userId === booking.guestId;
  const isHostUser = user?.userId === booking.hostId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkInDate = new Date(booking.checkInDate);
  checkInDate.setHours(0, 0, 0, 0);

  const canHostCheckIn = isHostUser && booking.status === "CONFIRMED" && today >= checkInDate;
  const canHostCheckOut = isHostUser && booking.status === "CHECKED_IN";
  const canHostCancel = isHostUser && (booking.status === "PENDING" || booking.status === "CONFIRMED" || booking.status === "NOT_PAID_YET");
  const canGuestCancel = isGuest && (booking.status === "PENDING" || booking.status === "CONFIRMED" || booking.status === "NOT_PAID_YET");
  const canGuestPayNow = isGuest && ["NOT_PAID_YET", "PENDING", "CONFIRMED"].includes(booking.status) && (booking.paymentStatus === "PAY_LATER" || booking.paymentStatus === "PENDING");

  const hasNoActions = !canHostCheckIn && !canHostCheckOut && !canHostCancel && !canGuestCancel && !canGuestPayNow;

  return (
    <div className="bd-page">
      <div className="bd-container">
        {/* Back button */}
        <button className="bd-back-btn" onClick={() => navigate(-1)}>← Back</button>

        {/* Page title */}
        <div className="bd-title-row">
          <h1 className="bd-title">Booking Details</h1>
          <span className="bd-booking-id">#{booking.id}</span>
        </div>

        {/* Status banner */}
        <div className="bd-status-banner" style={{ borderColor: status.color + "40", background: status.bg }}>
          <div className="bd-status-banner__left">
            <span className="bd-status-banner__icon">{status.icon}</span>
            <div>
              <h3 className="bd-status-banner__label" style={{ color: status.color }}>{status.label}</h3>
              <p className="bd-status-banner__desc">{status.desc}</p>
            </div>
          </div>
          <span className="bd-payment-badge" style={{ color: payment.color, background: payment.bg }}>
            {payment.label}
          </span>
        </div>

        <div className="bd-grid">
          {/* ── Left Column ── */}
          <div className="bd-left">
            {/* Dates & Duration */}
            <section className="bd-section">
              <h2 className="bd-section__title">Stay Details</h2>
              <div className="bd-detail-grid">
                <div className="bd-detail-card">
                  <span className="bd-detail-card__icon">📅</span>
                  <div>
                    <span className="bd-detail-card__label">Check-in</span>
                    <span className="bd-detail-card__value">
                      {new Date(booking.checkInDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
                <div className="bd-detail-card">
                  <span className="bd-detail-card__icon">📅</span>
                  <div>
                    <span className="bd-detail-card__label">Check-out</span>
                    <span className="bd-detail-card__value">
                      {new Date(booking.checkOutDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
                <div className="bd-detail-card">
                  <span className="bd-detail-card__icon">🌙</span>
                  <div>
                    <span className="bd-detail-card__label">Duration</span>
                    <span className="bd-detail-card__value">{nights} night{nights > 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="bd-detail-card">
                  <span className="bd-detail-card__icon">💰</span>
                  <div>
                    <span className="bd-detail-card__label">Total Price</span>
                    <span className="bd-detail-card__value bd-detail-card__value--price">${booking.totalPrice}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Host info (visible to guests) */}
            {isGuest && host && (
              <section className="bd-section">
                <h2 className="bd-section__title">Host Information</h2>
                <div className="bd-person-card">
                  <div className="bd-person-card__avatar">
                    {host.profileImage ? (
                      <img src={host.profileImage} alt="" />
                    ) : (
                      <span>{host.firstName?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="bd-person-card__info">
                    <h4>{host.hostDisplayName || `${host.firstName} ${host.lastName}`}</h4>
                    <p>{host.propertyTypesOffered?.[0] || "Property"} in {host.district || host.city || host.area}</p>
                    {host.averageRating && (
                      <span className="bd-person-card__rating">★ {host.averageRating.toFixed(2)} ({host.reviewCount} reviews)</span>
                    )}
                  </div>
                  <button className="bd-btn bd-btn--outline" onClick={() => navigate(`/rooms/${host.userId}`)}>View Listing</button>
                </div>
                {host.hostPortfolioImages?.[0] && (
                  <img src={host.hostPortfolioImages[0]} alt="Property" className="bd-property-img" />
                )}
              </section>
            )}

            {/* Guest info (visible to hosts) */}
            {isHostUser && guest && (
              <section className="bd-section">
                <h2 className="bd-section__title">Guest Information</h2>
                <div className="bd-person-card">
                  <div className="bd-person-card__avatar">
                    {guest.profileImage ? (
                      <img src={guest.profileImage} alt="" />
                    ) : (
                      <span>{guest.firstName?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="bd-person-card__info">
                    <h4>{guest.firstName} {guest.lastName}</h4>
                    <p>{guest.email}</p>
                    <p>{guest.phone || ""}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Timeline - Replace old timeline with comprehensive component */}
            {booking.history && booking.history.length > 0 && (
              <BookingTimeline history={booking.history} booking={booking} />
            )}

            {/* Cancellation/Refund Info */}
            {booking.cancellationReason && (
              <section className="bd-section">
                <h2 className="bd-section__title">Cancellation Details</h2>
                <div className="bd-info-box bd-info-box--warning">
                  <strong>Reason:</strong> {booking.cancellationReason}
                  {booking.cancelledBy && (
                    <p><strong>Cancelled by:</strong> {booking.cancelledBy}</p>
                  )}
                  {booking.refundAmount && (
                    <p><strong>Refund Amount:</strong> ${booking.refundAmount}</p>
                  )}
                </div>
              </section>
            )}

            {/* Payout Info (for hosts) */}
            {isHostUser && booking.status === "COMPLETED" && (
              <section className="bd-section">
                <h2 className="bd-section__title">Payout Information</h2>
                <div className={`bd-info-box ${booking.payoutIssued ? "bd-info-box--success" : "bd-info-box--info"}`}>
                  {booking.payoutIssued ? (
                    <>
                      <strong>✅ Payout Issued</strong>
                      <p>Amount: ${booking.payoutAmount}</p>
                      <p>Percentage: {booking.payoutPercentage}%</p>
                      {booking.payoutIssuedAt && (
                        <p>Issued: {new Date(booking.payoutIssuedAt).toLocaleString()}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <strong>⏳ Payout Pending</strong>
                      <p>Your payout will be processed by the admin soon.</p>
                    </>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* ── Right Column: Actions ── */}
          <div className="bd-right">
            <div className="bd-actions-card">
              <h3 className="bd-actions-card__title">Actions</h3>

              {/* Action Buttons */}
              
              {canHostCheckIn && (
                <button className="bd-btn bd-btn--primary bd-btn--full" onClick={handleHostCheckIn}>
                  🏠 Confirm Guest Check-in
                </button>
              )}

              {canHostCheckOut && (
                <button className="bd-btn bd-btn--primary bd-btn--full" onClick={handleHostCheckOut}>
                  👋 Confirm Guest Check-out
                </button>
              )}

              {canGuestPayNow && (
                <button className="bd-btn bd-btn--primary bd-btn--full" onClick={handlePayNow}>
                  💳 Pay Now
                </button>
              )}

              {canGuestCancel && (
                <button className="bd-btn bd-btn--danger bd-btn--full" onClick={handleCancel}>
                  ❌ Cancel Booking
                </button>
              )}

              {canHostCancel && (
                <button className="bd-btn bd-btn--danger bd-btn--full" onClick={handleHostCancel}>
                  ❌ Cancel Booking
                </button>
              )}

              {/* No actions available */}
              {hasNoActions && (
                <p className="bd-actions-card__note">No actions available for this booking status.</p>
              )}

              <div className="bd-actions-card__divider" />

              <div className="bd-actions-card__summary">
                <div className="bd-summary-row">
                  <span>Status</span>
                  <span className="bd-summary-badge" style={{ color: status.color, background: status.bg }}>
                    {status.icon} {status.label}
                  </span>
                </div>
                <div className="bd-summary-row">
                  <span>Payment</span>
                  <span className="bd-summary-badge" style={{ color: payment.color, background: payment.bg }}>
                    {payment.label}
                  </span>
                </div>
                <div className="bd-summary-row">
                  <span>Total</span>
                  <span className="bd-summary-total">${booking.totalPrice}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BookingDetailsPage;
