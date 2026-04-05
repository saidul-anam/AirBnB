import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/axiosConfig";
import { createBooking } from "../services/bookingService";
import {
  allowsPayLater,
  getNightlyRate,
  getPrimaryHostedProperty,
  getTaxPercent,
} from "../utils/hostUtils";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import "./ReservationPage.css";

const ReservationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const hostId = searchParams.get("hostId");
  const initialCheckin = searchParams.get("checkin") || "";
  const initialCheckout = searchParams.get("checkout") || "";
  const initialGuests = parseInt(searchParams.get("guests") || "1", 10);

  const [host, setHost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reservation form state
  const [checkIn, setCheckIn] = useState(initialCheckin);
  const [checkOut, setCheckOut] = useState(initialCheckout);
  const [guests, setGuests] = useState(initialGuests);
  const [payLater, setPayLater] = useState(false);

  // Payment card state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");

  useEffect(() => {
    if (!hostId) {
      navigate("/");
      return;
    }
    const fetchHost = async () => {
      try {
        const res = await api.get(`/api/users/${hostId}`);
        setHost(res.data);
        // Auto-enable payLater if host allows it
        if (allowsPayLater(res.data)) {
          // Don't auto-select, just allow the option
        }
      } catch (err) {
        console.error("Failed to load host", err);
        toast.error("Failed to load listing details");
      } finally {
        setLoading(false);
      }
    };
    fetchHost();
  }, [hostId, navigate]);

  const nightlyRate = getNightlyRate(host);
  const taxPct = getTaxPercent(host);
  const primaryProperty = getPrimaryHostedProperty(host);
  const payLaterAvailable = allowsPayLater(host);
  const guestCapacity =
    host?.guestCapacity || primaryProperty?.guestCapacity || 4;
  const nights =
    checkIn && checkOut
      ? Math.max(
          0,
          (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24),
        )
      : 0;
  const subtotal = nights * nightlyRate;
  const taxAmount = Math.round(subtotal * (taxPct / 100));
  const serviceFee = Math.round(subtotal * 0.12);
  const totalPrice = subtotal + taxAmount + serviceFee;

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.warning("Please log in to make a reservation");
      navigate("/login");
      return;
    }

    if (!checkIn || !checkOut) {
      toast.error("Please select check-in and check-out dates");
      return;
    }
    if (nights < 1) {
      toast.error("Check-out must be after check-in");
      return;
    }

    if (!payLater && (!cardNumber || !cardExpiry || !cardCvv)) {
      toast.error("Please fill in your payment details");
      return;
    }

    setSubmitting(true);
    try {
      const bookingData = {
        hostId: hostId,
        guestId: user.userId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        totalPrice: totalPrice,
        propertyName: host?.hostDisplayName || "Property",
        cancellationPolicy: host?.cancellationPolicy || "MODERATE",
        payoutPercentage: host?.payoutPercentage || 80.0,
        status: "PENDING",
        paymentStatus: payLater ? "PAY_LATER" : "COMPLETED",
      };

      await createBooking(bookingData);

      if (payLater) {
        toast.success(
          "Reservation sent! You'll pay later. Awaiting admin approval.",
        );
        navigate("/my-bookings");
      } else {
        // Simulate payment processing
        toast.success(
          "Reservation submitted with payment! Awaiting admin approval.",
        );
        navigate("/my-bookings");
      }
    } catch (err) {
      console.error("Booking failed:", err);
      toast.error(
        err.response?.data?.message ||
          "Failed to create reservation. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="reservation-page">
        <div className="reservation-container">
          <div className="reservation-loading">
            <div className="spinner" />
            <p>Loading reservation details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!host) {
    return (
      <div className="reservation-page">
        <div className="reservation-container">
          <h2>Listing not found</h2>
          <button
            className="res-btn res-btn--secondary"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reservation-page">
      <div className="reservation-container">
        <button className="res-back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1 className="reservation-title">Confirm and reserve</h1>

        <div className="reservation-grid">
          {/* ─── Left Column: Form ─── */}
          <div className="reservation-form">
            {/* Trip Details */}
            <section className="res-section">
              <h2>Your trip</h2>
              <div className="res-trip-row">
                <div className="res-trip-field">
                  <div className="res-trip-label">Dates</div>
                  <div className="res-date-inputs">
                    <div className="res-date-group">
                      <label>Check-in</label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="res-date-group">
                      <label>Check-out</label>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        min={checkIn || new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="res-trip-row">
                <div className="res-trip-field">
                  <div className="res-trip-label">Guests</div>
                  <select
                    className="res-guest-select"
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value, 10))}
                  >
                    {Array.from({ length: guestCapacity }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} guest{i > 0 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <div className="res-divider" />

            {/* Payment Method */}
            <section className="res-section">
              <h2>Payment</h2>

              {payLaterAvailable ? (
                <>
                  <div className="res-pay-info-badge">
                    ✨ This host offers flexible payment options
                  </div>
                  <div className="res-pay-option">
                    <label className="res-radio-label">
                      <input
                        type="radio"
                        name="paymentType"
                        checked={!payLater}
                        onChange={() => setPayLater(false)}
                      />
                      <div>
                        <strong>💳 Pay now</strong>
                        <p>
                          Pay the total amount now (${totalPrice.toFixed(0)})
                        </p>
                      </div>
                    </label>
                    <label className="res-radio-label">
                      <input
                        type="radio"
                        name="paymentType"
                        checked={payLater}
                        onChange={() => setPayLater(true)}
                      />
                      <div>
                        <strong>⏰ Pay later</strong>
                        <p>
                          Reserve now, pay after admin confirms your booking. No
                          card required now!
                        </p>
                      </div>
                    </label>
                  </div>
                </>
              ) : (
                <div className="res-pay-note-box">
                  <span className="res-pay-note-icon">💳</span>
                  <div>
                    <strong>Immediate payment required</strong>
                    <p>
                      This host requires full payment at the time of booking.
                    </p>
                  </div>
                </div>
              )}

              {!payLater && (
                <div className="res-card-form">
                  <div className="res-card-header">
                    <span>💳</span>
                    <span>Credit or debit card</span>
                  </div>
                  <div className="res-card-fields">
                    <input
                      type="text"
                      placeholder="Card number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="res-input res-input--full"
                      maxLength={19}
                    />
                    <div className="res-card-row">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="res-input"
                        maxLength={5}
                      />
                      <input
                        type="text"
                        placeholder="CVV"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="res-input"
                        maxLength={4}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Name on card"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="res-input res-input--full"
                    />
                  </div>
                </div>
              )}
            </section>

            <div className="res-divider" />

            {/* Cancellation Policy */}
            <section className="res-section">
              <h2>Cancellation policy</h2>
              <p className="res-policy">
                Free cancellation before check-in. Cancel before check-in for a
                full refund. After that, the host's cancellation policy applies.
              </p>
            </section>

            <div className="res-divider" />

            {/* Ground Rules */}
            <section className="res-section">
              <h2>Ground rules</h2>
              <p className="res-policy">
                We ask every guest to remember a few simple things about what
                makes a great guest.
              </p>
              <ul className="res-rules-list">
                <li>Follow the house rules</li>
                <li>Treat the host's home like your own</li>
                <li>Communicate with the host if anything comes up</li>
              </ul>
            </section>

            <div className="res-divider" />

            {/* Submit */}
            <div className="res-submit-area">
              <p className="res-agree-text">
                By selecting the button below, I agree to the Host's House
                Rules, Ground rules for guests, and that Airbnb can charge my
                payment method.
              </p>
              <button
                className="res-btn res-btn--primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? "Processing..."
                  : payLater
                    ? "Request to reserve"
                    : `Confirm and pay · $${totalPrice.toFixed(0)}`}
              </button>
            </div>
          </div>

          {/* ─── Right Column: Summary Card ─── */}
          <div className="reservation-summary">
            <div className="res-summary-card">
              <div className="res-summary-header">
                <img
                  src={host.hostPortfolioImages?.[0] || host.profileImage}
                  alt={host.hostDisplayName}
                  className="res-summary-img"
                />
                <div className="res-summary-info">
                  <div className="res-summary-type">
                    {host.propertyTypesOffered?.[0] || "Entire place"}
                  </div>
                  <div className="res-summary-name">
                    {host.hostDisplayName || `${host.firstName}'s place`}
                  </div>
                  {host.averageRating && (
                    <div className="res-summary-rating">
                      ★ {host.averageRating.toFixed(2)} ({host.reviewCount || 0}{" "}
                      reviews)
                    </div>
                  )}
                </div>
              </div>

              <div className="res-summary-divider" />

              <h3>Price details</h3>
              {nights > 0 ? (
                <div className="res-price-breakdown">
                  <div className="res-price-row">
                    <span>
                      ${Math.round(nightlyRate)} × {nights} night
                      {nights > 1 ? "s" : ""}
                    </span>
                    <span>${Math.round(subtotal)}</span>
                  </div>
                  <div className="res-price-row">
                    <span>Tax ({taxPct}%)</span>
                    <span>${taxAmount}</span>
                  </div>
                  <div className="res-price-row">
                    <span>Service fee</span>
                    <span>${serviceFee}</span>
                  </div>
                  <div className="res-price-row res-price-row--total">
                    <span>Total ({payLater ? "pay later" : "pay now"})</span>
                    <span>${totalPrice.toFixed(0)}</span>
                  </div>
                </div>
              ) : (
                <p className="res-no-dates">
                  Select dates to see price breakdown
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ReservationPage;
