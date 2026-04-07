import React from "react";
import "./BookingTimeline.css";

const BookingTimeline = ({ history, booking }) => {
  if (!history || history.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No history available</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    const icons = {
      PENDING: "⏳",
      NOT_PAID_YET: "💳",
      CONFIRMED: "✅",
      CHECKED_IN: "🏨",
      COMPLETED: "🎉",
      CANCELLED: "❌",
      REFUNDED: "💸",
    };
    return icons[status] || "📝";
  };

  const getRoleColor = (role) => {
    const colors = {
      GUEST: "#FF385C",
      HOST: "#00A699",
      ADMIN: "#484848",
      SYSTEM: "#767676",
    };
    return colors[role] || "#767676";
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="booking-timeline">
      <h3 className="timeline-title">Booking History & Status Tracking</h3>
      <div className="timeline-container">
        {history.map((entry, index) => (
          <div key={index} className="timeline-item">
            <div className="timeline-marker">
              <div
                className="timeline-dot"
                style={{ borderColor: getRoleColor(entry.changedByRole) }}
              >
                <span className="timeline-icon">
                  {getStatusIcon(entry.newStatus)}
                </span>
              </div>
              {index < history.length - 1 && <div className="timeline-line" />}
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <h4 className="timeline-action">{entry.action}</h4>
                <span className="timeline-date">{formatDate(entry.timestamp)}</span>
              </div>
              <div className="timeline-details">
                {entry.previousStatus && (
                  <div className="timeline-status-change">
                    <span className="status-badge status-old">
                      {getStatusIcon(entry.previousStatus)} {entry.previousStatus}
                    </span>
                    <span className="status-arrow">→</span>
                    <span className="status-badge status-new">
                      {getStatusIcon(entry.newStatus)} {entry.newStatus}
                    </span>
                  </div>
                )}
                {!entry.previousStatus && (
                  <div className="timeline-status-change">
                    <span className="status-badge status-new">
                      {getStatusIcon(entry.newStatus)} {entry.newStatus}
                    </span>
                  </div>
                )}
                {entry.notes && (
                  <p className="timeline-notes">{entry.notes}</p>
                )}
                <div className="timeline-meta">
                  <span
                    className="timeline-role"
                    style={{ color: getRoleColor(entry.changedByRole) }}
                  >
                    By: {entry.changedByRole}
                  </span>
                  {entry.paymentStatus && (
                    <span className="timeline-payment">
                      Payment: {entry.paymentStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Current Status Summary */}
      <div className="timeline-summary">
        <div className="summary-card">
          <h4>Current Status</h4>
          <div className="summary-status">
            <span className="summary-icon">{getStatusIcon(booking.status)}</span>
            <span className="summary-label">{booking.status}</span>
          </div>
        </div>
        <div className="summary-card">
          <h4>Payment Status</h4>
          <div className="summary-status">
            <span className="summary-label">{booking.paymentStatus}</span>
          </div>
        </div>
        {booking.actualCheckInTime && (
          <div className="summary-card">
            <h4>Checked In</h4>
            <div className="summary-status">
              <span className="summary-label">
                {formatDate(booking.actualCheckInTime)}
              </span>
            </div>
          </div>
        )}
        {booking.actualCheckOutTime && (
          <div className="summary-card">
            <h4>Checked Out</h4>
            <div className="summary-status">
              <span className="summary-label">
                {formatDate(booking.actualCheckOutTime)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingTimeline;
