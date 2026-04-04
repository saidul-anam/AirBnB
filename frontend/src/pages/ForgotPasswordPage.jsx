import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { forgotPassword } from "../services/authService";

const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const newPassword = watch("newPassword");

  const onSubmit = async (data) => {
    setError(null);
    setLoading(true);
    try {
      const response = await forgotPassword(data);
      if (response.success) {
        setSuccess(true);
        toast.success(response.message || "Password reset successfully!");
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setError(response.message || "Password reset failed.");
        toast.error(response.message || "Password reset failed.");
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Something went wrong. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const EyeOpenIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeClosedIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );

  const PasswordToggleButton = ({ show, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      style={{
        position: "absolute",
        right: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#717171",
        fontSize: "0.85rem",
        fontWeight: 600,
      }}
      tabIndex={-1}
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? <EyeClosedIcon /> : <EyeOpenIcon />}
    </button>
  );

  if (success) {
    return (
      <div className="page-wrapper">
        <section className="page-content">
          <div
            className="container-sm animate-fade-in-up"
            style={{ paddingTop: "96px", paddingBottom: "64px" }}
          >
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
              <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
                Password Reset Successful
              </h1>
              <p style={{ marginBottom: "1.5rem", color: "#717171" }}>
                Your password has been changed successfully. Redirecting to
                login page...
              </p>
              <Link
                to="/login"
                className="btn btn-primary"
                style={{ display: "inline-block", textDecoration: "none" }}
              >
                Go to Login
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <section className="page-content">
        <div
          className="container-sm animate-fade-in-up"
          style={{ paddingTop: "96px", paddingBottom: "64px" }}
        >
          <div className="card">
            <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
              Reset Password
            </h1>
            <p style={{ marginBottom: "1.75rem", color: "#717171" }}>
              Enter your email, phone number, and new password to reset your
              account password.
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
              {/* Email */}
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

              {/* Phone Number */}
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="phoneNumber">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  className={`form-input ${errors.phoneNumber ? "error" : ""}`}
                  placeholder="+880XXXXXXXXXX"
                  {...register("phoneNumber", {
                    required: "Phone number is required",
                  })}
                />
                {errors.phoneNumber && (
                  <p className="form-error">{errors.phoneNumber.message}</p>
                )}
              </div>

              {/* New Password */}
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="newPassword">
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    className={`form-input ${errors.newPassword ? "error" : ""}`}
                    placeholder="••••••••"
                    style={{ paddingRight: "3rem" }}
                    {...register("newPassword", {
                      required: "New password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                  />
                  <PasswordToggleButton
                    show={showNewPassword}
                    onToggle={() => setShowNewPassword(!showNewPassword)}
                  />
                </div>
                {errors.newPassword && (
                  <p className="form-error">{errors.newPassword.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label className="form-label" htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    className={`form-input ${errors.confirmPassword ? "error" : ""}`}
                    placeholder="••••••••"
                    style={{ paddingRight: "3rem" }}
                    {...register("confirmPassword", {
                      required: "Please confirm your new password",
                      validate: (value) =>
                        value === newPassword || "Passwords do not match",
                    })}
                  />
                  <PasswordToggleButton
                    show={showConfirmPassword}
                    onToggle={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="form-error">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : "Reset Password"}
              </button>
            </form>

            <div className="divider">or</div>

            <p style={{ fontSize: "0.9rem" }}>
              Remember your password?{" "}
              <Link to="/login" style={{ fontWeight: 600 }}>
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ForgotPasswordPage;
