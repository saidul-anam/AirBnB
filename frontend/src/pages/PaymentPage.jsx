import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBooking, processPayment } from "../services/bookingService";
import api from "../utils/axiosConfig";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import "./PaymentPage.css";

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState(null);
  const [host, setHost] = useState(null);
  const [loading, setLoading] = useState(true);

  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const b = await getBooking(bookingId);
        setBooking(b);
        if (b?.paymentStatus === "COMPLETED") {
          toast.info("This booking is already paid.");
          navigate("/my-trips");
          return;
        }
        try {
          const res = await api.get(`/api/users/${b.hostId}`);
          setHost(res.data);
        } catch {
          setHost(null);
        }
      } catch (err) {
        console.error("Failed to load booking", err);
        toast.error("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [bookingId, navigate]);

  const formatCardNumber = (value) => {
    return value
      .replace(/\D/g, "")
      .substring(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  };

  const handlePay = async () => {
    if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      toast.error("Please fill in all payment details");
      return;
    }
    if (cardNumber.replace(/\s/g, "").length < 16) {
      toast.error("Please enter a valid 16-digit card number");
      return;
    }
    if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) {
      toast.error("Please enter expiry as MM/YY");
      return;
    }
    if (cardCvv.length < 3) {
      toast.error("Please enter a valid CVV");
      return;
    }
    setProcessing(true);
    try {
      await processPayment(bookingId, "CARD");
      toast.success("🎉 Payment Successful! Awaiting admin approval for final confirmation.");
      setTimeout(() => navigate("/my-trips"), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="pp-page">
        <div className="pp-loading">
          <div className="pp-spinner" />
          <p>Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="pp-page">
        <div className="pp-container">
          <h2>Booking not found</h2>
          <button className="pp-btn pp-btn-primary" onClick={() => navigate("/my-trips")}>
            Go to My Trips
          </button>
        </div>
      </div>
    );
  }

  const nights =
    booking?.checkInDate && booking?.checkOutDate
      ? Math.max(
          1,
          (new Date(booking.checkOutDate) - new Date(booking.checkInDate)) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  return (
    <div className="pp-page">
      <div className="pp-container">
        {/* Back btn */}
        <button className="pp-back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="pp-grid">
          {/* Left: Payment Form */}
          <div className="pp-form-section">
            <h1 className="pp-title">Complete your payment</h1>
            <p className="pp-subtitle">
              {booking?.status === "CONFIRMED"
                ? "Your booking is confirmed — complete payment now to finalize your reservation."
                : "You chose to pay later — complete payment now to secure your booking."}
            </p>

            <div className="pp-card-form">
              <h3 className="pp-form-section-label">💳 Credit or debit card</h3>

              <div className="pp-field">
                <label>Card Number</label>
                <input
                  id="card-number"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  className="pp-input"
                />
              </div>

              <div className="pp-field-row">
                <div className="pp-field">
                  <label>Expiry Date</label>
                  <input
                    id="card-expiry"
                    type="text"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "").substring(0, 4);
                      if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
                      setCardExpiry(val);
                    }}
                    maxLength={5}
                    className="pp-input"
                  />
                </div>
                <div className="pp-field">
                  <label>CVV</label>
                  <input
                    id="card-cvv"
                    type="text"
                    placeholder="•••"
                    value={cardCvv}
                    onChange={(e) =>
                      setCardCvv(e.target.value.replace(/\D/g, "").substring(0, 4))
                    }
                    maxLength={4}
                    className="pp-input"
                  />
                </div>
              </div>

              <div className="pp-field">
                <label>Name on Card</label>
                <input
                  id="card-name"
                  type="text"
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="pp-input"
                />
              </div>
            </div>

            <button
              id="pay-now-btn"
              className={`pp-pay-btn ${processing ? "pp-pay-btn--loading" : ""}`}
              onClick={handlePay}
              disabled={processing}
            >
              {processing ? (
                <>
                  <div className="pp-btn-spinner" />
                  Processing...
                </>
              ) : (
                `Pay $${booking?.totalPrice || "—"}`
              )}
            </button>

            <div className="pp-security-note">
              <span>🔒</span>
              <span>Your payment is secured with 256-bit SSL encryption</span>
            </div>
          </div>

          {/* Right: Booking Summary */}
          <div className="pp-summary-section">
            <div className="pp-summary-card">
              <h3 className="pp-summary-title">Booking Summary</h3>

              {host?.hostPortfolioImages?.[0] && (
                <img
                  src={host.hostPortfolioImages[0]}
                  alt="Property"
                  className="pp-summary-img"
                />
              )}

              <div className="pp-summary-host">
                <strong>{host?.hostDisplayName || "Host Property"}</strong>
                <p>
                  📍 {host?.area || host?.district || host?.city},{" "}
                  {host?.country || ""}
                </p>
                {host?.propertyTypesOffered?.[0] && (
                  <span className="pp-prop-type">
                    {host.propertyTypesOffered[0]}
                  </span>
                )}
              </div>

              <div className="pp-summary-divider" />

              <div className="pp-summary-dates">
                <div className="pp-summary-row">
                  <span>Check-in</span>
                  <span>
                    {booking.checkInDate
                      ? new Date(booking.checkInDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                <div className="pp-summary-row">
                  <span>Check-out</span>
                  <span>
                    {booking.checkOutDate
                      ? new Date(booking.checkOutDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                <div className="pp-summary-row">
                  <span>Duration</span>
                  <span>
                    {nights} night{nights !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="pp-summary-divider" />

              <div className="pp-summary-total">
                <span>Total due</span>
                <strong>${booking.totalPrice}</strong>
              </div>

              <div className="pp-cancellation-note">
                <strong>Cancellation policy:</strong>{" "}
                {booking.cancellationPolicy === "FLEXIBLE"
                  ? "Full refund up to 24 hours before check-in"
                  : booking.cancellationPolicy === "STRICT"
                  ? "50% refund if cancelled 7+ days before check-in"
                  : "Full refund if cancelled 5+ days before check-in"}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentPage;
