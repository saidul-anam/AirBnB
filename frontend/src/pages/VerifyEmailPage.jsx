import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import authService from "../services/authService";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, message: "" });

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setState({
          loading: false,
          message:
            "Direct verification links are no longer used. Verification is now reviewed by an admin.",
        });
        return;
      }

      try {
        const response = await authService.verifyEmail(token);
        setState({
          loading: false,
          message:
            response.message || "Verification is handled by admin approval.",
        });

        const storedUser = authService.getCurrentUser();
        if (storedUser && response.success) {
          localStorage.setItem(
            "user",
            JSON.stringify({ ...storedUser, emailVerified: true }),
          );
        }
      } catch (err) {
        const message = err.response?.data?.error || "Verification failed.";
        setState({ loading: false, message });
        toast.error(message);
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="page-wrapper">
      <section className="page-content">
        <div
          className="container-sm animate-fade-in-up"
          style={{ paddingTop: "96px", paddingBottom: "64px" }}
        >
          <div className="card">
            <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
              Account verification
            </h1>
            <p style={{ marginBottom: "1.5rem" }}>
              {state.loading
                ? "Checking your verification request status..."
                : state.message}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link to="/profile" className="btn btn-primary">
                Go to profile
              </Link>
              <Link to="/login" className="btn btn-outline">
                Go to login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VerifyEmailPage;
