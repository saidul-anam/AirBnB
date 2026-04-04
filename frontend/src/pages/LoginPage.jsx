import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const { login, loading, error, setError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = async (data) => {
    const result = await login(data);
    if (result.success) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="page-wrapper">
      <section className="page-content">
        <div
          className="container-sm animate-fade-in-up"
          style={{ paddingTop: "96px", paddingBottom: "64px" }}
        >
          <div className="card">
            <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
              Welcome back
            </h1>
            <p style={{ marginBottom: "1.75rem" }}>
              Log in to access your trips, messages, and profile.
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

              <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={`form-input ${errors.password ? "error" : ""}`}
                    placeholder="••••••••"
                    style={{ paddingRight: "3rem" }}
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
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
                    ) : (
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
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </div>

              <div style={{ textAlign: "right", marginBottom: "1rem" }}>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--airbnb-red)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : "Log in"}
              </button>
            </form>

            <div className="divider">or</div>

            <p style={{ fontSize: "0.9rem" }}>
              New to ISD Airbnb?{" "}
              <Link to="/register" style={{ fontWeight: 600 }}>
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
