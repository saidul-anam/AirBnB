import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminLoginPage = () => {
  const { login, loading, error, setError, isAuthenticated, user, logout } =
    useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user?.role === "ADMIN") {
      navigate("/admin/verification-requests", { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  const onSubmit = async (data) => {
    const result = await login(data);
    if (!result.success) {
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (storedUser.role !== "ADMIN") {
      setError("This login is only for admin accounts.");
      return;
    }

    const from =
      location.state?.from?.pathname || "/admin/verification-requests";
    navigate(from, { replace: true });
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
              Admin access
            </h1>
            <p style={{ marginBottom: "1.75rem" }}>
              Log in with an admin account to review and approve verification
              requests.
            </p>

            {isAuthenticated && user?.role !== "ADMIN" && (
              <div
                className="alert alert-info"
                style={{ marginBottom: "1.5rem" }}
              >
                <span>
                  A non-admin user is currently signed in. Log out first, then
                  sign in with an admin account.
                </span>
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    color: "inherit",
                    fontSize: "0.8rem",
                  }}
                >
                  Log out
                </button>
              </div>
            )}

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
                <label className="form-label" htmlFor="admin-email">
                  Admin email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  className={`form-input ${errors.email ? "error" : ""}`}
                  placeholder="admin@airbnb.local"
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
                <label className="form-label" htmlFor="admin-password">
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  className={`form-input ${errors.password ? "error" : ""}`}
                  placeholder="Enter admin password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters",
                    },
                  })}
                />
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : "Log in as admin"}
              </button>
            </form>

            <div className="divider">or</div>

            <p style={{ fontSize: "0.9rem" }}>
              Need regular user access?{" "}
              <Link to="/login" style={{ fontWeight: 600 }}>
                Go to user login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminLoginPage;
