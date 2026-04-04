import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import authService from "../services/authService";
import Footer from "../components/Footer";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

const formatLocation = (request) =>
  [
    request.street,
    request.area,
    request.village,
    request.district,
    request.division,
    request.city,
    request.country,
  ]
    .filter(Boolean)
    .join(", ");

const AdminVerificationPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState("");
  const [decisionNotes, setDecisionNotes] = useState({});

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await authService.getVerificationRequests();
      setRequests(data);
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to load verification requests.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleDecision = async (request, action) => {
    const requestKey = request.notificationId || request.userId;
    setActingOn(requestKey);
    const note = decisionNotes[requestKey] || "";
    try {
      if (action === "approve") {
        await authService.approveVerificationRequest(request.userId, {
          notificationId: request.notificationId,
          note,
        });
        toast.success("Verification approved.");
      } else {
        await authService.rejectVerificationRequest(request.userId, {
          notificationId: request.notificationId,
          note,
        });
        toast.info("Verification rejected.");
      }
      setRequests((prev) =>
        prev.filter(
          (item) => (item.notificationId || item.userId) !== requestKey,
        ),
      );
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to update verification status.",
      );
    } finally {
      setActingOn("");
    }
  };

  return (
    <div className="page-wrapper">
      <section className="page-content">
        <div
          className="container"
          style={{ paddingTop: "96px", paddingBottom: "64px" }}
        >
          <div className="card animate-fade-in-up">
            <div className="admin-page__header">
              <div>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
                  Admin verification queue
                </h1>
                <p>
                  Review guest and host verification requests before granting
                  booking or hosting eligibility.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={loadRequests}
                disabled={loading}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="admin-page__loading">
                <span className="spinner spinner-dark" />
              </div>
            ) : requests.length === 0 ? (
              <div
                className="alert alert-success"
                style={{ marginTop: "1rem" }}
              >
                <span>No pending verification requests right now.</span>
              </div>
            ) : (
              <div className="admin-page__grid">
                {requests.map((request) => (
                  <article
                    key={request.notificationId || request.userId}
                    className="admin-request-card"
                  >
                    <div className="admin-request-card__top">
                      <div className="admin-request-card__identity">
                        {request.profileImage ? (
                          <img
                            src={request.profileImage}
                            alt={`${request.firstName} ${request.lastName}`}
                            className="admin-request-card__avatar"
                          />
                        ) : (
                          <div className="admin-request-card__avatar admin-request-card__avatar--placeholder">
                            {request.firstName?.[0]}
                            {request.lastName?.[0]}
                          </div>
                        )}
                        <div>
                          <h2>
                            {request.firstName} {request.lastName}
                          </h2>
                          <p>{request.email}</p>
                        </div>
                      </div>
                      <div className="admin-request-card__badges">
                        <span className="badge badge-red">{request.role}</span>
                        <span className="badge badge-gray">
                          {request.verificationStatus}
                        </span>
                      </div>
                    </div>

                    <div className="admin-request-card__meta">
                      <p>
                        Requested:{" "}
                        <strong>
                          {formatDateTime(request.verificationRequestedAt)}
                        </strong>
                      </p>
                      <p>
                        Notification:{" "}
                        <strong>
                          {formatDateTime(request.notificationCreatedAt)}
                        </strong>
                      </p>
                      <p>
                        Access after approval:{" "}
                        <strong>
                          Book {request.canBook ? "enabled" : "disabled"} / Host{" "}
                          {request.canHost ? "enabled" : "disabled"}
                        </strong>
                      </p>
                    </div>

                    <div className="admin-request-card__section">
                      <h3>Host location</h3>
                      <p>
                        {formatLocation(request) || "No location submitted."}
                      </p>
                      <p>
                        Coordinates:{" "}
                        <strong>
                          {request.latitude ?? "-"}, {request.longitude ?? "-"}
                        </strong>
                      </p>
                    </div>

                    {request.role === "HOST" && (
                      <>
                        <div className="admin-request-card__section">
                          <h3>Hosting details</h3>
                          <p>
                            <strong>{request.hostDisplayName || "-"}</strong>
                          </p>
                          <p>{request.hostAbout || "-"}</p>
                          <p>
                            Check-in {request.preferredCheckInTime || "-"} /
                            Check-out {request.preferredCheckOutTime || "-"}
                          </p>
                          <p>
                            Response time:{" "}
                            <strong>
                              {request.responseTimeHours || "-"} hours
                            </strong>
                          </p>
                        </div>

                        <div className="admin-request-card__section">
                          <h3>Stay setup</h3>
                          <p>
                            Property types:{" "}
                            <strong>
                              {(request.propertyTypesOffered || []).join(
                                ", ",
                              ) || "-"}
                            </strong>
                          </p>
                          <p>
                            Offerings:{" "}
                            <strong>
                              {(request.offeringHighlights || []).join(", ") ||
                                "-"}
                            </strong>
                          </p>
                          <p>House rules: {request.houseRules || "-"}</p>
                        </div>

                        {(request.hostPortfolioImages || []).length > 0 && (
                          <div className="admin-request-card__gallery">
                            {request.hostPortfolioImages.map((image, index) => (
                              <img
                                key={`${request.notificationId || request.userId}-${index}`}
                                src={image}
                                alt={`Host portfolio ${index + 1}`}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    <div className="form-group" style={{ marginTop: "1rem" }}>
                      <label
                        className="form-label"
                        htmlFor={request.notificationId || request.userId}
                      >
                        Review note
                      </label>
                      <textarea
                        id={request.notificationId || request.userId}
                        className="form-input"
                        style={{ minHeight: "92px", resize: "vertical" }}
                        value={
                          decisionNotes[
                            request.notificationId || request.userId
                          ] || ""
                        }
                        onChange={(event) =>
                          setDecisionNotes((prev) => ({
                            ...prev,
                            [request.notificationId || request.userId]:
                              event.target.value,
                          }))
                        }
                        placeholder="Optional note for approval or rejection"
                      />
                    </div>

                    <div className="admin-request-card__actions">
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleDecision(request, "reject")}
                        disabled={
                          actingOn ===
                          (request.notificationId || request.userId)
                        }
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleDecision(request, "approve")}
                        disabled={
                          actingOn ===
                          (request.notificationId || request.userId)
                        }
                      >
                        {actingOn === (request.notificationId || request.userId)
                          ? "Saving..."
                          : "Approve"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default AdminVerificationPage;
