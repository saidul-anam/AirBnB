import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getBookingsByHost, hostConfirmCheckIn, hostConfirmCheckOut, hostCancelBooking } from "../services/bookingService";
import api from "../utils/axiosConfig";
import { getNightlyRate, getTaxPercent } from "../utils/hostUtils";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import ReviewsSection from "../components/ReviewsSection";
import "./HostDashboardPage.css";

/* ── Status configs ── */
const STATUS_CONFIG = {
  PENDING:    { label: "Pending",    color: "#856404", bg: "#ffeeba", icon: "⏳" },
  CONFIRMED:  { label: "Confirmed",  color: "#155724", bg: "#d4edda", icon: "✅" },
  NOT_PAID_YET: { label: "Not Paid Yet", color: "#856404", bg: "#fff3cd", icon: "💳" },
  CANCELLED:  { label: "Cancelled",  color: "#721c24", bg: "#f8d7da", icon: "❌" },
  CHECKED_IN: { label: "Checked In", color: "#004085", bg: "#cce5ff", icon: "🏨" },
  COMPLETED:  { label: "Completed",  color: "#0c5460", bg: "#d1ecf1", icon: "🎉" },
  REFUNDED:   { label: "Refunded",   color: "#383d41", bg: "#e2e3e5", icon: "💸" },
};

const PAYMENT_CONFIG = {
  PENDING:   { label: "Payment Pending", color: "#856404", bg: "#ffeeba" },
  COMPLETED: { label: "Paid",            color: "#155724", bg: "#d4edda" },
  PAY_LATER: { label: "Yet to Pay",      color: "#0c5460", bg: "#d1ecf1" },
  FAILED:    { label: "Payment Failed",  color: "#721c24", bg: "#f8d7da" },
  REFUNDED:  { label: "Refunded",        color: "#383d41", bg: "#e2e3e5" },
};

const HostDashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("calendar");
  const [bookings, setBookings] = useState([]);
  const [guestDetails, setGuestDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reviews, setReviews] = useState([]);
  const [freshHostData, setFreshHostData] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "HOST") {
      navigate("/login");
      return;
    }
    loadHostData();
    // eslint-disable-next-line
  }, [user]);

  const loadHostData = async () => {
    setLoading(true);
    try {
      const data = await getBookingsByHost(user.userId);
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBookings(data);

      // Fetch guest names
      const ids = [...new Set(data.map((b) => b.guestId))];
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
      setGuestDetails(details);

      // Fetch host reviews
      try {
        const reviewsRes = await api.get(`/api/reviews/host/${user.userId}`);
        setReviews(reviewsRes.data || []);
      } catch (e) {
        console.error("Failed to fetch reviews", e);
      }

      // Fetch fresh host data to overcome stale JWT token issues perfectly
      try {
        const hostRes = await api.get(`/api/users/${user.userId}`);
        setFreshHostData(hostRes.data);
      } catch (e) {
        console.error("Failed to fetch fresh host data", e);
      }
    } catch (err) {
      console.error("Failed to load host data", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (bookingId, e) => {
    e.stopPropagation();
    if (!window.confirm("Confirm guest check-in for this booking?")) return;
    try {
      await hostConfirmCheckIn(bookingId, user.userId);
      toast.success("✅ Check-in confirmed!");
      loadHostData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to confirm check-in");
    }
  };

  const handleCheckOut = async (bookingId, e) => {
    e.stopPropagation();
    if (!window.confirm("Confirm guest check-out for this booking? This will mark the trip as completed and admin will process payout.")) return;
    try {
      await hostConfirmCheckOut(bookingId, user.userId);
      toast.success("✅ Check-out confirmed! Trip completed. Payout will be processed by admin.");
      loadHostData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to confirm check-out");
    }
  };

  const handleCancelBooking = async (bookingId, e) => {
    e.stopPropagation();
    const reason = window.prompt("Please provide a reason for cancellation (required):");
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("Cancellation reason is required");
      return;
    }
    if (!window.confirm("Are you sure you want to cancel this booking? Guest will receive a full refund.")) return;
    try {
      await hostCancelBooking(bookingId, reason.trim());
      toast.success("Booking cancelled. Admin will process the refund.");
      loadHostData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel booking");
    }
  };

  /* ─────────────── CALENDAR TAB ─────────────── */
  const calendarData = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDow = firstDay.getDay();

    const dateMap = {};
    bookings.forEach((b) => {
      if (b.status === "CANCELLED" || b.status === "REFUNDED") return;
      const start = new Date(b.checkInDate);
      const end = new Date(b.checkOutDate);
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() === month) {
          const key = d.getDate();
          if (!dateMap[key]) dateMap[key] = [];
          dateMap[key].push(b);
        }
      }
    });

    return { daysInMonth, startDow, dateMap };
  }, [calendarMonth, bookings]);

  const navigateMonth = (offset) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
  };

  const renderCalendar = () => {
    const { daysInMonth, startDow, dateMap } = calendarData;
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const cells = [];

    for (let i = 0; i < startDow; i++) {
      cells.push(<div key={`empty-${i}`} className="hd-cal__cell hd-cal__cell--empty" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const bookingsForDay = dateMap[day] || [];
      const isBooked = bookingsForDay.length > 0;
      const today = new Date();
      const isToday = day === today.getDate() && calendarMonth.getMonth() === today.getMonth() && calendarMonth.getFullYear() === today.getFullYear();

      cells.push(
        <div key={day} className={`hd-cal__cell ${isBooked ? "hd-cal__cell--booked" : "hd-cal__cell--free"} ${isToday ? "hd-cal__cell--today" : ""}`}>
          <span className="hd-cal__day-num">{day}</span>
          {isBooked ? (
            <div className="hd-cal__booking-info">
              {bookingsForDay.map((b, idx) => (
                <div key={idx} className="hd-cal__booking-chip" onClick={() => navigate(`/booking/${b.id}`)} title={`Booking #${b.id?.substring(0, 8)}`}>
                  <span className="hd-cal__chip-icon">📌</span>
                  <span className="hd-cal__chip-id">#{b.id?.substring(0, 6)}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="hd-cal__free-label">Free</span>
          )}
        </div>
      );
    }

    return (
      <div className="hd-calendar">
        <div className="hd-cal__header">
          <button className="hd-cal__nav-btn" onClick={() => navigateMonth(-1)}>‹</button>
          <h3 className="hd-cal__month-title">
            {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h3>
          <button className="hd-cal__nav-btn" onClick={() => navigateMonth(1)}>›</button>
        </div>

        <div className="hd-cal__legend">
          <span className="hd-cal__legend-item"><span className="hd-cal__legend-dot hd-cal__legend-dot--booked" /> Booked</span>
          <span className="hd-cal__legend-item"><span className="hd-cal__legend-dot hd-cal__legend-dot--free" /> Available</span>
          <span className="hd-cal__legend-item"><span className="hd-cal__legend-dot hd-cal__legend-dot--today" /> Today</span>
        </div>

        <div className="hd-cal__grid">
          {dayNames.map((d) => (
            <div key={d} className="hd-cal__day-name">{d}</div>
          ))}
          {cells}
        </div>

        <div className="hd-cal__month-bookings">
          <h4>Bookings this month</h4>
          {bookings.filter((b) => {
            if (b.status === "CANCELLED" || b.status === "REFUNDED") return false;
            const start = new Date(b.checkInDate);
            const end = new Date(b.checkOutDate);
            const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
            const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
            return start <= monthEnd && end >= monthStart;
          }).length === 0 ? (
            <p className="hd-cal__no-bookings">No bookings this month — all dates are available!</p>
          ) : (
            <div className="hd-cal__booking-list">
              {bookings.filter((b) => {
                if (b.status === "CANCELLED" || b.status === "REFUNDED") return false;
                const start = new Date(b.checkInDate);
                const end = new Date(b.checkOutDate);
                const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
                const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
                return start <= monthEnd && end >= monthStart;
              }).map((b) => {
                const guest = guestDetails[b.guestId] || {};
                const status = STATUS_CONFIG[b.status] || STATUS_CONFIG.PENDING;
                return (
                  <div key={b.id} className="hd-cal__booking-row" onClick={() => navigate(`/booking/${b.id}`)}>
                    <div className="hd-cal__booking-dates">
                      {new Date(b.checkInDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" — "}
                      {new Date(b.checkOutDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <div className="hd-cal__booking-guest">
                      {guest.firstName} {guest.lastName}
                    </div>
                    <span className="hd-cal__booking-status" style={{ color: status.color, background: status.bg }}>
                      {status.icon} {status.label}
                    </span>
                    <span className="hd-cal__booking-id">#{b.id?.substring(0, 8)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHostedHomes = () => {
    const hostData = freshHostData || user;
    const properties = hostData?.hostedProperties && hostData.hostedProperties.length > 0 
      ? hostData.hostedProperties 
      : [{
          propertyId: "default",
          propertyName: hostData?.hostDisplayName || `${hostData?.firstName}'s Place`,
          propertyType: hostData?.propertyTypesOffered?.[0] || "Property",
          images: hostData?.hostPortfolioImages || [],
          nightlyRateUsd: getNightlyRate(hostData),
          guestCapacity: hostData?.guestCapacity || 2,
          bedCount: hostData?.bedCount || 1,
          cancellationPolicy: hostData?.cancellationPolicy || "MODERATE",
          payLaterAllowed: hostData?.payLaterAllowed,
          description: hostData?.hostAbout
        }];
        
    const taxPct = getTaxPercent(hostData);
    const completedBookings = bookings.filter(b => b.status === "COMPLETED").length;
    const totalRevenue = bookings.filter(b => b.paymentStatus === "COMPLETED" || b.status === "COMPLETED")
      .reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
    const totalPayouts = bookings.filter(b => b.payoutIssued)
      .reduce((sum, b) => sum + (Number(b.payoutAmount) || 0), 0);

    const calculatedAvg = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length) : hostData?.averageRating;

    return (
      <div className="hd-homes">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
          <div>
            <h3 className="hd-homes__title" style={{ fontSize: '32px', background: 'linear-gradient(90deg, #ff385c, #d70466)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>Your Portfolio</h3>
            <p className="hd-homes__subtitle" style={{ fontSize: '16px' }}>Manage and view performance of your hosted homes</p>
          </div>
          {hostData?.superhost && (
            <div style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', padding: '10px 20px', borderRadius: '30px', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(255, 165, 0, 0.3)' }}>
              <span>🎖️</span> Superhost Status Active
            </div>
          )}
        </div>

        {/* Global Earnings summary */}
        <div className="hd-home-listing__earnings" style={{ 
            marginBottom: "32px", 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '16px' 
        }}>
          <div className="hd-earnings-card" style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 8px 24px rgba(30,60,114,0.15)', position: 'relative', overflow: 'hidden' }}>
            <span style={{ fontSize: '32px', position: 'absolute', right: '-5px', bottom: '-5px', opacity: '0.15' }}>💵</span>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <span style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8, marginBottom: '4px' }}>Total Revenue</span>
              <span style={{ fontSize: '28px', fontWeight: '800' }}>${totalRevenue.toLocaleString()}</span>
              <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.9 }}>↑ 12% vs last month</div>
            </div>
          </div>

          <div className="hd-earnings-card hd-earnings-card--green" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 8px 24px rgba(17,153,142,0.15)', position: 'relative', overflow: 'hidden' }}>
            <span style={{ fontSize: '32px', position: 'absolute', right: '-5px', bottom: '-5px', opacity: '0.15' }}>🏦</span>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <span style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8, marginBottom: '4px' }}>Total Payouts</span>
              <span style={{ fontSize: '28px', fontWeight: '800' }}>${totalPayouts.toLocaleString()}</span>
              <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.9 }}>{completedBookings} trips paid</div>
            </div>
          </div>

          <div className="hd-earnings-card hd-earnings-card--blue" style={{ background: 'linear-gradient(135deg, #8A2387 0%, #E94057 50%, #F27121 100%)', color: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 8px 24px rgba(233,64,87,0.15)', position: 'relative', overflow: 'hidden' }}>
            <span style={{ fontSize: '32px', position: 'absolute', right: '-5px', bottom: '-5px', opacity: '0.15' }}>⭐</span>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <span style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8, marginBottom: '4px' }}>Global Rating</span>
              <span style={{ fontSize: '28px', fontWeight: '800' }}>{calculatedAvg ? calculatedAvg.toFixed(2) : 'N/A'}</span>
              <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.9 }}>Across {reviews.length} total reviews</div>
            </div>
          </div>
        </div>

        {properties.map((property, idx) => {
          let images = property.images || [];
          if (!images || images.length === 0 || images[0] === null || images[0] === "") {
              images = [
                  `https://picsum.photos/seed/${property.propertyId || idx}/800/400`
              ];
          }
          // Filter bookings for this property if possible
          const propBookings = bookings.filter(b => b.propertyId === property.propertyId || !b.propertyId);
          const propTotalBookings = propBookings.length;
          const propCompletedBookings = propBookings.filter(b => b.status === "COMPLETED").length;
          const fallbackName = property.propertyName || `${hostData?.firstName}'s Place`;
          const locationStr = [property.area || hostData?.area, hostData?.city, hostData?.country].filter(Boolean).join(", ");

          return (
            <div key={property.propertyId || idx} className="hd-home-listing" style={{ 
                marginBottom: "40px", 
                borderRadius: "24px", 
                overflow: "hidden",
                boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
                border: "1px solid rgba(0,0,0,0.04)"
            }}>
              {/* Image gallery row */}
              <div className="hd-home-listing__gallery" style={{ gridTemplateColumns: '1fr', height: 'auto', background: '#f0f0f0' }}>
                <div className="hd-home-listing__main-img" style={{ height: '350px', borderRadius: '0', position: 'relative' }}>
                  <img 
                      src={images[0]} 
                      alt={fallbackName} 
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }} 
                      onError={(e) => { e.target.onerror = null; e.target.src = `https://picsum.photos/seed/${property.propertyId || 'fallback'}/800/400`; }}
                  />
                  <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '8px' }}>
                     <span className="hd-home-card__type-badge" style={{ background: 'rgba(255,255,255,0.95)', color: '#222', fontSize: '14px', padding: '6px 16px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>{property.propertyType || "Property"}</span>
                     <span className="hd-home-card__type-badge" style={{ background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '14px', padding: '6px 16px', borderRadius: '20px', backdropFilter: 'blur(4px)' }}>ID: {property.propertyId?.substring(0,6) || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Property Info */}
              <div className="hd-home-listing__body" style={{ padding: '32px' }}>
                <div className="hd-home-listing__header" style={{ borderBottom: '1px solid #eee', paddingBottom: '24px', marginBottom: '24px' }}>
                  <div>
                    <h2 className="hd-home-listing__name" style={{ fontSize: '28px', color: '#222', marginBottom: '8px' }}>{fallbackName}</h2>
                    <p className="hd-home-listing__location" style={{ fontSize: '16px', color: '#717171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{color: '#ff385c'}}>📍</span> {locationStr || "Location not set"}
                    </p>
                  </div>
                  <div className="hd-home-listing__rating-box" style={{ background: '#f7f7f9', padding: '12px 20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    {calculatedAvg ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                           <span className="hd-home-listing__rating-star" style={{ fontSize: '24px' }}>★</span>
                           <span className="hd-home-listing__rating-num" style={{ fontSize: '28px', fontWeight: '800' }}>{calculatedAvg.toFixed(2)}</span>
                        </div>
                        <span className="hd-home-listing__rating-count" style={{ color: '#717171', fontSize: '14px' }}>{reviews.length} verified reviews</span>
                      </>
                    ) : (
                      <span className="hd-home-listing__no-rating" style={{ color: '#717171', fontStyle: 'italic' }}>No reviews yet</span>
                    )}
                  </div>
                </div>

                {/* Property Stats Grid */}
                <div className="hd-home-listing__stats">
                  <div className="hd-listing-stat">
                    <span className="hd-listing-stat__icon">💰</span>
                    <div>
                      <span className="hd-listing-stat__value">${property.nightlyRateUsd || 50}</span>
                      <span className="hd-listing-stat__label">/ night</span>
                    </div>
                  </div>
                  <div className="hd-listing-stat">
                    <span className="hd-listing-stat__icon">👥</span>
                    <div>
                      <span className="hd-listing-stat__value">{property.guestCapacity || 2}</span>
                      <span className="hd-listing-stat__label">guests</span>
                    </div>
                  </div>
                  <div className="hd-listing-stat">
                    <span className="hd-listing-stat__icon">🛏️</span>
                    <div>
                      <span className="hd-listing-stat__value">{property.bedCount || 1}</span>
                      <span className="hd-listing-stat__label">beds</span>
                    </div>
                  </div>
                  <div className="hd-listing-stat">
                    <span className="hd-listing-stat__icon">📊</span>
                    <div>
                      <span className="hd-listing-stat__value">{taxPct}%</span>
                      <span className="hd-listing-stat__label">tax</span>
                    </div>
                  </div>
                  <div className="hd-listing-stat">
                    <span className="hd-listing-stat__icon">📋</span>
                    <div>
                      <span className="hd-listing-stat__value">{propTotalBookings}</span>
                      <span className="hd-listing-stat__label">bookings</span>
                    </div>
                  </div>
                  <div className="hd-listing-stat">
                    <span className="hd-listing-stat__icon">✅</span>
                    <div>
                      <span className="hd-listing-stat__value">{propCompletedBookings}</span>
                      <span className="hd-listing-stat__label">completed</span>
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                {(property.amenities || hostData?.offeringHighlights) && (
                  <div className="hd-home-listing__amenities">
                    <h4>What your place offers</h4>
                    <div className="hd-amenities-grid">
                      {(property.amenities || hostData.offeringHighlights).map((h, i) => (
                        <span key={i} className="hd-amenity-tag">✓ {h}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Policies */}
                <div className="hd-home-listing__policies">
                  {(property.payLaterAllowed !== undefined ? property.payLaterAllowed : hostData?.payLaterAllowed) && (
                    <span className="hd-policy-badge hd-policy-badge--blue">💳 Pay Later Available</span>
                  )}
                  <span className="hd-policy-badge">
                    📋 Cancellation: {property.cancellationPolicy || hostData?.cancellationPolicy || "MODERATE"}
                  </span>
                  {hostData?.superhost && (
                    <span className="hd-policy-badge hd-policy-badge--gold">⭐ Superhost</span>
                  )}
                </div>

                {/* About */}
                {(property.description || hostData?.hostAbout) && (
                  <div className="hd-home-listing__about">
                    <h4>About this place</h4>
                    <p>{property.description || hostData.hostAbout}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ─────────── BOOKINGS TAB ─────────── */
  const filteredBookings = statusFilter === "ALL" ? bookings : bookings.filter((b) => b.status === statusFilter);

  const renderBookings = () => (
    <div className="hd-bookings">
      <h3 className="hd-bookings__title">Guest Bookings</h3>
      <p className="hd-bookings__subtitle">View and manage all reservations for your property</p>

      {/* Status filter pills */}
      <div className="hd-bookings__filters">
        <button className={`hd-filter-pill ${statusFilter === "ALL" ? "hd-filter-pill--active" : ""}`} onClick={() => setStatusFilter("ALL")}>
          All ({bookings.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = bookings.filter((b) => b.status === key).length;
          if (count === 0) return null;
          return (
            <button key={key} className={`hd-filter-pill ${statusFilter === key ? "hd-filter-pill--active" : ""}`} onClick={() => setStatusFilter(key)}>
              {cfg.icon} {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Booking cards */}
      {filteredBookings.length === 0 ? (
        <div className="hd-empty">
          <div className="hd-empty__icon">📭</div>
          <h4>No bookings found</h4>
          <p>{statusFilter === "ALL" ? "You haven't received any bookings yet." : `No ${STATUS_CONFIG[statusFilter]?.label.toLowerCase()} bookings.`}</p>
        </div>
      ) : (
        <div className="hd-bookings__list">
          {filteredBookings.map((b) => {
            const guest = guestDetails[b.guestId] || {};
            const status = STATUS_CONFIG[b.status] || STATUS_CONFIG.PENDING;
            const payment = PAYMENT_CONFIG[b.paymentStatus] || PAYMENT_CONFIG.PENDING;
            const nights = Math.max(1, (new Date(b.checkOutDate) - new Date(b.checkInDate)) / (1000 * 60 * 60 * 24));
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkInDate = new Date(b.checkInDate);
            checkInDate.setHours(0, 0, 0, 0);
            
            const canCheckIn = b.status === "CONFIRMED" && today >= checkInDate;
            const canCheckOut = b.status === "CHECKED_IN";
            const canCancel = b.status === "PENDING" || b.status === "CONFIRMED" || b.status === "NOT_PAID_YET";

            return (
              <div key={b.id} className="hd-booking-card">
                <div className="hd-booking-card__top" onClick={() => navigate(`/booking/${b.id}`)}>
                  <div className="hd-booking-card__guest">
                    <div className="hd-booking-card__avatar">
                      {guest.profileImage ? (
                        <img src={guest.profileImage} alt="" />
                      ) : (
                        <span>{guest.firstName?.charAt(0) || "?"}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="hd-booking-card__guest-name">{guest.firstName} {guest.lastName}</h4>
                      <p className="hd-booking-card__guest-email">{guest.email}</p>
                    </div>
                  </div>
                  <div className="hd-booking-card__badges">
                    <span className="hd-status-badge" style={{ color: status.color, background: status.bg }}>
                      {status.icon} {status.label}
                    </span>
                    <span className="hd-status-badge" style={{ color: payment.color, background: payment.bg }}>
                      {payment.label}
                    </span>
                  </div>
                </div>

                {/* Rich detail grid */}
                <div className="hd-booking-card__details" onClick={() => navigate(`/booking/${b.id}`)}>
                  <div className="hd-booking-card__detail">
                    <span className="hd-detail-label">Check-in</span>
                    <span className="hd-detail-value">{new Date(b.checkInDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                  </div>
                  <div className="hd-booking-card__detail">
                    <span className="hd-detail-label">Check-out</span>
                    <span className="hd-detail-value">{new Date(b.checkOutDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                  </div>
                  <div className="hd-booking-card__detail">
                    <span className="hd-detail-label">Duration</span>
                    <span className="hd-detail-value">{nights} night{nights > 1 ? "s" : ""}</span>
                  </div>
                  <div className="hd-booking-card__detail">
                    <span className="hd-detail-label">Total</span>
                    <span className="hd-detail-value hd-detail-value--price">${b.totalPrice}</span>
                  </div>
                  {b.propertyName && (
                    <div className="hd-booking-card__detail">
                      <span className="hd-detail-label">Property</span>
                      <span className="hd-detail-value">{b.propertyName}</span>
                    </div>
                  )}
                  {b.cancellationPolicy && (
                    <div className="hd-booking-card__detail">
                      <span className="hd-detail-label">Cancel Policy</span>
                      <span className="hd-detail-value">{b.cancellationPolicy}</span>
                    </div>
                  )}
                </div>

                {/* Cancellation info */}
                {b.cancellationReason && (
                  <div className="hd-booking-card__cancel-info">
                    <strong>❌ Cancellation:</strong> {b.cancellationReason}
                    {b.cancelledBy && <span className="hd-cancelled-by"> (by {b.cancelledBy})</span>}
                    {b.refundAmount > 0 && <span className="hd-refund-amount"> | Refund: ${b.refundAmount}</span>}
                  </div>
                )}

                {/* Host Action Buttons */}
                <div className="hd-booking-card__actions">
                  {canCheckIn && (
                    <button className="hd-action-btn hd-action-btn--checkin" onClick={(e) => handleCheckIn(b.id, e)} title="Confirm guest check-in">
                      🏠 Confirm Check-In
                    </button>
                  )}
                  {canCheckOut && (
                    <button className="hd-action-btn hd-action-btn--checkout" onClick={(e) => handleCheckOut(b.id, e)} title="Confirm guest check-out">
                      👋 Confirm Check-Out
                    </button>
                  )}
                  {canCancel && (
                    <button className="hd-action-btn hd-action-btn--cancel" onClick={(e) => handleCancelBooking(b.id, e)} title="Cancel this booking">
                      ❌ Cancel Booking
                    </button>
                  )}
                  {b.status === "COMPLETED" && b.payoutIssued && (
                    <div className="hd-payout-badge">
                      💰 Payout: ${b.payoutAmount} ({b.payoutPercentage || 80}%)
                    </div>
                  )}
                  {b.status === "COMPLETED" && !b.payoutIssued && (
                    <div className="hd-payout-badge hd-payout-badge--pending">
                      ⏳ Awaiting Payout from Admin
                    </div>
                  )}
                </div>

                <div className="hd-booking-card__footer" onClick={() => navigate(`/booking/${b.id}`)}>
                  <span className="hd-booking-card__id">Booking #{b.id?.substring(0, 8)}</span>
                  <span className="hd-booking-card__date-created">
                    Created: {new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="hd-booking-card__arrow">→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ─────────── REVIEWS TAB (NOW A SIDEBAR) ─────────── */
  const renderReviews = () => {
    const hostData = freshHostData || user;
    return (
      <div className="hd-reviews-sidebar" style={{ position: 'sticky', top: '100px', height: 'max-content' }}>
        <h3 className="hd-homes__title" style={{ fontSize: '24px', marginBottom: '8px' }}>Guest Reviews</h3>
        <p className="hd-homes__subtitle" style={{ fontSize: '14px', marginBottom: '20px' }}>What guests say about you</p>
        <div style={{ 
            background: "white", 
            padding: "24px", 
            borderRadius: "16px", 
            boxShadow: "0 10px 40px rgba(0,0,0,.08)",
            border: "1px solid rgba(0,0,0,0.04)"
        }}>
          {reviews.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '40px 0', color: '#717171' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>💬</div>
                <h4>No reviews yet</h4>
                <p style={{ fontSize: '14px' }}>When guests leave reviews, they will appear here.</p>
             </div>
          ) : (
            <div style={{ maxHeight: '800px', overflowY: 'auto', paddingRight: '10px' }}>
              <ReviewsSection 
                reviews={reviews} 
                averageRating={hostData?.averageRating || 0}
                reviewCount={hostData?.reviewCount || reviews.length}
                categoryScores={{
                  cleanliness: hostData?.cleanlinessRating || 4.8,
                  accuracy: hostData?.accuracyRating || 4.7,
                  checkIn: hostData?.checkInRating || 4.9,
                  communication: hostData?.communicationRating || 4.8,
                  location: hostData?.locationRating || 4.6,
                  value: hostData?.valueRating || 4.7
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!user || user.role !== "HOST") {
    return (
      <div className="hd-page">
        <div className="hd-container">
          <h2>Access Denied</h2>
          <p>Only hosts can access the dashboard.</p>
          <button className="hd-btn hd-btn--primary" onClick={() => navigate("/")}>Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="hd-page">
      <div className="hd-container">
        {/* Dashboard header */}
        <div className="hd-header">
          <div className="hd-header__info">
            <h1 className="hd-header__title">Host Dashboard</h1>
            <p className="hd-header__welcome">Welcome back, {user.firstName}! 👋</p>
          </div>
          <div className="hd-header__stats-row">
            <div className="hd-stat-card">
              <span className="hd-stat-card__number">{bookings.length}</span>
              <span className="hd-stat-card__label">Total Bookings</span>
            </div>
            <div className="hd-stat-card">
              <span className="hd-stat-card__number">{bookings.filter((b) => b.status === "CONFIRMED").length}</span>
              <span className="hd-stat-card__label">Confirmed</span>
            </div>
            <div className="hd-stat-card">
              <span className="hd-stat-card__number">{bookings.filter((b) => b.status === "CHECKED_IN").length}</span>
              <span className="hd-stat-card__label">Checked In</span>
            </div>
            <div className="hd-stat-card">
              <span className="hd-stat-card__number">${bookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0).toFixed(0)}</span>
              <span className="hd-stat-card__label">Total Revenue</span>
            </div>
          </div>
        </div>

        {/* Split UI Layout */}
        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
          
          {/* Main Dashboard Column */}
          <div style={{ flex: '1 1 0%', minWidth: 0 }}>
            {/* Tab navigation */}
            <div className="hd-tabs" style={{ marginBottom: '30px', borderBottom: '2px solid #ebebeb' }}>
              <button className={`hd-tab ${activeTab === "calendar" ? "hd-tab--active" : ""}`} onClick={() => setActiveTab("calendar")}>
                📅 Calendar
              </button>
              <button className={`hd-tab ${activeTab === "homes" ? "hd-tab--active" : ""}`} onClick={() => setActiveTab("homes")}>
                🏡 Hosted Homes
              </button>
              <button className={`hd-tab ${activeTab === "bookings" ? "hd-tab--active" : ""}`} onClick={() => setActiveTab("bookings")}>
                📋 Bookings
              </button>
            </div>

            {/* Tab content */}
            <div className="hd-tab-content">
              {loading ? (
                <div className="hd-loading">
                  <div className="spinner" />
                  <p>Loading dashboard...</p>
                </div>
              ) : (
                <>
                  {activeTab === "calendar" && renderCalendar()}
                  {activeTab === "homes" && renderHostedHomes()}
                  {activeTab === "bookings" && renderBookings()}
                </>
              )}
            </div>
          </div>

          {/* Right Sidebar Reviews Column */}
          <aside style={{ width: '400px', flexShrink: 0, display: window.innerWidth < 1000 ? 'none' : 'block' }}>
            {loading ? (
                <div className="hd-loading" style={{ height: '300px' }}>
                  <div className="spinner" style={{ width: '30px', height: '30px' }} />
                </div>
            ) : renderReviews()}
          </aside>
          
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HostDashboardPage;
