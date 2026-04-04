import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import "./Navbar.css";

const Navbar = () => {
  const { isAuthenticated, user, logout, initials } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  /* ── Scroll shadow ── */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  const handleMenuClick = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <nav
      className={`navbar ${scrolled ? "navbar--scrolled" : ""} ${isHomePage ? "navbar--home" : ""}`}
    >
      <div className="navbar__container">
        {/* ── Logo ── */}
        <Link to="/" className="navbar__logo">
          <svg
            viewBox="0 0 40 32"
            className="navbar__logo-icon"
            aria-hidden="true"
          >
            <path
              d="M5 28 20 4l15 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13 28l7-11 7 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="navbar__logo-text">airbnb</span>
        </Link>

        {/* ── Center tabs (home page only) ── */}
        {isHomePage ? (
          <div className="navbar__center">
            <button className="navbar__tab navbar__tab--active">
              <span className="navbar__tab-icon">🏠</span>
              Homes
            </button>
            <button className="navbar__tab">
              <span className="navbar__tab-icon">🎭</span>
              Experiences
            </button>
          </div>
        ) : (
          /* ── Search pill (inner pages) ── */
          <div className="navbar__search">
            <button
              className="navbar__search-bar"
              onClick={() => navigate("/search")}
            >
              <span className="navbar__search-item">Anywhere</span>
              <span className="navbar__search-divider" />
              <span className="navbar__search-item">Any week</span>
              <span className="navbar__search-divider" />
              <span className="navbar__search-item navbar__search-item--gray">
                Add guests
              </span>
              <span className="navbar__search-btn">
                <svg viewBox="0 0 32 32" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M13 0C5.83 0 0 5.83 0 13s5.83 13 13 13c3.28 0 6.275-1.22 8.565-3.22l7.33 7.33a1.5 1.5 0 1 0 2.12-2.12l-7.33-7.33C21.78 19.275 23 16.28 23 13 23 5.83 17.17 0 13 0zm0 3a10 10 0 1 1 0 20A10 10 0 0 1 13 3z"
                  />
                </svg>
              </span>
            </button>
          </div>
        )}

        {/* ── Right side actions ── */}
        <div className="navbar__actions">
          {/* Become a host link */}
          {(!isAuthenticated || user?.role === "GUEST") && (
            <Link to="/register?role=HOST" className="navbar__host-link">
              Become a Host
            </Link>
          )}

          {/* Globe icon */}
          <button className="navbar__icon-btn" aria-label="Language">
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              focusable="false"
              style={{ width: 16, height: 16 }}
            >
              <path
                d="M8 .25a7.75 7.75 0 1 1 0 15.5A7.75 7.75 0 0 1 8 .25zm0 1.5a6.25 6.25 0 1 0 0 12.5A6.25 6.25 0 0 0 8 1.75zm2.596 3.634c.095-.085.24-.063.31.045l.03.057.793 1.851a.25.25 0 0 1-.06.278l-.05.037-1.318.793.36 2.519a.25.25 0 0 1-.154.264l-.062.015-1.75.25a.25.25 0 0 1-.28-.205l-.005-.063V9.25H6.414l-.793 2.125a.25.25 0 0 1-.293.155l-.06-.022-1.5-.75a.25.25 0 0 1-.133-.285l.026-.065.793-1.851V7.25a.25.25 0 0 1 .206-.246l.063-.004H5.5V5.75a.25.25 0 0 1 .193-.243L5.75 5.5h1a.25.25 0 0 1 .243.193L7 5.75V7h1.25V5.75a.25.25 0 0 1 .193-.243L8.5 5.5h.5l.053.007 1.543-.623z"
                fill="currentColor"
              />
            </svg>
          </button>

          {isAuthenticated && <NotificationBell user={user} />}

          {/* User menu */}
          <div className="navbar__menu-wrapper" ref={menuRef}>
            <button
              className={`navbar__menu-btn ${menuOpen ? "navbar__menu-btn--open" : ""}`}
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="User menu"
              aria-expanded={menuOpen}
            >
              {/* Hamburger icon */}
              <svg
                viewBox="0 0 32 32"
                aria-hidden="true"
                style={{ width: 16, height: 16, flexShrink: 0 }}
              >
                <path
                  fill="currentColor"
                  d="M2 7h28v2H2zm0 8h28v2H2zm0 8h28v2H2z"
                />
              </svg>

              {/* Avatar */}
              {isAuthenticated ? (
                <div className="navbar__avatar">
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={initials}
                      className="navbar__avatar-img"
                    />
                  ) : (
                    <span className="navbar__avatar-initials">{initials}</span>
                  )}
                </div>
              ) : (
                <div className="navbar__avatar navbar__avatar--guest">
                  <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                    <path
                      d="M16 .7C7.56.7.7 7.56.7 16S7.56 31.3 16 31.3 31.3 24.44 31.3 16 24.44.7 16 .7zm0 28c-4.02 0-7.6-1.88-9.93-4.81a12.43 12.43 0 0 1 6.45-4.4A6.5 6.5 0 0 1 9.5 14a6.5 6.5 0 0 1 13 0 6.51 6.51 0 0 1-3.02 5.5 12.42 12.42 0 0 1 6.45 4.4A12.67 12.67 0 0 1 16 28.7z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              )}
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="navbar__dropdown animate-fade-in">
                {isAuthenticated ? (
                  <>
                    <div className="navbar__dropdown-header">
                      <div className="navbar__dropdown-avatar">
                        {user?.profileImage ? (
                          <img
                            src={user.profileImage}
                            alt={initials}
                            className="navbar__avatar-img"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div>
                        <p className="navbar__dropdown-name">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="navbar__dropdown-email">{user?.email}</p>
                        <span
                          className={`badge ${user?.role === "HOST" ? "badge-red" : "badge-gray"}`}
                        >
                          {user?.role}
                        </span>
                      </div>
                    </div>

                    <div className="navbar__dropdown-divider" />

                    {user?.role !== "ADMIN" && (
                      <button
                        className="navbar__dropdown-item"
                        onClick={() => handleMenuClick("/profile")}
                      >
                        <svg viewBox="0 0 32 32" aria-hidden="true">
                          <path
                            d="M16 2a14 14 0 1 0 0 28A14 14 0 0 0 16 2zm0 5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 19a10.5 10.5 0 0 1-8-3.7 6 6 0 0 1 5.33-3.3h5.34A6 6 0 0 1 24 22.3 10.5 10.5 0 0 1 16 26z"
                            fill="currentColor"
                          />
                        </svg>
                        Profile
                      </button>
                    )}

                    {user?.role === "ADMIN" && (
                      <button
                        className="navbar__dropdown-item"
                        onClick={() =>
                          handleMenuClick("/admin/verification-requests")
                        }
                      >
                        <svg viewBox="0 0 32 32" aria-hidden="true">
                          <path
                            d="M16 2l11 4v8c0 7.18-4.5 13.42-11 16-6.5-2.58-11-8.82-11-16V6l11-4zm0 3.06L8 7.97V14c0 5.66 3.33 10.74 8 13.16 4.67-2.42 8-7.5 8-13.16V7.97l-8-2.91zm-1 6h2v6h-2v-6zm0 8h2v2h-2v-2z"
                            fill="currentColor"
                          />
                        </svg>
                        Verification Queue
                      </button>
                    )}

                    {user?.role === "ADMIN" && (
                      <button
                        className="navbar__dropdown-item"
                        onClick={() => handleMenuClick("/admin/bookings")}
                      >
                        <svg viewBox="0 0 32 32" aria-hidden="true">
                          <path
                            d="M26 2H6a2 2 0 0 0-2 2v24a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-1 25H7V5h18v22zM11 11h10v2H11zm0 5h10v2H11zm0 5h6v2h-6z"
                            fill="currentColor"
                          />
                        </svg>
                        Manage Bookings
                      </button>
                    )}

                    {user?.role === "HOST" && (
                      <button
                        className="navbar__dropdown-item"
                        onClick={() => handleMenuClick("/my-listings")}
                      >
                        <svg viewBox="0 0 32 32" aria-hidden="true">
                          <path
                            d="M27 18H5v13h22V18zM16 3L1 16h4v15h22V16h4L16 3z"
                            fill="currentColor"
                          />
                        </svg>
                        My Listings
                      </button>
                    )}

                    {user?.role !== "ADMIN" && (
                      <>
                        <button
                          className="navbar__dropdown-item"
                          onClick={() => handleMenuClick("/wishlists")}
                        >
                          <svg
                            viewBox="0 0 32 32"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="m16 28c7-4.733 14-10 14-17 0-1.792-.683-3.583-2.05-4.95-1.367-1.366-3.158-2.05-4.95-2.05-1.791 0-3.583.684-4.949 2.05l-2.051 2.051-2.05-2.051c-1.367-1.366-3.158-2.05-4.95-2.05-1.791 0-3.583.684-4.949 2.05-1.367 1.367-2.051 3.158-2.051 4.95 0 7 7 12.267 14 17z"
                              fill="currentColor"
                            ></path>
                          </svg>
                          Wishlists
                        </button>
                        <button
                          className="navbar__dropdown-item"
                          onClick={() => handleMenuClick("/inbox")}
                        >
                          <svg
                            viewBox="0 0 32 32"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M26 2H6a4 4 0 0 0-4 4v16a4 4 0 0 0 4 4h6l4 4 4-4h6a4 4 0 0 0 4-4V6a4 4 0 0 0-4-4zM8 12h16v2H8zm0-4h16v2H8zm0 8h10v2H8z"
                              fill="currentColor"
                            ></path>
                          </svg>
                          Inbox
                        </button>
                        {user?.role !== "HOST" && (
                          <button
                            className="navbar__dropdown-item"
                            onClick={() => handleMenuClick("/my-trips")}
                          >
                            <svg viewBox="0 0 32 32" aria-hidden="true">
                              <path
                                d="M26 2H6a2 2 0 0 0-2 2v24a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-1 25H7V5h18v22zM11 11h10v2H11zm0 5h10v2H11zm0 5h6v2h-6z"
                                fill="currentColor"
                              />
                            </svg>
                            My Trips
                          </button>
                        )}
                      </>
                    )}

                    <div className="navbar__dropdown-divider" />

                    <button
                      className="navbar__dropdown-item navbar__dropdown-item--logout"
                      onClick={handleLogout}
                    >
                      <svg viewBox="0 0 32 32" aria-hidden="true">
                        <path
                          d="M6 30h14v-2H8V4h12V2H6v28zm20.83-15l-4.16-4.17-1.42 1.42L23.59 15H14v2h9.59l-2.34 2.34 1.42 1.42 4.16-4.17A1 1 0 0 0 26.83 15z"
                          fill="currentColor"
                        />
                      </svg>
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="navbar__dropdown-item navbar__dropdown-item--bold"
                      onClick={() => handleMenuClick("/register?role=GUEST")}
                    >
                      Sign up
                    </button>
                    <button
                      className="navbar__dropdown-item"
                      onClick={() => handleMenuClick("/login")}
                    >
                      Log in
                    </button>
                    <div className="navbar__dropdown-divider" />
                    <button
                      className="navbar__dropdown-item"
                      onClick={() => handleMenuClick("/register?role=HOST")}
                    >
                      Become a Host
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
