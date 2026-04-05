import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import {
  cancelBooking,
  confirmBooking,
  getAllBookings,
  issuePayout,
  refundBooking,
  approvePayment,
} from "../services/bookingService";
import api from "../utils/axiosConfig";
import "./AdminBookingsPage.css";

const STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "#856404", bg: "#ffeeba", icon: "⏳" },
  CONFIRMED: {
    label: "Confirmed",
    color: "#155724",
    bg: "#d4edda",
    icon: "✅",
  },
  NOT_PAID_YET: {
    label: "Not Paid Yet",
    color: "#856404",
    bg: "#fff3cd",
    icon: "💳",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "#721c24",
    bg: "#f8d7da",
    icon: "❌",
  },
  CHECKED_IN: {
    label: "Checked In",
    color: "#004085",
    bg: "#cce5ff",
    icon: "🏨",
  },
  COMPLETED: {
    label: "Completed",
    color: "#0c5460",
    bg: "#d1ecf1",
    icon: "🎉",
  },
  REFUNDED: { label: "Refunded", color: "#6c757d", bg: "#e2e3e5", icon: "💸" },
};

const PAYMENT_CONFIG = {
  PENDING: { label: "Payment Pending", color: "#856404", bg: "#ffeeba" },
  COMPLETED: { label: "Paid", color: "#155724", bg: "#d4edda" },
  PAY_LATER: { label: "Pay Later", color: "#0c5460", bg: "#d1ecf1" },
  FAILED: { label: "Failed", color: "#721c24", bg: "#f8d7da" },
  REFUNDED: { label: "Refunded", color: "#383d41", bg: "#e2e3e5" },
};

const AdminBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [userCache, setUserCache] = useState({});

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await getAllBookings();
      // Sort by newest first
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBookings(data);

      // Fetch user details for display
      const allIds = [
        ...new Set([
          ...data.map((b) => b.guestId),
          ...data.map((b) => b.hostId),
        ]),
      ];
      const cache = {};
      await Promise.all(
        allIds.map(async (id) => {
          if (!id) return;
          try {
            const res = await api.get(`/api/users/${id}`);
            cache[id] = res.data;
          } catch {
            cache[id] = { firstName: "Unknown", lastName: "" };
          }
        }),
      );
      setUserCache(cache);
    } catch (err) {
      console.error("Failed to fetch bookings", err);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, bookingId, actionName) => {
    if (!window.confirm(`Are you sure you want to ${actionName} this booking?`))
      return;
    try {
      await action(bookingId);
      toast.success(`Booking ${actionName}d successfully!`);
      fetchBookings();
    } catch (err) {
      toast.error(`Failed to ${actionName} booking`);
    }
  };

  const getUser = (id) => userCache[id] || {};

  const filteredBookings =
    filter === "ALL" ? bookings : bookings.filter((b) => b.status === filter);

  const getAvailableActions = (booking) => {
    const actions = [];
    
    // Payment approval action (if payment completed but not yet approved)
    if (booking.paymentStatus === "COMPLETED" && booking.status === "NOT_PAID_YET") {
      actions.push({
        label: "Approve Payment ✅",
        fn: async () => {
          if (!window.confirm("Approve this payment and confirm the booking?")) return;
          try {
            await approvePayment(booking.id);
            toast.success("Payment approved! Booking confirmed.");
            fetchBookings();
          } catch (err) {
            toast.error("Failed to approve payment");
          }
        },
        className: "admin-btn--approve",
      });
    }
    
    switch (booking.status) {
      case "PENDING":
        actions.push({
          label: "Approve",
          fn: () => handleAction(confirmBooking, booking.id, "confirm"),
          className: "admin-btn--approve",
        });
        actions.push({
          label: "Reject",
          fn: () => handleAction(cancelBooking, booking.id, "cancel"),
          className: "admin-btn--reject",
        });
        break;
      case "NOT_PAID_YET":
        // Guest needs to pay - no admin action needed unless cancelling
        actions.push({
          label: "Cancel",
          fn: () => handleAction(cancelBooking, booking.id, "cancel"),
          className: "admin-btn--reject",
        });
        break;
      case "CONFIRMED":
        // Host will handle check-in, but admin can cancel if needed
        actions.push({
          label: "Cancel",
          fn: () => handleAction(cancelBooking, booking.id, "cancel"),
          className: "admin-btn--reject",
        });
        break;
      case "CHECKED_IN":
        // Host will handle check-out
        break;
      case "CANCELLED":
        if (
          booking.paymentStatus !== "REFUNDED" &&
          booking.paymentStatus !== "PAY_LATER"
        ) {
          actions.push({
            label: "Issue Refund 💸",
            fn: async () => {
              if (
                !window.confirm(
                  `Issue refund for this cancelled booking? Amount will be based on cancellation policy.`,
                )
              )
                return;
              try {
                await refundBooking(booking.id);
                toast.success("Refund issued! Guest has been notified.");
                fetchBookings();
              } catch (err) {
                toast.error("Failed to issue refund");
              }
            },
            className: "admin-btn--refund",
          });
        }
        break;
      case "COMPLETED":
        if (!booking.payoutIssued) {
          actions.push({
            label: "Issue Payout 💰",
            fn: async () => {
              if (
                !window.confirm(
                  `Issue payout to host for this completed booking?`,
                )
              )
                return;
              try {
                const updated = await issuePayout(booking.id);
                const payoutAmt =
                  updated.payoutAmount ||
                  Math.round(
                    (booking.totalPrice || 0) *
                      ((booking.payoutPercentage || 80) / 100),
                  );
                toast.success(
                  `Payout of $${payoutAmt} issued to host! Host has been notified.`,
                );
                fetchBookings();
              } catch (err) {
                toast.error(
                  err.response?.data?.message || "Failed to issue payout",
                );
              }
            },
            className: "admin-btn--complete",
          });
        } else {
          // Show payout info if already issued
          actions.push({
            label: `✓ Paid Out $${booking.payoutAmount || ""}`,
            fn: () => {},
            className: "admin-btn--payout-done",
          });
        }
        break;
      default:
        break;
    }
    return actions;
  };

  return (
    <div className="admin-bookings-page">
      <div className="admin-bookings-container">
        <div className="admin-bookings-header">
          <h1>Booking Management</h1>
          <p className="admin-bookings-subtitle">
            Manage all reservations and their statuses
          </p>
        </div>

        {/* Stats Cards */}
        <div className="admin-stats">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = bookings.filter((b) => b.status === key).length;
            return (
              <div
                key={key}
                className={`admin-stat-card ${filter === key ? "admin-stat-card--active" : ""}`}
                onClick={() => setFilter(filter === key ? "ALL" : key)}
                style={{ borderColor: count > 0 ? cfg.bg : undefined }}
              >
                <span className="admin-stat-icon">{cfg.icon}</span>
                <span className="admin-stat-count">{count}</span>
                <span className="admin-stat-label">{cfg.label}</span>
              </div>
            );
          })}
        </div>

        {/* Filter Pills */}
        <div className="admin-filters">
          <button
            className={`admin-filter-pill ${filter === "ALL" ? "admin-filter-pill--active" : ""}`}
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
                className={`admin-filter-pill ${filter === key ? "admin-filter-pill--active" : ""}`}
                onClick={() => setFilter(key)}
              >
                {cfg.icon} {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Bookings Table */}
        {loading ? (
          <div className="admin-loading">
            <div className="spinner" />
            <p>Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="admin-empty">
            <h3>No bookings found</h3>
            <p>
              {filter === "ALL"
                ? "No bookings have been made yet."
                : `No ${STATUS_CONFIG[filter]?.label.toLowerCase()} bookings.`}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Guest</th>
                  <th>Host / Property</th>
                  <th>Dates</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Payout</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const guest = getUser(booking.guestId);
                  const host = getUser(booking.hostId);
                  const status =
                    STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
                  const payment =
                    PAYMENT_CONFIG[booking.paymentStatus] ||
                    PAYMENT_CONFIG.PENDING;
                  const actions = getAvailableActions(booking);

                  return (
                    <tr key={booking.id}>
                      <td className="admin-td-id">
                        {booking.id?.substring(0, 8)}...
                      </td>
                      <td>
                        <div className="admin-user-cell">
                          <strong>
                            {guest.firstName} {guest.lastName}
                          </strong>
                          <small>{booking.guestId?.substring(0, 8)}...</small>
                        </div>
                      </td>
                      <td>
                        <div className="admin-user-cell">
                          <strong>
                            {host.firstName} {host.lastName}
                          </strong>
                          <small>{host.hostDisplayName || ""}</small>
                          {booking.propertyName && <small style={{color:'#6b7280'}}>🏡 {booking.propertyName}</small>}
                          {booking.cancellationPolicy && <small style={{color:'#9ca3af'}}>{booking.cancellationPolicy} policy</small>}
                        </div>
                      </td>
                      <td>
                        <div className="admin-dates-cell">
                          <span>
                            {booking.checkInDate
                              ? new Date(
                                  booking.checkInDate,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </span>
                          <span className="admin-date-arrow">→</span>
                          <span>
                            {booking.checkOutDate
                              ? new Date(
                                  booking.checkOutDate,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="admin-td-price">${booking.totalPrice}</td>
                      <td>
                        <span
                          className="admin-badge"
                          style={{
                            color: status.color,
                            background: status.bg,
                          }}
                        >
                          {status.icon} {status.label}
                        </span>
                        {booking.cancellationReason && (
                          <div
                            className="admin-cancellation-reason"
                            title={booking.cancellationReason}
                          >
                            💬{" "}
                            {booking.cancellationReason.length > 40
                              ? booking.cancellationReason.substring(0, 40) +
                                "..."
                              : booking.cancellationReason}
                            {booking.cancelledBy && <span style={{color:'#9ca3af', marginLeft:4}}>(by {booking.cancelledBy})</span>}
                          </div>
                        )}
                        {booking.refundAmount > 0 && (
                          <div style={{fontSize:12, color:'#059669', marginTop:2}}>Refund: ${booking.refundAmount}</div>
                        )}
                      </td>
                      <td>
                        <span
                          className="admin-badge"
                          style={{
                            color: payment.color,
                            background: payment.bg,
                          }}
                        >
                          {payment.label}
                        </span>
                      </td>
                      <td>
                        {booking.payoutIssued ? (
                          <span
                            style={{
                              color: "#2e7d32",
                              fontWeight: 600,
                              fontSize: 14,
                            }}
                          >
                            ✓ ${booking.payoutAmount || "—"}
                          </span>
                        ) : booking.status === "COMPLETED" ? (
                          <span style={{ color: "#b45309", fontSize: 13 }}>
                            Pending
                          </span>
                        ) : (
                          <span style={{ color: "#ccc", fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td>
                        <div className="admin-actions">
                          {actions.map((action, i) => (
                            <button
                              key={i}
                              className={`admin-btn ${action.className}`}
                              onClick={action.fn}
                            >
                              {action.label}
                            </button>
                          ))}
                          {actions.length === 0 && (
                            <span className="admin-no-action">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AdminBookingsPage;
