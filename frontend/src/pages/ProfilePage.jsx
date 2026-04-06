import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import HostLocationMap from "../components/HostLocationMap";
import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import { readFileAsDataUrl, readFilesAsDataUrls } from "../utils/fileUtils";
import Footer from "../components/Footer";

const sectionCardStyle = {
  padding: "12px",
  borderRadius: "16px",
  background: "var(--airbnb-white)",
  border: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "var(--shadow-sm)",
  marginBottom: "16px",
};

const formatDateTime = (isoLike) => {
  if (!isoLike) return "-";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const ProfilePage = () => {
  const { user, updateUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await authService.getMyProfile();
        setProfile({
          ...data,
          favoriteHostIds: data.favoriteHostIds || [],
          propertyTypesOffered: data.propertyTypesOffered || [],
          offeringHighlights: data.offeringHighlights || [],
          hostPortfolioImages: data.hostPortfolioImages || [],
          bedTypes: data.bedTypes || [],
        });
      } catch (err) {
        const msg = err.response?.data?.error || "Failed to load profile.";
        setError(msg);
        toast.error(msg);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = [
      "responseTimeHours",
      "guestCapacity",
      "bedCount",
      "nightlyRateUsd",
      "latitude",
      "longitude",
    ];
    setProfile((prev) => ({
      ...prev,
      [name]:
        numericFields.includes(name) && value !== "" ? Number(value) : value,
    }));
  };

  const handleCommaSeparatedChange = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));
  };

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const profileImage = await readFileAsDataUrl(file);
    setProfile((prev) => ({ ...prev, profileImage }));
  };

  const handleHostPortfolioChange = async (event) => {
    const files = event.target.files || [];
    const hostPortfolioImages = await readFilesAsDataUrls(files);
    setProfile((prev) => ({ ...prev, hostPortfolioImages }));
  };

  const handleLocationSelect = (locationDetails) => {
    setProfile((prev) => ({
      ...prev,
      ...locationDetails,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await authService.updateMyProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber: profile.phoneNumber,
        profileImage: profile.profileImage,
        bio: profile.bio,
        favoriteHostIds: profile.favoriteHostIds,
        street: profile.street,
        area: profile.area,
        village: profile.village,
        district: profile.district,
        division: profile.division,
        city: profile.city,
        country: profile.country,
        zipCode: profile.zipCode,
        latitude: profile.latitude,
        longitude: profile.longitude,
        hostDisplayName: profile.hostDisplayName,
        hostAbout: profile.hostAbout,
        hostingSince: profile.hostingSince
          ? profile.hostingSince.slice(0, 10)
          : "",
        preferredCheckInTime: profile.preferredCheckInTime,
        preferredCheckOutTime: profile.preferredCheckOutTime,
        responseTimeHours: profile.responseTimeHours,
        houseRules: profile.houseRules,
        propertyTypesOffered: profile.propertyTypesOffered,
        offeringHighlights: profile.offeringHighlights,
        hostPortfolioImages: profile.hostPortfolioImages,
        guestCapacity: profile.guestCapacity,
        bedCount: profile.bedCount,
        bedTypes: profile.bedTypes,
        nightlyRateUsd: profile.nightlyRateUsd,
      });
      setProfile(updated);
      updateUser({
        firstName: updated.firstName,
        lastName: updated.lastName,
        profileImage: updated.profileImage,
        emailVerified: updated.emailVerified,
        verificationStatus: updated.verificationStatus,
        canBook: updated.canBook,
        canHost: updated.canHost,
      });
      setSuccess("Profile updated successfully.");
      toast.success("Profile updated.");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to update profile.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Password changed.");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to change password.";
      setError(msg);
      toast.error(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await authService.resendVerification();
      toast.success(response.message || "Verification request sent.");
      setProfile((prev) => ({
        ...prev,
        verificationStatus: "PENDING",
        verificationRequestedAt: new Date().toISOString(),
      }));
    } catch (err) {
      toast.error(
        err.response?.data?.error || "Failed to send verification request.",
      );
    }
  };

  const isLoading = authLoading || !profile;

  return (
    <div className="page-wrapper">
      <section className="page-content">
        <div
          className="container-sm"
          style={{ paddingTop: "96px", paddingBottom: "64px" }}
        >
          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "50vh",
              }}
            >
              <span className="spinner spinner-dark" />
            </div>
          ) : (
            <div className="card animate-fade-in-up">
              <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
                Your profile
              </h1>
              <p style={{ marginBottom: "1.5rem" }}>
                Manage your personal details, verification status, profile
                image, and host onboarding details.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "16px",
                    background: "var(--airbnb-bg)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      className={`badge ${profile.role === "HOST" ? "badge-red" : "badge-gray"}`}
                    >
                      {profile.role || user?.role || "-"}
                    </span>
                    <span
                      className={`badge ${profile.status === "ACTIVE" ? "badge-green" : "badge-gray"}`}
                    >
                      {profile.status || "-"}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.85rem", margin: 0 }}>
                    Email verified:{" "}
                    <strong>{profile.emailVerified ? "Yes" : "No"}</strong>
                  </p>
                  <p style={{ fontSize: "0.8rem", marginTop: "0.4rem" }}>
                    Verification status:{" "}
                    <strong>
                      {profile.verificationStatus || "NOT_REQUESTED"}
                    </strong>
                  </p>
                  {!profile.emailVerified && (
                    <>
                      <p style={{ fontSize: "0.8rem", marginTop: "0.4rem" }}>
                        Last verification request:{" "}
                        <strong>
                          {formatDateTime(profile.verificationRequestedAt)}
                        </strong>
                      </p>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ marginTop: "0.75rem" }}
                        onClick={handleResendVerification}
                      >
                        Request verification review again
                      </button>
                    </>
                  )}
                  {profile.verifiedAt && (
                    <p style={{ fontSize: "0.8rem", marginTop: "0.4rem" }}>
                      Approved at:{" "}
                      <strong>{formatDateTime(profile.verifiedAt)}</strong>
                    </p>
                  )}
                </div>

                <div
                  style={{
                    padding: "12px",
                    borderRadius: "16px",
                    background: "var(--airbnb-bg)",
                  }}
                >
                  <p style={{ fontSize: "0.85rem", margin: 0 }}>
                    Joined: <strong>{formatDateTime(profile.createdAt)}</strong>
                  </p>
                  <p style={{ fontSize: "0.85rem", margin: 0 }}>
                    Last login:{" "}
                    <strong>{formatDateTime(profile.lastLoginAt)}</strong>
                  </p>
                  <p style={{ fontSize: "0.85rem", margin: 0 }}>
                    Updated:{" "}
                    <strong>{formatDateTime(profile.updatedAt)}</strong>
                  </p>
                </div>
              </div>

              {error && (
                <div
                  className="alert alert-error"
                  style={{ marginBottom: "1rem" }}
                >
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div
                  className="alert alert-success"
                  style={{ marginBottom: "1rem" }}
                >
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" htmlFor="profileImageUpload">
                    Profile image
                  </label>
                  <input
                    id="profileImageUpload"
                    type="file"
                    accept="image/*"
                    className="form-input"
                    onChange={handleProfileImageChange}
                  />
                  {profile.profileImage && (
                    <img
                      src={profile.profileImage}
                      alt="Profile"
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: "50%",
                        objectFit: "cover",
                        marginTop: "0.75rem",
                      }}
                    />
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" htmlFor="firstName">
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    className="form-input"
                    value={profile.firstName || ""}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" htmlFor="lastName">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    className="form-input"
                    value={profile.lastName || ""}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    value={profile.email || user?.email || ""}
                    disabled
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" htmlFor="phoneNumber">
                    Phone number
                  </label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    className="form-input"
                    value={profile.phoneNumber || ""}
                    onChange={handleChange}
                    placeholder="+8801XXXXXXXXX"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" htmlFor="bio">
                    About
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    className="form-input"
                    style={{ minHeight: "96px", resize: "vertical" }}
                    value={profile.bio || ""}
                    onChange={handleChange}
                    placeholder="Tell guests a little about yourself."
                  />
                </div>

                <div style={sectionCardStyle}>
                  <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
                    Address
                  </h2>
                  {[
                    "street",
                    "area",
                    "village",
                    "district",
                    "division",
                    "city",
                    "country",
                    "zipCode",
                  ].map((field) => (
                    <div
                      className="form-group"
                      style={{ marginBottom: "1rem" }}
                      key={field}
                    >
                      <label className="form-label" htmlFor={field}>
                        {field.replace(/([A-Z])/g, " $1")}
                      </label>
                      <input
                        id={field}
                        name={field}
                        type="text"
                        className="form-input"
                        value={profile[field] || ""}
                        onChange={handleChange}
                      />
                    </div>
                  ))}
                  {profile.role === "HOST" && (
                    <div style={{ marginTop: "1rem" }}>
                      <HostLocationMap
                        latitude={profile.latitude}
                        longitude={profile.longitude}
                        onLocationSelect={handleLocationSelect}
                        mapHeight={320}
                      />
                    </div>
                  )}
                </div>

                {profile.role === "HOST" && (
                  <div style={sectionCardStyle}>
                    <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
                      Host onboarding
                    </h2>

                    <div
                      className="form-group"
                      style={{ marginBottom: "1rem" }}
                    >
                      <label className="form-label" htmlFor="hostDisplayName">
                        Host display name
                      </label>
                      <input
                        id="hostDisplayName"
                        name="hostDisplayName"
                        type="text"
                        className="form-input"
                        value={profile.hostDisplayName || ""}
                        onChange={handleChange}
                      />
                    </div>

                    <div
                      className="form-group"
                      style={{ marginBottom: "1rem" }}
                    >
                      <label className="form-label" htmlFor="hostAbout">
                        Host introduction
                      </label>
                      <textarea
                        id="hostAbout"
                        name="hostAbout"
                        className="form-input"
                        style={{ minHeight: "96px", resize: "vertical" }}
                        value={profile.hostAbout || ""}
                        onChange={handleChange}
                      />
                    </div>

                    <div
                      className="form-group"
                      style={{ marginBottom: "1rem" }}
                    >
                      <label className="form-label" htmlFor="hostingSince">
                        Hosting since
                      </label>
                      <input
                        id="hostingSince"
                        name="hostingSince"
                        type="date"
                        className="form-input"
                        value={
                          profile.hostingSince
                            ? profile.hostingSince.slice(0, 10)
                            : ""
                        }
                        onChange={handleChange}
                      />
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "1rem",
                      }}
                    >
                      <div
                        className="form-group"
                        style={{ marginBottom: "1rem" }}
                      >
                        <label
                          className="form-label"
                          htmlFor="preferredCheckInTime"
                        >
                          Preferred check-in time
                        </label>
                        <input
                          id="preferredCheckInTime"
                          name="preferredCheckInTime"
                          type="time"
                          className="form-input"
                          value={profile.preferredCheckInTime || ""}
                          onChange={handleChange}
                        />
                      </div>
                      <div
                        className="form-group"
                        style={{ marginBottom: "1rem" }}
                      >
                        <label
                          className="form-label"
                          htmlFor="preferredCheckOutTime"
                        >
                          Preferred check-out time
                        </label>
                        <input
                          id="preferredCheckOutTime"
                          name="preferredCheckOutTime"
                          type="time"
                          className="form-input"
                          value={profile.preferredCheckOutTime || ""}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div
                      className="form-group"
                      style={{ marginBottom: "1rem" }}
                    >
                      <label className="form-label" htmlFor="responseTimeHours">
                        Response time in hours
                      </label>
                      <input
                        id="responseTimeHours"
                        name="responseTimeHours"
                        type="number"
                        className="form-input"
                        value={profile.responseTimeHours || ""}
                        onChange={handleChange}
                      />
                    </div>

                    <div
                      className="form-group"
                      style={{ marginBottom: "1rem" }}
                    >
                      <label
                        className="form-label"
                        htmlFor="propertyTypesOffered"
                      >
                        Property types offered
                      </label>
                      <input
                        id="propertyTypesOffered"
                        type="text"
                        className="form-input"
                        value={(profile.propertyTypesOffered || []).join(", ")}
                        onChange={(e) =>
                          handleCommaSeparatedChange(
                            "propertyTypesOffered",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div
                      className="form-group"
                      style={{ marginBottom: "1rem" }}
                    >
                      <label
                        className="form-label"
                        htmlFor="offeringHighlights"
                      >
                        Offering highlights
                      </label>
                      <input
                        id="offeringHighlights"
                        type="text"
                        className="form-input"
                        value={(profile.offeringHighlights || []).join(", ")}
                        onChange={(e) =>
                          handleCommaSeparatedChange(
                            "offeringHighlights",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "1rem",
                      }}
                    >
                      <div
                        className="form-group"
                        style={{ marginBottom: "1rem" }}
                      >
                        <label className="form-label" htmlFor="guestCapacity">
                          Guest capacity
                        </label>
                        <input
                          id="guestCapacity"
                          name="guestCapacity"
                          type="number"
                          className="form-input"
                          value={profile.guestCapacity || ""}
                          onChange={handleChange}
                        />
                      </div>

                      <div
                        className="form-group"
                        style={{ marginBottom: "1rem" }}
                      >
                        <label className="form-label" htmlFor="bedCount">
                          Number of beds
                        </label>
                        <input
                          id="bedCount"
                          name="bedCount"
                          type="number"
                          className="form-input"
                          value={profile.bedCount || ""}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div
                      className="form-group"
                      style={{ marginBottom: "1rem" }}
                    >
                      <label className="form-label" htmlFor="bedTypes">
                        Bed types
                      </label>
                      <input
                        id="bedTypes"
                        type="text"
                        className="form-input"
                        value={(profile.bedTypes || []).join(", ")}
                        onChange={(e) =>
                          handleCommaSeparatedChange("bedTypes", e.target.value)
                        }
                      />
                    </div>

                    <div
                      className="form-group"
                      style={{ marginBottom: "1rem" }}
                    >
                      <label className="form-label" htmlFor="nightlyRateUsd">
                        Nightly rate (USD)
                      </label>
                      <input
                        id="nightlyRateUsd"
                        name="nightlyRateUsd"
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={profile.nightlyRateUsd || ""}
                        onChange={handleChange}
                      />
                    </div>

                    <div
                      className="form-group"
                      style={{ marginBottom: "1rem" }}
                    >
                      <label className="form-label" htmlFor="houseRules">
                        House rules
                      </label>
                      <textarea
                        id="houseRules"
                        name="houseRules"
                        className="form-input"
                        style={{ minHeight: "96px", resize: "vertical" }}
                        value={profile.houseRules || ""}
                        onChange={handleChange}
                      />
                    </div>

                    <div
                      className="form-group"
                      style={{ marginBottom: "1rem" }}
                    >
                      <label
                        className="form-label"
                        htmlFor="hostPortfolioImages"
                      >
                        Host or room images
                      </label>
                      <input
                        id="hostPortfolioImages"
                        type="file"
                        multiple
                        accept="image/*"
                        className="form-input"
                        onChange={handleHostPortfolioChange}
                      />
                      {(profile.hostPortfolioImages || []).length > 0 && (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                            gap: "10px",
                            marginTop: "0.75rem",
                          }}
                        >
                          {profile.hostPortfolioImages.map((image, index) => (
                            <img
                              key={`${image.slice(0, 18)}-${index}`}
                              src={image}
                              alt={`Host portfolio ${index + 1}`}
                              style={{
                                width: "100%",
                                aspectRatio: "1 / 1",
                                objectFit: "cover",
                                borderRadius: "12px",
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={saving}
                >
                  {saving ? <span className="spinner" /> : "Save changes"}
                </button>
              </form>

              <form
                onSubmit={handlePasswordSubmit}
                style={{ ...sectionCardStyle, marginTop: "1.5rem" }}
              >
                <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
                  Change password
                </h2>
                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" htmlFor="currentPassword">
                    Current password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    className="form-input"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" htmlFor="newPassword">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    className="form-input"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" htmlFor="confirmPassword">
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="form-input"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-outline"
                  disabled={passwordSaving}
                >
                  {passwordSaving ? "Saving..." : "Update password"}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default ProfilePage;
