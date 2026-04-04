import { useCallback, useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import "../components/Navbar.css";
import { useAuth } from "../context/AuthContext";
import { getHostSuggestions } from "../services/hostsService";
import userService from "../services/userService";
import {
  TOP_OFFERING_FILTERS,
  getNightlyRate,
  getTaxPercent,
  hasAmenity,
  isGuestFavorite,
} from "../utils/hostUtils";
import { getOptimizedImageUrl } from "../utils/imageUtils";

const ITEMS_PER_PAGE = 150; // Increased items to get more full rows per country
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = "host_suggestions_cache_v2";

const HomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuth();
  const [favorites, setFavorites] = useState(
    new Set(user?.favoriteHostIds || []),
  );

  // Keep favorites in sync with user context
  useEffect(() => {
    setFavorites(new Set(user?.favoriteHostIds || []));
  }, [user?.favoriteHostIds]);

  const handleToggleFavorite = async (e, hostId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info("Please log in to save to your wishlists");
      navigate("/login");
      return;
    }
    try {
      const updated = await userService.toggleFavoriteHost(hostId);
      const newFavs = updated.favoriteHostIds || [];
      setFavorites(new Set(newFavs));
      updateUser({ favoriteHostIds: newFavs });
      if (newFavs.includes(hostId)) {
        toast.success("Saved to wishlist");
      } else {
        toast.info("Removed from wishlist");
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
      toast.error("Failed to update wishlist");
    }
  };

  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const [locationQuery, setLocationQuery] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [guestCounts, setGuestCounts] = useState({
    adults: 0,
    children: 0,
    infants: 0,
    pets: 0,
  });
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [showTax, setShowTax] = useState(false);
  const [activeFilters, setActiveFilters] = useState(new Set());

  // Cache helper functions
  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log("Using cached host suggestions");
          return data;
        }
      }
    } catch (err) {
      console.warn("Failed to read cache:", err);
    }
    return null;
  }, []);

  const setCachedData = useCallback((data) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.warn("Failed to set cache:", err);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const cachedData = getCachedData();
        if (cachedData && alive) {
          setHosts(Array.isArray(cachedData) ? cachedData : []);
          setLoading(false);
        }

        // Fetch data for current page with server-side pagination
        const currentPage = page - 1; // Convert to 0-based for backend
        const data = await getHostSuggestions(ITEMS_PER_PAGE, currentPage);
        if (!alive) return;

        const validData = Array.isArray(data) ? data : [];
        setHosts(validData);
        setCachedData(validData);
      } catch (err) {
        console.error("Failed to load hosts", err);
        if (alive) {
          setHosts([]);
          // Auto-retry once after 2 seconds on first failure
          if (retryCount === 0) {
            setTimeout(() => {
              if (alive) setRetryCount(1);
            }, 2000);
          } else {
            setError(err);
          }
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [page, retryCount, getCachedData, setCachedData]);

  const toggleFilter = (f) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
    setPage(1);
  };

  // Filtered + sorted hosts (no client-side pagination needed now)
  const processedHosts = useMemo(() => {
    let result = [...hosts];

    // Apply filters
    TOP_OFFERING_FILTERS.forEach((filter) => {
      if (activeFilters.has(filter.key)) {
        result = result.filter((host) => hasAmenity(host, filter.amenity));
      }
    });
    if (activeFilters.has("favorite")) {
      result = result.filter((h) => isGuestFavorite(h));
    }

    // Apply sorting
    if (sortBy === "price-low") {
      result.sort((a, b) => getNightlyRate(a) - getNightlyRate(b));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => getNightlyRate(b) - getNightlyRate(a));
    } else if (sortBy === "rating") {
      result.sort((a, b) => {
        const rA = a.averageRating ?? 0;
        const rB = b.averageRating ?? 0;
        return rB - rA; // Highest rated first
      });
    }

    return result;
  }, [hosts, activeFilters, sortBy]);

  // For server-side pagination, we show what we received
  const displayedHosts = processedHosts;
  const hasMoreData = hosts.length === ITEMS_PER_PAGE; // Assume more data if we got a full page

  // For pagination UI, calculate total pages more accurately
  // Since we don't have total count from backend, estimate based on current data
  const totalPages = Math.max(1, page + (hasMoreData ? 2 : 0)); // Show more pages if we have data
  const startIdx = (page - 1) * ITEMS_PER_PAGE;

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const totalGuestCount =
    guestCounts.adults + guestCounts.children + guestCounts.infants;

  const guestSummary = totalGuestCount
    ? `${totalGuestCount} guest${totalGuestCount > 1 ? "s" : ""}`
    : "Add guests";

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (locationQuery) params.append("location", locationQuery);
    if (startDate) params.append("checkin", startDate.toISOString());
    if (endDate) params.append("checkout", endDate.toISOString());
    if (totalGuestCount > 0) params.append("guests", totalGuestCount);
    navigate(`/search?${params.toString()}`);
  };

  const getPrimaryImage = (host) =>
    (host?.hostPortfolioImages && host.hostPortfolioImages.length > 0
      ? host.hostPortfolioImages[0]
      : null) ||
    host?.profileImage ||
    null;

  const getHostTitle = (host) =>
    host?.hostDisplayName ||
    [host?.firstName, host?.lastName].filter(Boolean).join(" ");

  const getLocation = (host) =>
    host?.district
      ? `${host.district}, ${host.country}`
      : host?.city || host?.country || "Unknown Location";

  /* ── Pagination numbers ── */
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  /* ── Skeleton loader ── */
  const renderSkeletons = () =>
    Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="home-suggest__tile home-skeleton-card">
        <div className="home-suggest__tile-media skeleton-pulse" />
        <div className="home-suggest__tile-body">
          <div
            className="skeleton-pulse"
            style={{
              width: "70%",
              height: 16,
              borderRadius: 6,
              marginBottom: 8,
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "50%",
              height: 14,
              borderRadius: 4,
              marginBottom: 6,
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "40%",
              height: 14,
              borderRadius: 4,
              marginBottom: 8,
            }}
          />
          <div
            className="skeleton-pulse"
            style={{ width: "30%", height: 16, borderRadius: 4 }}
          />
        </div>
      </div>
    ));

  const renderLocationGroups = () => {
    // Group hosts by country
    const groupedHosts = displayedHosts.reduce((groups, host) => {
      const country = host?.country || "Unknown Country";
      if (!groups[country]) {
        groups[country] = [];
      }
      groups[country].push(host);
      return groups;
    }, {});

    // Filter to prioritize countries with at least 5 hosts so we get full rows
    const validCountryEntries = Object.entries(groupedHosts).filter(
      ([country, hosts]) => hosts.length >= 5,
    );

    // If too few countries meet the criteria, fallback to all
    const entriesToDisplay =
      validCountryEntries.length >= 2
        ? validCountryEntries
        : Object.entries(groupedHosts);

    // Limit to maximum 7 countries per page
    const countryEntries = entriesToDisplay.slice(0, 7);

    return countryEntries.map(([country, hosts]) => {
      // To ensure full rows, slice to the highest multiple of 5, max 10
      const maxItems = Math.floor(hosts.length / 5) * 5;
      const displayCount = maxItems > 0 ? Math.min(maxItems, 10) : hosts.length;
      const selectedHosts = hosts.slice(0, displayCount);

      return (
        <div key={country} className="location-group">
          <h3 className="location-header">Popular homes in {country}</h3>
          <div className="home-suggest__grid home-suggest__grid--5-cols">
            {selectedHosts.map((h, index) => (
              <div key={`${h.userId}-${index}`}>{renderCard(h)}</div>
            ))}
          </div>
        </div>
      );
    });
  };

  const renderCard = (host) => {
    const primaryImage = getPrimaryImage(host);
    const imgUrl = getOptimizedImageUrl(primaryImage);

    const fallbackUrl = `https://picsum.photos/680/510?random=${host.userId?.slice(-8) || Math.random()}`;
    const img = imgUrl || fallbackUrl;

    const title = getHostTitle(host);
    const location = getLocation(host);
    const price = getNightlyRate(host);
    const taxPct = getTaxPercent(host);
    const rating = host?.averageRating || 4.8;
    const priceWithTax = Math.round(price * (1 + taxPct / 100));

    return (
      <Link
        to={`/rooms/${host.userId}`}
        key={host.userId}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <article className="home-suggest__tile">
          <div className="home-suggest__tile-media">
            <img
              src={img}
              alt={title}
              className="home-suggest__tile-img"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = fallbackUrl;
              }}
            />
            <button
              className={`home-suggest__heart ${favorites.has(host.userId) ? "active" : ""}`}
              onClick={(e) => handleToggleFavorite(e, host.userId)}
            >
              <svg
                viewBox="0 0 32 32"
                aria-hidden="true"
                role="presentation"
                focusable="false"
              >
                <path d="m16 28c7-4.733 14-10 14-17 0-1.792-.683-3.583-2.05-4.95-1.367-1.366-3.158-2.05-4.95-2.05-1.791 0-3.583.684-4.949 2.05l-2.051 2.051-2.05-2.051c-1.367-1.366-3.158-2.05-4.95-2.05-1.791 0-3.583.684-4.949 2.05-1.367 1.367-2.051 3.158-2.051 4.95 0 7 7 12.267 14 17z" />
              </svg>
            </button>
            {isGuestFavorite(host) && (
              <div className="home-suggest__badge">Guest favorite</div>
            )}
          </div>
          <div className="home-suggest__tile-body">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div className="home-suggest__tile-title">{title}</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "15px",
                }}
              >
                <svg
                  viewBox="0 0 32 32"
                  aria-hidden="true"
                  style={{
                    display: "block",
                    height: "12px",
                    width: "12px",
                    fill: "currentcolor",
                  }}
                >
                  <path d="M15.094 1.579l-4.124 8.885-9.86 1.27a1 1 0 0 0-.54 1.736l7.293 6.652-1.948 9.574a1.001 1.001 0 0 0 1.483 1.076l8.599-4.795 8.601 4.795a1 1 0 0 0 1.482-1.076l-1.948-9.574 7.294-6.652a1 1 0 0 0-.54-1.736l-9.86-1.27-4.126-8.885a1 1 0 0 0-1.798 0z" />
                </svg>
                <span>{rating.toFixed(2)}</span>
              </div>
            </div>
            <div className="home-suggest__tile-meta">{location}</div>
            <div className="home-suggest__tile-meta">
              Stay with {host.firstName}
            </div>
            <div className="home-suggest__tile-price">
              {showTax ? (
                <>
                  <span>${priceWithTax}</span> night
                  <span className="home-suggest__tile-tax"> incl. tax</span>
                </>
              ) : (
                <>
                  <span>${price}</span> night
                </>
              )}
            </div>
          </div>
        </article>
      </Link>
    );
  };

  return (
    <div className="page-wrapper">
      <section className="page-content" style={{ paddingTop: "80px" }}>
        <div className="container">
          <div className="home-search-section">
            <div className="home-search-bar">
              <div className="search-field search-field--where">
                <label>Where</label>
                <input
                  type="text"
                  placeholder="Search destinations"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  list="locations-list"
                />
                <datalist id="locations-list">
                  <option value="Dhaka" />
                  <option value="Bangkok" />
                  <option value="New York" />
                  <option value="London" />
                  <option value="Tokyo" />
                  <option value="Istanbul" />
                </datalist>
              </div>
              <div className="search-divider" />
              <div className="search-field search-field--when">
                <label>When</label>
                <div className="when-values">
                  <DatePicker
                    selected={startDate}
                    onChange={(d) => setStartDate(d)}
                    placeholderText="Check in"
                    className="date-picker-input"
                    dateFormat="MMM d"
                    minDate={new Date()}
                  />
                  <DatePicker
                    selected={endDate}
                    onChange={(d) => setEndDate(d)}
                    placeholderText="Check out"
                    className="date-picker-input"
                    dateFormat="MMM d"
                    minDate={startDate || new Date()}
                  />
                </div>
              </div>
              <div className="search-divider" />
              <div
                className="search-field search-field--who"
                onClick={() => setIsGuestOpen(!isGuestOpen)}
              >
                <label>Who</label>
                <div
                  style={{
                    color: totalGuestCount > 0 ? "#222" : "#717171",
                    fontSize: "14px",
                  }}
                >
                  {guestSummary}
                </div>
                {isGuestOpen && (
                  <div
                    className="guest-dropdown"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: "0",
                      background: "white",
                      padding: "16px",
                      borderRadius: "16px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                      width: "340px",
                      zIndex: 9999,
                      marginTop: "12px",
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    {[
                      {
                        key: "adults",
                        label: "Adults",
                        sub: "Ages 13 or above",
                      },
                      { key: "children", label: "Children", sub: "Ages 2–12" },
                      { key: "infants", label: "Infants", sub: "Under 2" },
                      { key: "pets", label: "Pets", sub: "Bringing a pet?" },
                    ].map(({ key, label, sub }) => (
                      <div
                        className="guest-row"
                        key={key}
                        style={{ marginBottom: "10px" }}
                      >
                        <div>
                          <div className="guest-label">{label}</div>
                          <div className="guest-sub">{sub}</div>
                        </div>
                        <div className="guest-counter">
                          <button
                            onClick={() =>
                              setGuestCounts((prev) => ({
                                ...prev,
                                [key]: Math.max(0, prev[key] - 1),
                              }))
                            }
                          >
                            -
                          </button>
                          <span>{guestCounts[key]}</span>
                          <button
                            onClick={() =>
                              setGuestCounts((prev) => ({
                                ...prev,
                                [key]: prev[key] + 1,
                              }))
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="search-button-container">
                <button className="search-button" onClick={handleSearch}>
                  <svg
                    viewBox="0 0 32 32"
                    aria-hidden="true"
                    role="presentation"
                    focusable="false"
                  >
                    <path d="M13 24a11 11 0 1 0 0-22 11 11 0 0 0 0 22zm8-3 9 9" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container home-suggest">
          {loading ? (
            <>
              <h2
                className="home-suggest__section-title"
                style={{ marginBottom: "24px" }}
              >
                Explore homes in top destinations
              </h2>
              <div className="home-suggest__grid">{renderSkeletons()}</div>
            </>
          ) : error ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 0",
                color: "#717171",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#222",
                  marginBottom: 8,
                }}
              >
                Unable to load homes
              </h3>
              <p style={{ marginBottom: 20 }}>
                We encountered a connection issue. Please try again.
              </p>
              <button
                onClick={() => {
                  setError(null);
                  setRetryCount((c) => c + 1);
                }}
                style={{
                  padding: "12px 28px",
                  background: "#222",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                🔄 Try Again
              </button>
            </div>
          ) : (
            <>
              <h2
                className="home-suggest__section-title"
                style={{ marginBottom: "16px" }}
              >
                Explore homes in top destinations
              </h2>

              {/* ── Toolbar: Filters + Sort + Tax Toggle ── */}
              <div className="home-toolbar">
                <div className="home-toolbar__filters">
                  {TOP_OFFERING_FILTERS.map((filter) => (
                    <label
                      key={filter.key}
                      className={`filter-pill ${activeFilters.has(filter.key) ? "filter-pill--active" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={activeFilters.has(filter.key)}
                        onChange={() => toggleFilter(filter.key)}
                        style={{ margin: 0 }}
                      />
                      <span>{filter.label}</span>
                    </label>
                  ))}
                  <label
                    className={`filter-pill ${activeFilters.has("favorite") ? "filter-pill--active" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={activeFilters.has("favorite")}
                      onChange={() => toggleFilter("favorite")}
                      style={{ margin: 0 }}
                    />
                    <span>Guest favorite</span>
                  </label>
                  <div style={{ display: "none" }}>
                    <button
                      className={`filter-pill ${activeFilters.has("wifi") ? "filter-pill--active" : ""}`}
                      onClick={() => toggleFilter("wifi")}
                    >
                      📶 Wifi
                    </button>
                    <button
                      className={`filter-pill ${activeFilters.has("kitchen") ? "filter-pill--active" : ""}`}
                      onClick={() => toggleFilter("kitchen")}
                    >
                      🍳 Kitchen
                    </button>
                    <button
                      className={`filter-pill ${activeFilters.has("favorite") ? "filter-pill--active" : ""}`}
                      onClick={() => toggleFilter("favorite")}
                    >
                      ⭐ Guest favorite
                    </button>
                  </div>
                </div>

                <div className="home-toolbar__right">
                  <select
                    className="home-sort-select"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="default">Sort by</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Top Rated</option>
                  </select>

                  <label className="home-tax-toggle">
                    <span>Display total after taxes</span>
                    <div
                      className={`toggle-switch ${showTax ? "toggle-switch--on" : ""}`}
                      onClick={() => setShowTax(!showTax)}
                    >
                      <div className="toggle-switch__knob" />
                    </div>
                  </label>
                </div>
              </div>

              {/* Showing info */}
              <div className="home-pagination-info">
                {displayedHosts.length > 0 ? (
                  <>
                    Showing {startIdx + 1}–{startIdx + displayedHosts.length} of{" "}
                    {displayedHosts.length} homes
                    {hasMoreData && " (more pages available)"}
                  </>
                ) : (
                  <>Showing 0 homes</>
                )}
              </div>

              {hosts.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 0",
                    color: "#717171",
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: "#222",
                      marginBottom: 8,
                    }}
                  >
                    No homes found
                  </h3>
                  <p>Check back later for new listings.</p>
                </div>
              ) : processedHosts.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 0",
                    color: "#717171",
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: "#222",
                      marginBottom: 8,
                    }}
                  >
                    No homes match your filters
                  </h3>
                  <p>Try removing some filters to see more results.</p>
                </div>
              ) : (
                <>
                  {renderLocationGroups()}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <nav
                      className="home-pagination"
                      aria-label="Page navigation"
                    >
                      <button
                        className="home-pagination__btn home-pagination__btn--arrow"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                      >
                        ‹
                      </button>
                      {getPageNumbers().map((p, i) =>
                        p === "..." ? (
                          <span
                            key={`dots-${i}`}
                            className="home-pagination__dots"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            className={`home-pagination__btn ${p === page ? "home-pagination__btn--active" : ""}`}
                            onClick={() => handlePageChange(p)}
                          >
                            {p}
                          </button>
                        ),
                      )}
                      <button
                        className="home-pagination__btn home-pagination__btn--arrow"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                      >
                        ›
                      </button>
                    </nav>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />

      <style>{`
        .date-picker-input { border: none; width: 100%; font-family: inherit; font-size: 14px; color: #222; background: transparent; outline: none; cursor: pointer; }
        .search-field--when .when-values { display: flex; gap: 8px; }
        .search-field--when .react-datepicker-wrapper { flex: 1; }
        .search-field--when .react-datepicker__input-container input { width: 100%; }
        .guest-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          padding: 16px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          width: 340px;
          z-index: 9999;
          margin-top: 12px;
          border: 1px solid rgba(0,0,0,0.08);
        }
        .guest-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .guest-label { font-weight: 600; color: #222; }
        .guest-sub { font-size: 12px; color: #717171; }
        .guest-counter { display: flex; align-items: center; gap: 10px; }
        .guest-counter button { width: 30px; height: 30px; border-radius: 50%; border: 1px solid #ddd; background: white; display: grid; place-items: center; color: #717171; }
        .guest-counter button:hover { border-color: #222; color: #222; }
        .home-suggest__heart svg {
          display: block;
          fill: rgba(0,0,0,0.5);
          height: 24px;
          width: 24px;
          stroke: white;
          stroke-width: 2px;
          overflow: visible;
          transition: transform 0.2s ease, fill 0.2s ease;
        }
        .home-suggest__heart.active svg {
          fill: #FF385C;
          stroke: #FF385C;
          transform: scale(1.05);
        }
        .home-suggest__heart:hover svg {
          transform: scale(1.1);
        }
        .home-suggest__heart:active svg {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
};

export default HomePage;
