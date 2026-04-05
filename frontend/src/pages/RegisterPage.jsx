import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import HostLocationMap from "../components/HostLocationMap";
import { useAuth } from "../context/AuthContext";
import { readFileAsDataUrl, readFilesAsDataUrls } from "../utils/fileUtils";

const hostHintStyle = {
  marginTop: "0.35rem",
  color: "var(--airbnb-gray)",
  fontSize: "0.8rem",
};

const RegisterPage = () => {
  const { register: registerUser, loading, error, setError } = useAuth();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      role: "GUEST",
      propertyTypesOfferedInput: "",
      offeringHighlightsInput: "",
      bedTypesInput: "",
      responseTimeHours: 4,
    },
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedRole = watch("role");
  const selectedLatitude = watch("latitude");
  const selectedLongitude = watch("longitude");
  const [profilePreview, setProfilePreview] = useState("");
  const [hostImageNames, setHostImageNames] = useState([]);

  useEffect(() => {
    const requestedRole = searchParams.get("role");
    if (requestedRole === "HOST" || requestedRole === "GUEST") {
      setValue("role", requestedRole, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data) => {
    const profileImageFile = data.profileImage?.[0];
    const hostPortfolioFiles = data.hostPortfolioFiles || [];
    const profileImage = profileImageFile
      ? await readFileAsDataUrl(profileImageFile)
      : "";

    const payload = {
      ...data,
      profileImage,
      propertyTypesOffered: (data.propertyTypesOfferedInput || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      offeringHighlights: (data.offeringHighlightsInput || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      bedTypes: (data.bedTypesInput || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      hostPortfolioImages: await readFilesAsDataUrls(hostPortfolioFiles),
    };

    delete payload.confirmPassword;
    delete payload.propertyTypesOfferedInput;
    delete payload.offeringHighlightsInput;
    delete payload.bedTypesInput;
    delete payload.profileImage;
    delete payload.hostPortfolioFiles;

    payload.profileImage = profileImage;

    const result = await registerUser(payload);
    if (result.success) {
      navigate("/profile");
    }
  };

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setProfilePreview("");
      return;
    }
    setProfilePreview(await readFileAsDataUrl(file));
  };

  const handleHostPortfolioChange = (event) => {
    setHostImageNames(
      Array.from(event.target.files || []).map((file) => file.name),
    );
  };

  const handleLocationSelect = (locationDetails) => {
    [
      "street",
      "area",
      "village",
      "district",
      "division",
      "city",
      "country",
      "zipCode",
      "latitude",
      "longitude",
    ].forEach((field) => {
      if (locationDetails[field] !== undefined) {
        setValue(field, locationDetails[field], {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    });
  };

  return (
    <div className="page-wrapper">
      <section className="page-content">
        <div
          className="container-sm animate-fade-in-up"
          style={{
            paddingTop: "96px",
            paddingBottom: "64px",
            maxWidth: selectedRole === "HOST" ? "1120px" : "560px",
          }}
        >
          <div className="card">
            <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
              Join Airbnb
            </h1>
            <p style={{ marginBottom: "1.75rem" }}>
              Create an account to book unique stays or start hosting guests.
            </p>

            {error && (
              <div
                className="alert alert-error"
                style={{ marginBottom: "1.5rem" }}
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    color: "inherit",
                    fontSize: "0.8rem",
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="auth-form"
              noValidate
            >
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <span className="form-label">Account type</span>
                <div className="register-role-grid">
                  {["GUEST", "HOST"].map((role) => (
                    <label
                      key={role}
                      className="register-role-card"
                      style={{
                        border:
                          selectedRole === role
                            ? "2px solid var(--airbnb-dark)"
                            : "1.5px solid var(--airbnb-light-gray)",
                      }}
                    >
                      <input
                        type="radio"
                        value={role}
                        {...register("role")}
                        style={{ display: "none" }}
                      />
                      <strong>{role === "GUEST" ? "Guest" : "Host"}</strong>
                      <p style={hostHintStyle}>
                        {role === "GUEST"
                          ? "Book unique homes around the world."
                          : "Create a real host profile with mapped location, stay details, and hosting preferences."}
                      </p>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="profileImage">
                  Profile image{" "}
                  {selectedRole === "HOST"
                    ? "(required for hosts)"
                    : "(optional)"}
                </label>
                <input
                  id="profileImage"
                  type="file"
                  accept="image/*"
                  className="form-input"
                  {...register("profileImage", {
                    validate: (value) =>
                      selectedRole !== "HOST" ||
                      value?.length > 0 ||
                      "Hosts must upload a profile image",
                  })}
                  onChange={handleProfileImageChange}
                />
                {profilePreview && (
                  <img
                    src={profilePreview}
                    alt="Profile preview"
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginTop: "0.75rem",
                    }}
                  />
                )}
                {errors.profileImage && (
                  <p className="form-error">{errors.profileImage.message}</p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="firstName">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  className={`form-input ${errors.firstName ? "error" : ""}`}
                  placeholder="John"
                  {...register("firstName", {
                    required: "First name is required",
                    minLength: { value: 2, message: "At least 2 characters" },
                  })}
                />
                {errors.firstName && (
                  <p className="form-error">{errors.firstName.message}</p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="lastName">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  className={`form-input ${errors.lastName ? "error" : ""}`}
                  placeholder="Doe"
                  {...register("lastName", {
                    required: "Last name is required",
                    minLength: { value: 2, message: "At least 2 characters" },
                  })}
                />
                {errors.lastName && (
                  <p className="form-error">{errors.lastName.message}</p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={`form-input ${errors.email ? "error" : ""}`}
                  placeholder="you@example.com"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address",
                    },
                  })}
                />
                {errors.email && (
                  <p className="form-error">{errors.email.message}</p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="phoneNumber">
                  Phone number{" "}
                  {selectedRole === "HOST"
                    ? "(required for hosts)"
                    : "(optional)"}
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  className={`form-input ${errors.phoneNumber ? "error" : ""}`}
                  placeholder="+8801XXXXXXXXX"
                  {...register("phoneNumber", {
                    validate: (value) =>
                      selectedRole !== "HOST" ||
                      !!value?.trim() ||
                      "Phone number is required for hosts",
                  })}
                />
                {errors.phoneNumber && (
                  <p className="form-error">{errors.phoneNumber.message}</p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className={`form-input ${errors.password ? "error" : ""}`}
                  placeholder="Create a password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 6, message: "At least 6 characters" },
                  })}
                />
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="confirmPassword">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className={`form-input ${errors.confirmPassword ? "error" : ""}`}
                  placeholder="Repeat your password"
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (value) =>
                      value === watch("password") || "Passwords do not match",
                  })}
                />
                {errors.confirmPassword && (
                  <p className="form-error">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="bio">
                  About you
                </label>
                <textarea
                  id="bio"
                  className="form-input"
                  style={{ minHeight: "92px", resize: "vertical" }}
                  placeholder="Tell guests or hosts a little about yourself."
                  {...register("bio")}
                />
              </div>

              {selectedRole === "HOST" && (
                <div className="register-host-layout">
                  <div className="register-host-layout__form">
                    <div className="register-host-section">
                      <h2
                        style={{ fontSize: "1.05rem", marginBottom: "0.35rem" }}
                      >
                        Host onboarding
                      </h2>
                      <p style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
                        These details make the host profile realistic now and
                        reusable for listings, search, and availability later.
                      </p>

                      <div
                        className="form-group"
                        style={{ marginBottom: "1rem" }}
                      >
                        <label className="form-label" htmlFor="hostDisplayName">
                          Host display name
                        </label>
                        <input
                          id="hostDisplayName"
                          type="text"
                          className={`form-input ${errors.hostDisplayName ? "error" : ""}`}
                          placeholder="Ahnaf's stays"
                          {...register("hostDisplayName", {
                            validate: (value) =>
                              selectedRole !== "HOST" ||
                              !!value?.trim() ||
                              "Host display name is required",
                          })}
                        />
                        {errors.hostDisplayName && (
                          <p className="form-error">
                            {errors.hostDisplayName.message}
                          </p>
                        )}
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
                          className={`form-input ${errors.hostAbout ? "error" : ""}`}
                          style={{ minHeight: "96px", resize: "vertical" }}
                          placeholder="Describe your hosting style, what guests can expect, and what kind of spaces you manage."
                          {...register("hostAbout", {
                            validate: (value) =>
                              selectedRole !== "HOST" ||
                              !!value?.trim() ||
                              "Host introduction is required",
                          })}
                        />
                        {errors.hostAbout && (
                          <p className="form-error">
                            {errors.hostAbout.message}
                          </p>
                        )}
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
                          type="date"
                          className={`form-input ${errors.hostingSince ? "error" : ""}`}
                          {...register("hostingSince", {
                            validate: (value) =>
                              selectedRole !== "HOST" ||
                              !!value ||
                              "Hosting start date is required",
                          })}
                        />
                        {errors.hostingSince && (
                          <p className="form-error">
                            {errors.hostingSince.message}
                          </p>
                        )}
                      </div>

                      <div className="register-grid-two">
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
                            type="time"
                            className={`form-input ${errors.preferredCheckInTime ? "error" : ""}`}
                            {...register("preferredCheckInTime", {
                              validate: (value) =>
                                selectedRole !== "HOST" ||
                                !!value ||
                                "Check-in time is required",
                            })}
                          />
                          {errors.preferredCheckInTime && (
                            <p className="form-error">
                              {errors.preferredCheckInTime.message}
                            </p>
                          )}
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
                            type="time"
                            className={`form-input ${errors.preferredCheckOutTime ? "error" : ""}`}
                            {...register("preferredCheckOutTime", {
                              validate: (value) =>
                                selectedRole !== "HOST" ||
                                !!value ||
                                "Check-out time is required",
                            })}
                          />
                          {errors.preferredCheckOutTime && (
                            <p className="form-error">
                              {errors.preferredCheckOutTime.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className="form-group"
                        style={{ marginBottom: "1rem" }}
                      >
                        <label
                          className="form-label"
                          htmlFor="responseTimeHours"
                        >
                          Expected response time (hours)
                        </label>
                        <input
                          id="responseTimeHours"
                          type="number"
                          min="1"
                          max="72"
                          className="form-input"
                          {...register("responseTimeHours", {
                            valueAsNumber: true,
                          })}
                        />
                      </div>

                      <div className="register-grid-two">
                        <div
                          className="form-group"
                          style={{ marginBottom: "1rem" }}
                        >
                          <label className="form-label" htmlFor="guestCapacity">
                            Guest capacity
                          </label>
                          <input
                            id="guestCapacity"
                            type="number"
                            min="1"
                            className={`form-input ${errors.guestCapacity ? "error" : ""}`}
                            {...register("guestCapacity", {
                              valueAsNumber: true,
                              validate: (value) =>
                                selectedRole !== "HOST" ||
                                (Number.isFinite(value) && value > 0) ||
                                "Guest capacity is required",
                            })}
                          />
                          {errors.guestCapacity && (
                            <p className="form-error">
                              {errors.guestCapacity.message}
                            </p>
                          )}
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
                            type="number"
                            min="1"
                            className={`form-input ${errors.bedCount ? "error" : ""}`}
                            {...register("bedCount", {
                              valueAsNumber: true,
                              validate: (value) =>
                                selectedRole !== "HOST" ||
                                (Number.isFinite(value) && value > 0) ||
                                "Bed count is required",
                            })}
                          />
                          {errors.bedCount && (
                            <p className="form-error">
                              {errors.bedCount.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className="form-group"
                        style={{ marginBottom: "1rem" }}
                      >
                        <label className="form-label" htmlFor="bedTypesInput">
                          Bed types
                        </label>
                        <input
                          id="bedTypesInput"
                          type="text"
                          className={`form-input ${errors.bedTypesInput ? "error" : ""}`}
                          placeholder="Queen bed, Single bed, Sofa bed"
                          {...register("bedTypesInput", {
                            validate: (value) =>
                              selectedRole !== "HOST" ||
                              !!value?.split(",").some((item) => item.trim()) ||
                              "At least one bed type is required",
                          })}
                        />
                        <p style={hostHintStyle}>
                          Separate values with commas.
                        </p>
                        {errors.bedTypesInput && (
                          <p className="form-error">
                            {errors.bedTypesInput.message}
                          </p>
                        )}
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
                          type="number"
                          min="1"
                          step="0.01"
                          className={`form-input ${errors.nightlyRateUsd ? "error" : ""}`}
                          placeholder="85"
                          {...register("nightlyRateUsd", {
                            valueAsNumber: true,
                            validate: (value) =>
                              selectedRole !== "HOST" ||
                              (Number.isFinite(value) && value > 0) ||
                              "Nightly rate is required",
                          })}
                        />
                        {errors.nightlyRateUsd && (
                          <p className="form-error">
                            {errors.nightlyRateUsd.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="register-host-section">
                      <h2
                        style={{ fontSize: "1.05rem", marginBottom: "0.35rem" }}
                      >
                        Detailed host location
                      </h2>
                      <p style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
                        Enter the address guests will search for later and pin
                        the approximate hosting location on the map.
                      </p>

                      <input
                        type="hidden"
                        {...register("latitude", {
                          valueAsNumber: true,
                          validate: (value) =>
                            selectedRole !== "HOST" ||
                            value !== undefined ||
                            "Please pin the host location on the map",
                        })}
                      />
                      <input
                        type="hidden"
                        {...register("longitude", {
                          valueAsNumber: true,
                          validate: (value) =>
                            selectedRole !== "HOST" ||
                            value !== undefined ||
                            "Please pin the host location on the map",
                        })}
                      />

                      <div
                        className="form-group"
                        style={{ marginBottom: "1rem" }}
                      >
                        <label className="form-label" htmlFor="street">
                          Street or road
                        </label>
                        <input
                          id="street"
                          type="text"
                          className={`form-input ${errors.street ? "error" : ""}`}
                          placeholder="Road 12, House 5"
                          {...register("street", {
                            validate: (value) =>
                              selectedRole !== "HOST" ||
                              !!value?.trim() ||
                              "Street is required for hosts",
                          })}
                        />
                        {errors.street && (
                          <p className="form-error">{errors.street.message}</p>
                        )}
                      </div>

                      <div className="register-grid-two">
                        <div
                          className="form-group"
                          style={{ marginBottom: "1rem" }}
                        >
                          <label className="form-label" htmlFor="area">
                            Area
                          </label>
                          <input
                            id="area"
                            type="text"
                            className={`form-input ${errors.area ? "error" : ""}`}
                            placeholder="Dhanmondi"
                            {...register("area", {
                              validate: (value) =>
                                selectedRole !== "HOST" ||
                                !!value?.trim() ||
                                "Area is required for hosts",
                            })}
                          />
                          {errors.area && (
                            <p className="form-error">{errors.area.message}</p>
                          )}
                        </div>

                        <div
                          className="form-group"
                          style={{ marginBottom: "1rem" }}
                        >
                          <label className="form-label" htmlFor="village">
                            Village or locality
                          </label>
                          <input
                            id="village"
                            type="text"
                            className="form-input"
                            placeholder="Optional"
                            {...register("village")}
                          />
                        </div>
                      </div>

                      <div className="register-grid-two">
                        <div
                          className="form-group"
                          style={{ marginBottom: "1rem" }}
                        >
                          <label className="form-label" htmlFor="district">
                            District
                          </label>
                          <input
                            id="district"
                            type="text"
                            className={`form-input ${errors.district ? "error" : ""}`}
                            placeholder="Dhaka"
                            {...register("district", {
                              validate: (value) =>
                                selectedRole !== "HOST" ||
                                !!value?.trim() ||
                                "District is required for hosts",
                            })}
                          />
                          {errors.district && (
                            <p className="form-error">
                              {errors.district.message}
                            </p>
                          )}
                        </div>

                        <div
                          className="form-group"
                          style={{ marginBottom: "1rem" }}
                        >
                          <label className="form-label" htmlFor="division">
                            Division or state
                          </label>
                          <input
                            id="division"
                            type="text"
                            className={`form-input ${errors.division ? "error" : ""}`}
                            placeholder="Dhaka Division"
                            {...register("division", {
                              validate: (value) =>
                                selectedRole !== "HOST" ||
                                !!value?.trim() ||
                                "Division is required for hosts",
                            })}
                          />
                          {errors.division && (
                            <p className="form-error">
                              {errors.division.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="register-grid-two">
                        <div
                          className="form-group"
                          style={{ marginBottom: "1rem" }}
                        >
                          <label className="form-label" htmlFor="city">
                            City or town
                          </label>
                          <input
                            id="city"
                            type="text"
                            className="form-input"
                            placeholder="Dhaka"
                            {...register("city")}
                          />
                        </div>

                        <div
                          className="form-group"
                          style={{ marginBottom: "1rem" }}
                        >
                          <label className="form-label" htmlFor="country">
                            Country
                          </label>
                          <input
                            id="country"
                            type="text"
                            className={`form-input ${errors.country ? "error" : ""}`}
                            placeholder="Bangladesh"
                            {...register("country", {
                              validate: (value) =>
                                selectedRole !== "HOST" ||
                                !!value?.trim() ||
                                "Country is required for hosts",
                            })}
                          />
                          {errors.country && (
                            <p className="form-error">
                              {errors.country.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="register-grid-two">
                        <div
                          className="form-group"
                          style={{ marginBottom: "1rem" }}
                        >
                          <label className="form-label" htmlFor="zipCode">
                            Zip or postal code
                          </label>
                          <input
                            id="zipCode"
                            type="text"
                            className="form-input"
                            placeholder="1209"
                            {...register("zipCode")}
                          />
                        </div>

                        <div
                          className="form-group"
                          style={{ marginBottom: "1rem" }}
                        >
                          <label className="form-label">
                            Selected coordinates
                          </label>
                          <input
                            type="text"
                            className={`form-input ${errors.latitude || errors.longitude ? "error" : ""}`}
                            value={
                              selectedLatitude !== undefined &&
                              selectedLongitude !== undefined
                                ? `${selectedLatitude}, ${selectedLongitude}`
                                : ""
                            }
                            placeholder="Pick a point from the map"
                            readOnly
                          />
                          {(errors.latitude || errors.longitude) && (
                            <p className="form-error">
                              {errors.latitude?.message ||
                                errors.longitude?.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="register-host-section">
                      <div
                        className="form-group"
                        style={{ marginBottom: "1rem" }}
                      >
                        <label
                          className="form-label"
                          htmlFor="propertyTypesOfferedInput"
                        >
                          Property types offered
                        </label>
                        <input
                          id="propertyTypesOfferedInput"
                          type="text"
                          className={`form-input ${errors.propertyTypesOfferedInput ? "error" : ""}`}
                          placeholder="Apartment, Villa, Studio"
                          {...register("propertyTypesOfferedInput", {
                            validate: (value) =>
                              selectedRole !== "HOST" ||
                              !!value?.split(",").some((item) => item.trim()) ||
                              "At least one property type is required",
                          })}
                        />
                        <p style={hostHintStyle}>
                          Separate values with commas.
                        </p>
                        {errors.propertyTypesOfferedInput && (
                          <p className="form-error">
                            {errors.propertyTypesOfferedInput.message}
                          </p>
                        )}
                      </div>

                      <div
                        className="form-group"
                        style={{ marginBottom: "1rem" }}
                      >
                        <label
                          className="form-label"
                          htmlFor="offeringHighlightsInput"
                        >
                          Offering highlights
                        </label>
                        <input
                          id="offeringHighlightsInput"
                          type="text"
                          className={`form-input ${errors.offeringHighlightsInput ? "error" : ""}`}
                          placeholder="Airport pickup, Self check-in, Breakfast, Workspace"
                          {...register("offeringHighlightsInput", {
                            validate: (value) =>
                              selectedRole !== "HOST" ||
                              !!value?.split(",").some((item) => item.trim()) ||
                              "At least one host offering is required",
                          })}
                        />
                        <p style={hostHintStyle}>
                          Separate values with commas.
                        </p>
                        {errors.offeringHighlightsInput && (
                          <p className="form-error">
                            {errors.offeringHighlightsInput.message}
                          </p>
                        )}
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
                          className={`form-input ${errors.houseRules ? "error" : ""}`}
                          style={{ minHeight: "96px", resize: "vertical" }}
                          placeholder="No smoking, quiet hours after 10 PM, valid ID at check-in..."
                          {...register("houseRules", {
                            validate: (value) =>
                              selectedRole !== "HOST" ||
                              !!value?.trim() ||
                              "House rules are required",
                          })}
                        />
                        {errors.houseRules && (
                          <p className="form-error">
                            {errors.houseRules.message}
                          </p>
                        )}
                      </div>

                      <div className="form-group">
                        <label
                          className="form-label"
                          htmlFor="hostPortfolioFiles"
                        >
                          Host or room images
                        </label>
                        <input
                          id="hostPortfolioFiles"
                          type="file"
                          multiple
                          accept="image/*"
                          className={`form-input ${errors.hostPortfolioFiles ? "error" : ""}`}
                          {...register("hostPortfolioFiles", {
                            validate: (value) =>
                              selectedRole !== "HOST" ||
                              value?.length > 0 ||
                              "Upload at least one host or room image",
                          })}
                          onChange={handleHostPortfolioChange}
                        />
                        {hostImageNames.length > 0 && (
                          <p style={hostHintStyle}>
                            {hostImageNames.length} file(s) selected
                          </p>
                        )}
                        {errors.hostPortfolioFiles && (
                          <p className="form-error">
                            {errors.hostPortfolioFiles.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="register-host-layout__map">
                    <HostLocationMap
                      latitude={
                        typeof selectedLatitude === "number"
                          ? selectedLatitude
                          : undefined
                      }
                      longitude={
                        typeof selectedLongitude === "number"
                          ? selectedLongitude
                          : undefined
                      }
                      onLocationSelect={handleLocationSelect}
                      mapHeight={520}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : "Agree and continue"}
              </button>
            </form>

            <p style={{ fontSize: "0.9rem", marginTop: "1.5rem" }}>
              Already have an account?{" "}
              <Link to="/login" style={{ fontWeight: 600 }}>
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RegisterPage;
