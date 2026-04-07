import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { cancelBooking, getBookingsByGuest } from "../services/bookingService";
import api from "../utils/axiosConfig";
import "./CustomerTripsPage.css";

const STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "#b45309", bg: "#fef3c7", icon: "⏳", step: 1 },
  CONFIRMED: { label: "Confirmed", color: "#065f46", bg: "#d1fae5", icon: "✅", step: 2 },
  NOT_PAID_YET: { label: "Awaiting Payment", color: "#f59e0b", bg: "#fef3c7", icon: "💳", step: 1 },
  CHECKED_IN: { label: "Checked In", color: "#1e40af", bg: "#dbeafe", icon: "🏨", step: 3 },
  COMPLETED: { label: "Completed", color: "#065f46", bg: "#d1fae5", icon: "🎉", step: 4 },
  CANCELLED: { label: "Cancelled", color: "#991b1b", bg: "#fee2e2", icon: "❌", step: -1 },
  REFUNDED: { label: "Refunded", color: "#4b5563", bg: "#e5e7eb", icon: "💸", step: -1 },
};

const PAYMENT_CONFIG = {
  PENDING: { label: "Payment Pending", color: "#b45309", bg: "#fef3c7" },
  COMPLETED: { label: "Paid", color: "#065f46", bg: "#d1fae5" },
  PAY_LATER: { label: "Pay Later", color: "#1e40af", bg: "#dbeafe" },
  FAILED: { label: "Failed", color: "#991b1b", bg: "#fee2e2" },
  REFUNDED: { label: "Refunded", color: "#4b5563", bg: "#e5e7eb" },
};

const CANCELLATION_POLICIES = {
  FLEXIBLE: {
    label: "Flexible",
    desc: "Full refund up to 24 hours before check-in",
    refundPercent: (daysLeft) => (daysLeft >= 1 ? 100 : 50),
  },
  MODERATE: {
    label: "Moderate",
    desc: "Full refund if cancelled 5+ days before check-in",
    refundPercent: (daysLeft) => (daysLeft >= 5 ? 100 : daysLeft >= 1 ? 50 : 0),
  },
  STRICT: {
    label: "Strict",
    desc: "50% refund if cancelled 7+ days before check-in",
    refundPercent: (daysLeft) => (daysLeft >= 7 ? 50 : 0),
  },
};

const STATUS_STEPS = [
  { key: "booked", label: "Booked", icon: "📝" },
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "checkedIn", label: "Checked In", icon: "🏨" },
  { key: "completed", label: "Completed", icon: "🎉" },
];

const CustomerTripsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("current");
  const [hostCache, setHostCache] = useState({});
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // New Modal States
  const [passportModal, setPassportModal] = useState(false);
  const [conciergeModal, setConciergeModal] = useState(false);
  const [conciergeMessage, setConciergeMessage] = useState("");
  const [conciergeSent, setConciergeSent] = useState(false);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBookingsByGuest(user.userId);
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBookings(data);

      const hostIds = [...new Set(data.map((b) => b.hostId).filter(Boolean))];
      const cache = {};
      await Promise.all(
        hostIds.map(async (id) => {
          try {
            const res = await api.get(`/api/users/${id}`);
            cache[id] = res.data;
          } catch {
            cache[id] = { hostDisplayName: "Host", firstName: "Host" };
          }
        }),
      );
      setHostCache(cache);
    } catch (err) {
      console.error("Failed to load trips", err);
      toast.error("Failed to load your trips");
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    if (user?.userId) {
      fetchTrips();
    }
  }, [user?.userId, fetchTrips]);

  const today = new Date().toISOString().split("T")[0];

  const categorized = useMemo(() => {
    const current = [], past = [], cancelled = [];
    bookings.forEach((b) => {
      if (["CANCELLED", "REFUNDED"].includes(b.status)) {
        cancelled.push(b);
      } else if (
        ["COMPLETED"].includes(b.status) ||
        (b.checkOutDate && b.checkOutDate < today)
      ) {
        past.push(b);
      } else {
        current.push(b);
      }
    });
    return { current, past, cancelled };
  }, [bookings, today]);

  const getDaysUntilCheckIn = (checkInDate) => {
    if (!checkInDate) return 0;
    const diff = (new Date(checkInDate) - new Date()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diff));
  };

  const getRefundPercent = (booking) => {
    const policy = booking.cancellationPolicy || "MODERATE";
    const cfg = CANCELLATION_POLICIES[policy] || CANCELLATION_POLICIES.MODERATE;
    return cfg.refundPercent(getDaysUntilCheckIn(booking.checkInDate));
  };

  const handleCancelBooking = async () => {
    if (!cancelModal) return;
    if (!cancelReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }
    setCancelling(true);
    try {
      await cancelBooking(cancelModal.id, cancelReason.trim());
      toast.success("Cancellation request submitted. Admin will process your refund.");
      setCancelModal(null);
      setCancelReason("");
      fetchTrips();
    } catch (err) {
      toast.error("Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewData.comment.trim()) {
      toast.error("Please provide a review comment");
      return;
    }
    setSubmittingReview(true);
    try {
      await api.post('/api/reviews', {
        bookingId: reviewModal.id,
        guestId: user.userId,
        hostId: reviewModal.hostId,
        propertyId: reviewModal.propertyId || `prop-${reviewModal.hostId}-0`,
        overallRating: reviewData.rating,
        cleanlinessRating: reviewData.rating,
        accuracyRating: reviewData.rating,
        checkInRating: reviewData.rating,
        communicationRating: reviewData.rating,
        locationRating: reviewData.rating,
        valueRating: reviewData.rating,
        reviewText: reviewData.comment,
        guestName: `${user.firstName || 'Guest'} ${user.lastName || ''}`.trim(),
        guestProfileImage: user.profileImage || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`
      });
      toast.success("Review submitted successfully!");
      setReviewModal(null);
      setReviewData({ rating: 5, comment: "" });
    } catch (err) {
      toast.error("Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handlePayNow = (bookingId) => {
    navigate(`/payment/${bookingId}`);
  };

  const getHost = (id) => hostCache[id] || {};
  const getNights = (b) =>
    b.checkInDate && b.checkOutDate
      ? Math.max(1, Math.ceil((new Date(b.checkOutDate) - new Date(b.checkInDate)) / (1000 * 60 * 60 * 24)))
      : 0;

  const tabs = [
    { key: "current", label: "Current Trips", count: categorized.current.length, icon: "🏠" },
    { key: "past", label: "Past Trips", count: categorized.past.length, icon: "📋" },
    { key: "cancelled", label: "Cancelled", count: categorized.cancelled.length, icon: "❌" },
  ];

  /* ── Status progress bar ── */
  const getActiveStep = (booking) => {
    const s = booking.status;
    if (s === "PENDING" || s === "NOT_PAID_YET") return 0;
    if (s === "CONFIRMED") return 1;
    if (s === "CHECKED_IN") return 2;
    if (s === "COMPLETED") return 3;
    return -1; // cancelled/refunded
  };

  const renderStatusBar = (booking) => {
    const active = getActiveStep(booking);
    if (active === -1) return null; // don't show for cancelled

    return (
      <div className="ct-status-bar">
        {STATUS_STEPS.map((step, i) => {
          const done = i <= active;
          const isCurrent = i === active;
          return (
            <div key={step.key} className="ct-status-bar__step-wrap">
              <div className={`ct-status-bar__step ${done ? "ct-status-bar__step--done" : ""} ${isCurrent ? "ct-status-bar__step--current" : ""}`}>
                <div className="ct-status-bar__circle">
                  {done ? <span className="ct-status-bar__check">✓</span> : <span className="ct-status-bar__num">{i + 1}</span>}
                </div>
                <span className="ct-status-bar__label">{step.label}</span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`ct-status-bar__connector ${i < active ? "ct-status-bar__connector--done" : ""}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderBookingCard = (booking) => {
    const host = getHost(booking.hostId);
    const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
    const payment = PAYMENT_CONFIG[booking.paymentStatus] || PAYMENT_CONFIG.PENDING;
    const nights = getNights(booking);
    const canCancel = ["PENDING", "CONFIRMED", "NOT_PAID_YET"].includes(booking.status);
    const canPay =
      (booking.paymentStatus === "PAY_LATER" || booking.paymentStatus === "PENDING") &&
      ["NOT_PAID_YET", "CONFIRMED"].includes(booking.status);
    const daysUntil = getDaysUntilCheckIn(booking.checkInDate);

    return (
      <div className="ct-card" key={booking.id}>
        {/* Full-width Immersive Banner */}
        <div className="ct-card-header" onClick={() => navigate(`/booking/${booking.id}`)}>
          <div className="ct-card-image">
            {host.hostPortfolioImages?.[0] ? (
              <img src={host.hostPortfolioImages[0]} alt="property coverage" onError={(e) => { e.target.onerror = null; e.target.src = `https://picsum.photos/seed/${booking.propertyId || booking.id}/800/400`; }} />
            ) : (
              <img src={`https://picsum.photos/seed/${booking.propertyId || booking.id}/800/400`} alt="placeholder cover" />
            )}
            <div className="ct-card-badges">
              <span className="ct-badge" style={{ color: status.color, background: `${status.bg}E6` }}>
                {status.icon} {status.label}
              </span>
            </div>
            <div className="ct-card-badges-right">
              <span className="ct-badge" style={{ color: payment.color, background: `${payment.bg}E6` }}>
                {payment.label}
              </span>
            </div>
          </div>
        </div>

        <div className="ct-card-content-wrap">
          <div className="ct-card-info" onClick={() => navigate(`/booking/${booking.id}`)}>
            <p className="ct-card-location">
              <span style={{color: '#ff385c', fontSize: '18px'}}>📍</span> {host.area || host.city || host.district || "Destination"},{" "}
              {host.country || ""}
            </p>
            <h3>{host.hostDisplayName || `${host.firstName || "Host"}'s Exquisite Home`}</h3>
            
            <div className="ct-card-meta">
              <span className="ct-meta-item">
                <span className="ct-meta-icon">🗓️</span>
                {booking.checkInDate
                  ? new Date(booking.checkInDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "—"}
                <span className="ct-arrow">to</span>
                {booking.checkOutDate
                  ? new Date(booking.checkOutDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "—"}
              </span>
              <span className="ct-meta-item">
                <span className="ct-meta-icon">🌙</span>
                {nights} night{nights !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

        {/* Status Progress Bar */}
        {renderStatusBar(booking)}

        {/* Detailed info row */}
        <div className="ct-card-details" onClick={() => navigate(`/booking/${booking.id}`)}>
          <div className="ct-detail-item">
            <span className="ct-detail-label">Check-in</span>
            <span className="ct-detail-value">
              {booking.checkInDate
                ? new Date(booking.checkInDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                : "—"}
            </span>
          </div>
          <div className="ct-detail-item">
            <span className="ct-detail-label">Check-out</span>
            <span className="ct-detail-value">
              {booking.checkOutDate
                ? new Date(booking.checkOutDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                : "—"}
            </span>
          </div>
          <div className="ct-detail-item">
            <span className="ct-detail-label">Total Price</span>
            <span className="ct-detail-value ct-detail-value--price">${booking.totalPrice}</span>
          </div>
          {booking.status !== "CANCELLED" && booking.status !== "REFUNDED" && daysUntil > 0 && (
            <div className="ct-detail-item ct-detail-item--highlight">
              <span className="ct-detail-label">Days Until Check-in</span>
              <span className="ct-detail-value">{daysUntil} day{daysUntil !== 1 ? "s" : ""}</span>
            </div>
          )}
          {booking.cancellationPolicy && (
            <div className="ct-detail-item">
              <span className="ct-detail-label">Cancellation Policy</span>
              <span className="ct-detail-value">{booking.cancellationPolicy}</span>
            </div>
          )}
        </div>

        {/* Footer with price and actions */}
        <div className="ct-card-footer">
          <div className="ct-card-price">
            <span className="ct-price-label">Total Amount</span>
            <span className="ct-price-value">${booking.totalPrice}</span>
          </div>
          <div className="ct-card-actions" onClick={(e) => e.stopPropagation()}>
            {canPay && (
              <button className="ct-btn ct-btn-pay" onClick={() => handlePayNow(booking.id)} style={{ boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
                💳 Pay Now
              </button>
            )}
            {canCancel && (
              <button className="ct-btn ct-btn-cancel" onClick={() => setCancelModal(booking)}>
                Cancel Request
              </button>
            )}
            {booking.status === "COMPLETED" && (
              <button className="ct-btn ct-btn-review" style={{ background: '#1e293b', color: 'white' }} onClick={() => setReviewModal(booking)}>
                ⭐ Write Review
              </button>
            )}
            <button className="ct-btn ct-btn-view" style={{ background: 'white', border: '1px solid #cbd5e1' }} onClick={() => navigate(`/booking/${booking.id}`)}>
              View Details →
            </button>
          </div>
        </div>
        
        </div>

        {/* Show cancellation reason if cancelled */}
        {(booking.status === "CANCELLED" || booking.status === "REFUNDED") && booking.cancellationReason && (
          <div className="ct-cancellation-box">
            <div className="ct-cancellation-box__header">
              <span>❌</span>
              <strong>Cancellation Reason</strong>
              {booking.cancelledBy && <span className="ct-cancelled-by">by {booking.cancelledBy}</span>}
            </div>
            <p>{booking.cancellationReason}</p>
          </div>
        )}

        {/* Show refund info if refunded */}
        {(booking.status === "CANCELLED" || booking.status === "REFUNDED") && booking.refundAmount > 0 && (
          <div className="ct-refund-box">
            <span>💸</span>
            <div>
              <strong>Refund Amount: ${booking.refundAmount}</strong>
              {booking.status === "REFUNDED" && <p>Refund has been processed</p>}
              {booking.status === "CANCELLED" && <p>Refund will be processed by admin</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeBookings = categorized[activeTab] || [];

  return (
    <div className="ct-page">
      <div className="ct-container">
        <div className="ct-header">
          <h1>My Trips</h1>
          <p>Track your current, past, and cancelled bookings</p>
        </div>

        {/* Global Summary Statistics for Guest */}
        {!loading && (
          <div className="ct-summary-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            {/* Total Trips - Premium Violet */}
            <div className="ct-stat-card" style={{ padding: '28px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 25px rgba(99,102,241,0.2)' }}>
              <span style={{ fontSize: '100px', position: 'absolute', right: '-15px', bottom: '-20px', opacity: '0.15', transform: 'rotate(-10deg)' }}>✈️</span>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                <span style={{ fontSize: '28px' }}>✈️</span>
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginBottom: '4px' }}>Voyages Booked</p>
                <h3 style={{ margin: 0, fontSize: '36px', fontWeight: '800' }}>{categorized.past.length + categorized.current.length}</h3>
              </div>
            </div>

            {/* Upcoming - Premium Teal */}
            <div className="ct-stat-card" style={{ padding: '28px 24px', background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', borderRadius: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 25px rgba(13,148,136,0.2)' }}>
              <span style={{ fontSize: '100px', position: 'absolute', right: '-15px', bottom: '-20px', opacity: '0.15', transform: 'rotate(5deg)' }}>🏖️</span>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                <span style={{ fontSize: '28px' }}>📅</span>
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginBottom: '4px' }}>Upcoming Stays</p>
                <h3 style={{ margin: 0, fontSize: '36px', fontWeight: '800' }}>{categorized.current.length}</h3>
              </div>
            </div>

            {/* Total Spent - Premium Rose */}
            <div className="ct-stat-card" style={{ padding: '28px 24px', background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', borderRadius: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 25px rgba(225,29,72,0.2)' }}>
              <span style={{ fontSize: '100px', position: 'absolute', right: '-10px', bottom: '-20px', opacity: '0.15' }}>💳</span>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                <span style={{ fontSize: '28px' }}>💰</span>
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginBottom: '4px' }}>Total Spent</p>
                <h3 style={{ margin: 0, fontSize: '36px', fontWeight: '800' }}>
                  ${categorized.past.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0) + categorized.current.filter(b => b.paymentStatus === 'COMPLETED').reduce((acc, curr) => acc + (curr.totalPrice || 0), 0)}
                </h3>
              </div>
            </div>
          </div>
        )}

        <div className="ct-dashboard-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '40px', alignItems: 'start' }}>
          
          {/* Left Column: Trips List */}
          <div className="ct-main-column">
            <div className="ct-tabs" style={{ marginBottom: '32px' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`ct-tab ${activeTab === tab.key ? "ct-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span className="ct-tab-icon">{tab.icon}</span>
                  <span className="ct-tab-label">{tab.label}</span>
                  <span className="ct-tab-count">{tab.count}</span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="ct-loading">
                <div className="spinner" />
                <p>Loading your trips...</p>
              </div>
            ) : activeBookings.length === 0 ? (
              <div className="ct-empty">
                <div className="ct-empty-icon">
                  {activeTab === "current" ? "🏖️" : activeTab === "past" ? "📋" : "💤"}
                </div>
                <h3>No {activeTab} trips</h3>
                <p>
                  {activeTab === "current"
                    ? "You don't have any upcoming trips. Start exploring!"
                    : activeTab === "past"
                      ? "No completed trips yet."
                      : "No cancelled bookings."}
                </p>
                {activeTab === "current" && (
                  <button className="ct-btn ct-btn-explore" onClick={() => navigate("/")}>
                    Explore homes
                  </button>
                )}
              </div>
            ) : (
              <div className="ct-cards" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {activeBookings.map(renderBookingCard)}
              </div>
            )}
          </div>

          {/* Right Column: Travel Sidebar Widgets */}
          <aside className="ct-sidebar-column" style={{ position: 'sticky', top: '100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Travel Map App Widget */}
            <div className="ct-sidebar-widget" style={{ background: 'white', borderRadius: '24px', padding: '0', overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
               <div style={{ height: '220px', width: '100%', position: 'relative', cursor: 'pointer' }} onClick={() => setPassportModal(true)}>
                 <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800" alt="World Map" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://picsum.photos/seed/map/800/400'; }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} />
                 <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0) 100%)', display: 'flex', alignItems: 'flex-end', padding: '24px', pointerEvents: 'none' }}>
                    <h3 style={{ color: 'white', fontSize: '22px', fontWeight: '700', margin: 0 }}>Your Travel Map</h3>
                 </div>
               </div>
               <div style={{ padding: '24px' }}>
                  <p style={{ color: '#64748b', fontSize: '15px', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                    {categorized.past.length > 0 
                      ? "You've journeyed far! Every trip builds your global footprint. See where you've been."
                      : "Your adventure begins here. Book your first home to drop your first pin on the map."}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {Array.from(new Set(categorized.past.map(b => getHost(b.hostId)?.country).filter(Boolean))).slice(0, 4).map(country => (
                       <span key={country} style={{ padding: '8px 16px', background: '#f8fafc', borderRadius: '20px', fontSize: '13px', fontWeight: '700', color: '#0f172a', border: '1px solid #e2e8f0' }}>📍 {country}</span>
                    ))}
                    {categorized.past.length > 0 && <span onClick={() => setPassportModal(true)} style={{ padding: '8px 16px', background: 'transparent', borderRadius: '20px', fontSize: '13px', fontWeight: '700', color: '#ff385c', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#e31c5f'} onMouseOut={(e) => e.currentTarget.style.color = '#ff385c'}>View all →</span>}
                  </div>
               </div>
            </div>

            {/* Concierge Widget */}
            <div className="ct-sidebar-widget" style={{ background: '#0f172a', borderRadius: '24px', padding: '32px', color: 'white', boxShadow: '0 10px 30px rgba(15,23,42,0.2)', position: 'relative', overflow: 'hidden' }}>
               <div style={{ position: 'absolute', top: -30, right: -20, fontSize: '160px', opacity: 0.05, transform: 'rotate(15deg)', pointerEvents: 'none' }}>✨</div>
               <h3 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 10px 0', position: 'relative', zIndex: 1, color: 'white' }}>Airbnb Concierge</h3>
               <p style={{ color: '#94a3b8', fontSize: '15px', margin: '0 0 24px 0', lineHeight: 1.6, position: 'relative', zIndex: 1 }}>Instant access to VIP support, itinerary planning, and priority assistance for all your stays.</p>
               <button onClick={() => { setConciergeSent(false); setConciergeMessage(""); setConciergeModal(true); }} style={{ background: 'white', color: '#0f172a', width: '100%', padding: '14px', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', position: 'relative', zIndex: 1, transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(255,255,255,0.1)' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                 Contact VIP Support
               </button>
            </div>

          </aside>
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="ct-modal-overlay" onClick={() => setCancelModal(null)}>
          <div className="ct-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Cancel Booking</h2>
            <div className="ct-modal-details">
              <p><strong>Property:</strong> {getHost(cancelModal.hostId)?.hostDisplayName || "Host's Place"}</p>
              <p><strong>Dates:</strong> {cancelModal.checkInDate} → {cancelModal.checkOutDate}</p>
              <p><strong>Total Paid:</strong> ${cancelModal.totalPrice}</p>
            </div>

            <div className="ct-modal-policy">
              <h4>Cancellation Policy: {cancelModal.cancellationPolicy || "MODERATE"}</h4>
              <p>{CANCELLATION_POLICIES[cancelModal.cancellationPolicy || "MODERATE"]?.desc}</p>
              <div className="ct-refund-preview">
                <span>Estimated Refund:</span>
                <strong>
                  {getRefundPercent(cancelModal)}% — $
                  {Math.round(((cancelModal.totalPrice || 0) * getRefundPercent(cancelModal)) / 100)}
                </strong>
              </div>
            </div>

            <div className="ct-modal-reason">
              <label>Reason for cancellation *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide a reason for cancellation..."
                rows={4}
              />
            </div>

            <div className="ct-modal-actions">
              <button className="ct-btn ct-btn-secondary" onClick={() => setCancelModal(null)}>
                Keep Booking
              </button>
              <button className="ct-btn ct-btn-danger" onClick={handleCancelBooking} disabled={cancelling}>
                {cancelling ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="ct-modal-overlay" onClick={() => setReviewModal(null)}>
          <div className="ct-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Write a Review</h2>
            <div className="ct-modal-details" style={{ marginBottom: "20px" }}>
              <p><strong>Property:</strong> {getHost(reviewModal.hostId)?.hostDisplayName || "Host's Place"}</p>
              <p>How was your stay?</p>
            </div>
            
            <div className="ct-modal-reason">
              <label>Rating</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', fontSize: '24px', cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span 
                    key={star} 
                    onClick={() => setReviewData({...reviewData, rating: star})}
                    style={{ color: star <= reviewData.rating ? '#ffb400' : '#ddd' }}
                  >★</span>
                ))}
              </div>

              <label>Review Comment *</label>
              <textarea
                value={reviewData.comment}
                onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                placeholder="Share details of your own experience at this place..."
                rows={4}
              />
            </div>

            <div className="ct-modal-actions">
              <button className="ct-btn ct-btn-secondary" onClick={() => setReviewModal(null)}>
                Cancel
              </button>
              <button className="ct-btn ct-btn-primary" onClick={handleSubmitReview} disabled={submittingReview} style={{ backgroundColor: '#ff385c', color: 'white', border: 'none' }}>
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Travel Passport Modal */}
      {passportModal && (
        <div className="ct-modal-overlay" onClick={() => setPassportModal(false)}>
          <div className="ct-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', padding: 0, overflow: 'hidden' }}>
            <div style={{ height: '240px', width: '100%', position: 'relative' }}>
              <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800" alt="World Map" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.95), transparent)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '32px' }}>
                 <h2 style={{ color: 'white', fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0' }}>Travel Passport</h2>
                 <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px' }}>Your global footprint and unlocked destinations.</p>
              </div>
            </div>
            <div style={{ padding: '32px', maxHeight: '400px', overflowY: 'auto' }}>
              <h4 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>Destinations Visited ({Array.from(new Set(categorized.past.map(b => getHost(b.hostId)?.country).filter(Boolean))).length})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
                {Array.from(new Set(categorized.past.map(b => getHost(b.hostId)?.country).filter(Boolean))).map((country, idx) => (
                  <div key={idx} style={{ padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>📍</span>
                    <span style={{ fontWeight: '700', color: '#1e293b' }}>{country}</span>
                  </div>
                ))}
                {categorized.past.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px' }}>🌍</div>
                    <p>Your passport is empty! Complete a trip to unlock your first destination badge.</p>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setPassportModal(false)} style={{ padding: '12px 24px', background: '#0f172a', color: 'white', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Close Passport</button>
            </div>
          </div>
        </div>
      )}

      {/* Concierge Modal */}
      {conciergeModal && (
        <div className="ct-modal-overlay" onClick={() => setConciergeModal(false)}>
          <div className="ct-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', background: '#0f172a', color: 'white', padding: '40px' }}>
            {conciergeSent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '64px', marginBottom: '24px' }}>✨</div>
                <h2 style={{ color: 'white', fontSize: '28px', marginBottom: '16px' }}>Message Sent!</h2>
                <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '32px' }}>Our VIP Concierge team has received your request. We will reach out to you within the next 2 hours.</p>
                <button onClick={() => setConciergeModal(false)} style={{ background: 'white', color: '#0f172a', padding: '14px 32px', borderRadius: '12px', border: 'none', fontWeight: '800', cursor: 'pointer', width: '100%' }}>Done</button>
              </div>
            ) : (
              <>
                <h2 style={{ color: 'white', fontSize: '28px', margin: '0 0 8px 0' }}>VIP Concierge</h2>
                <p style={{ color: '#94a3b8', marginBottom: '32px' }}>How can we make your trip unforgettable?</p>
                
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', color: '#cbd5e1', fontWeight: '600', fontSize: '14px' }}>How can we help?</label>
                  <select style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '15px', outline: 'none' }}>
                    <option>Itinerary Planning</option>
                    <option>Special Request at Property</option>
                    <option>Reservation Modification</option>
                    <option>Transportation Assistance</option>
                  </select>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', color: '#cbd5e1', fontWeight: '600', fontSize: '14px' }}>Message</label>
                  <textarea 
                    value={conciergeMessage}
                    onChange={(e) => setConciergeMessage(e.target.value)}
                    placeholder="Tell us what you need..."
                    rows={5}
                    style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '15px', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <button onClick={() => setConciergeModal(false)} style={{ flex: 1, background: 'transparent', color: '#94a3b8', padding: '14px', borderRadius: '12px', border: '1px solid #334155', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => setConciergeSent(true)} style={{ flex: 2, background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>Send Request</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CustomerTripsPage;
