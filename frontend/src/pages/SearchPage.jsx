import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import "../components/Navbar.css";
import SearchResultsMap from "../components/SearchResultsMap";
import { useAuth } from "../context/AuthContext";
import { searchHosts } from "../services/hostsService";
import userService from "../services/userService";
import {
  TOP_OFFERING_FILTERS,
  getHostAmenities,
  getNightlyRate,
  getTaxPercent,
  hasAmenity,
  isGuestFavorite,
} from "../utils/hostUtils";
import { getOptimizedImageUrl } from "../utils/imageUtils";
import "./SearchPage.css";

const ITEMS_PER_PAGE = 8;
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes for search results
const SEARCH_CACHE_VERSION = "v3";

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuth();
  const [favorites, setFavorites] = useState(
    new Set(user?.favoriteHostIds || []),
  );

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
      toast.success(
        newFavs.includes(hostId)
          ? "Saved to wishlist"
          : "Removed from wishlist",
      );
    } catch (err) {
      toast.error("Failed to update wishlist");
    }
  };

  const locationQuery = searchParams.get("location") || "";
  const checkin = searchParams.get("checkin");
  const checkout = searchParams.get("checkout");
  const guests = parseInt(searchParams.get("guests") || "0", 10);

  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("default");
  const [showTax, setShowTax] = useState(false);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [page, setPage] = useState(1);

  // Inline search fields
  const [searchLoc, setSearchLoc] = useState(locationQuery);
  const [searchCheckin, setSearchCheckin] = useState(checkin || "");
  const [searchCheckout, setSearchCheckout] = useState(checkout || "");
  const [searchGuests, setSearchGuests] = useState(guests);

  // Generate cache key based on search params
  const getCacheKey = useCallback(() => {
    return `search_cache_${SEARCH_CACHE_VERSION}_${locationQuery}_${checkin}_${checkout}_${guests}`;
  }, [locationQuery, checkin, checkout, guests]);

  // Cache helpers
  const getCachedData = useCallback(() => {
    try {
      const cacheKey = getCacheKey();
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log("Using cached search results");
          return data;
        }
      }
    } catch (err) {
      console.warn("Failed to read search cache:", err);
    }
    return null;
  }, [getCacheKey]);

  const setCachedData = useCallback(
    (data) => {
      try {
        const cacheKey = getCacheKey();
        const cacheData = {
          data,
          timestamp: Date.now(),
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (err) {
        console.warn("Failed to set search cache:", err);
      }
    },
    [getCacheKey],
  );

  // Sync inline fields when URL search params change
  useEffect(() => {
    setSearchLoc(searchParams.get("location") || "");
    setSearchCheckin(searchParams.get("checkin") || "");
    setSearchCheckout(searchParams.get("checkout") || "");
    setSearchGuests(parseInt(searchParams.get("guests") || "0", 10));
  }, [searchParams]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      // Try cache first
      const cachedData = getCachedData();
      if (cachedData) {
        setHosts(Array.isArray(cachedData) ? cachedData : []);
        setLoading(false);
        return;
      }

      // Fetch fresh data
      const data = await searchHosts({
        location: locationQuery,
        checkin,
        checkout,
        guests,
      });

      const validData = Array.isArray(data) ? data : [];
      setHosts(validData);
      setCachedData(validData);
    } catch (err) {
      console.error("Search failed:", err);
      setHosts([]);
    } finally {
      setLoading(false);
    }
  }, [locationQuery, checkin, checkout, guests, getCachedData, setCachedData]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const toggleFilter = (f) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
    setPage(1);
  };

  const handleInlineSearch = () => {
    const params = new URLSearchParams();
    if (searchLoc) params.append("location", searchLoc);
    if (searchCheckin) params.append("checkin", searchCheckin);
    if (searchCheckout) params.append("checkout", searchCheckout);
    if (searchGuests > 0) params.append("guests", searchGuests);
    setSearchParams(params);
    setPage(1);
  };

  // Filter + sort
  const processedHosts = useMemo(() => {
    let result = [...hosts];

    // Apply filters
    TOP_OFFERING_FILTERS.forEach((filter) => {
      if (activeFilters.has(filter.key)) {
        result = result.filter((host) => hasAmenity(host, filter.amenity));
      }
    });
    if (activeFilters.has("favorite"))
      result = result.filter((h) => isGuestFavorite(h));

    // Apply sorting (always keeps all items - just reorders)
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

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(processedHosts.length / ITEMS_PER_PAGE),
  );
  const startIdx = (page - 1) * ITEMS_PER_PAGE;
  const displayedHosts = processedHosts.slice(
    startIdx,
    startIdx + ITEMS_PER_PAGE,
  );

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  const formatDateRange = () => {
    if (!checkin && !checkout) return null;
    const options = { month: "short", day: "numeric" };
    const start = checkin
      ? new Date(checkin).toLocaleDateString("en-US", options)
      : "";
    const end = checkout
      ? new Date(checkout).toLocaleDateString("en-US", options)
      : "";
    return `${start}${start && end ? " – " : ""}${end}`;
  };

  /* Skeleton loader cards */
  const renderSkeletons = () =>
    Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="search-card search-card--skeleton">
        <div className="search-card__image-container skeleton-pulse" />
        <div className="search-card__content">
          <div className="search-card__top">
            <div
              className="skeleton-pulse"
              style={{
                width: "60%",
                height: 14,
                borderRadius: 4,
                marginBottom: 8,
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: "80%",
                height: 18,
                borderRadius: 4,
                marginBottom: 10,
              }}
            />
            <div className="search-card__divider" />
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
              style={{ width: "40%", height: 14, borderRadius: 4 }}
            />
          </div>
          <div className="search-card__bottom">
            <div
              className="skeleton-pulse"
              style={{ width: 60, height: 14, borderRadius: 4 }}
            />
            <div
              className="skeleton-pulse"
              style={{ width: 80, height: 20, borderRadius: 4 }}
            />
          </div>
        </div>
      </div>
    ));

  return (
    <div className="search-page">
      {/* ── Inline Search Bar ── */}
      <div className="search-page__inline-bar">
        <input
          type="text"
          placeholder="Location"
          value={searchLoc}
          onChange={(e) => setSearchLoc(e.target.value)}
          className="search-inline__input"
          onKeyDown={(e) => e.key === "Enter" && handleInlineSearch()}
        />
        <input
          type="date"
          value={searchCheckin}
          onChange={(e) => setSearchCheckin(e.target.value)}
          className="search-inline__input search-inline__input--date"
        />
        <input
          type="date"
          value={searchCheckout}
          onChange={(e) => setSearchCheckout(e.target.value)}
          className="search-inline__input search-inline__input--date"
        />
        <input
          type="number"
          placeholder="Guests"
          min="0"
          value={searchGuests || ""}
          onChange={(e) => setSearchGuests(parseInt(e.target.value) || 0)}
          className="search-inline__input search-inline__input--guests"
          onKeyDown={(e) => e.key === "Enter" && handleInlineSearch()}
        />
        <button className="search-inline__btn" onClick={handleInlineSearch}>
          Search
        </button>
      </div>

      <div className="search-page__content">
        <div className="search-page__listings">
          <div className="search-page__header">
            <p className="search-page__meta">
              {loading
                ? "Searching..."
                : processedHosts.length > 0
                  ? `${processedHosts.length}+ stays`
                  : "No stays found"}
              {locationQuery && ` in ${locationQuery}`}
              {formatDateRange() && ` · ${formatDateRange()}`}
              {guests > 0 && ` · ${guests} guests`}
            </p>
            <h1 className="search-page__title">
              Stays in {locationQuery || "selected area"}
            </h1>

            {/* ── Filters + Sort ── */}
            <div className="search-page__filters">
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
              <select
                className="filter-pill filter-sort-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
              >
                <option value="default">Sort by</option>
                <option value="price-low">Price: Low → High</option>
                <option value="price-high">Price: High → Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>

            <div className="search-page__taxes">
              <div className="tax-toggle">
                <span className="tax-icon">🏷️</span>
                <span className="tax-text">Display total after taxes</span>
                <div
                  className={`toggle-switch ${showTax ? "toggle-switch--on" : ""}`}
                  onClick={() => setShowTax(!showTax)}
                >
                  <div className="toggle-switch__knob" />
                </div>
              </div>
            </div>
          </div>

          <div className="search-list">
            {loading ? (
              renderSkeletons()
            ) : processedHosts.length === 0 ? (
              <div className="search-empty">
                <div className="search-empty__icon">🏡</div>
                <h3>No stays found</h3>
                <p>
                  Try adjusting your search or filters to find what you're
                  looking for.
                </p>
              </div>
            ) : (
              <>
                {/* Showing count */}
                <div className="search-page__pagination-info">
                  Showing {startIdx + 1}–
                  {Math.min(startIdx + ITEMS_PER_PAGE, processedHosts.length)}{" "}
                  of {processedHosts.length} stays
                </div>

                {displayedHosts.map((host) => {
                  const price = getNightlyRate(host);
                  const taxPct = getTaxPercent(host);
                  const priceWithTax = Math.round(price * (1 + taxPct / 100));
                  const optimizedImage = getOptimizedImageUrl(
                    host.hostPortfolioImages?.[0] || host.profileImage,
                  );

                  return (
                    <div
                      key={host.userId}
                      className="search-card"
                      onClick={() =>
                        navigate(
                          `/rooms/${host.userId}${
                            checkin || checkout
                              ? `?checkin=${checkin || ""}&checkout=${checkout || ""}&guests=${guests}`
                              : ""
                          }`,
                        )
                      }
                    >
                      <div className="search-card__image-container">
                        <img
                          src={optimizedImage}
                          alt={host.hostDisplayName}
                          className="search-card__img"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "";
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                        {!optimizedImage && (
                          <div
                            className="search-card__img-placeholder"
                            style={{
                              display: optimizedImage ? "none" : "flex",
                              background: "#f0f0f0",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#999",
                            }}
                          >
                            No Image
                          </div>
                        )}
                        {isGuestFavorite(host) && (
                          <div className="search-card__badge">
                            Guest favorite
                          </div>
                        )}
                        <button
                          className={`search-card__heart ${favorites.has(host.userId) ? "active" : ""}`}
                          onClick={(e) => handleToggleFavorite(e, host.userId)}
                        >
                          <svg viewBox="0 0 32 32" aria-hidden="true">
                            <path d="m16 28c7-4.733 14-10 14-17 0-1.792-.683-3.583-2.05-4.95-1.367-1.366-3.158-2.05-4.95-2.05-1.791 0-3.583.684-4.949 2.05l-2.051 2.051-2.05-2.051c-1.367-1.366-3.158-2.05-4.95-2.05-1.791 0-3.583.684-4.949 2.05-1.367 1.367-2.051 3.158-2.051 4.95 0 7 7 12.267 14 17z" />
                          </svg>
                        </button>
                      </div>
                      <div className="search-card__content">
                        <div className="search-card__top">
                          <div className="search-card__subtitle">
                            {host.propertyTypesOffered?.[0] || "Apartment"} in{" "}
                            {host.district || host.city || host.area}
                          </div>
                          <div className="search-card__title">
                            {host.hostDisplayName ||
                              `${host.firstName}'s place`}
                          </div>
                          <div className="search-card__divider" />
                          <div className="search-card__features">
                            {host.guestCapacity || 2} guests ·{" "}
                            {host.bedCount || 1} bedroom · {host.bedCount || 1}{" "}
                            bed · 1 bath
                          </div>
                          <div className="search-card__features">
                            {getHostAmenities(host).slice(0, 3).join(" · ")}
                          </div>
                        </div>
                        <div className="search-card__bottom">
                          <div className="search-card__rating">
                            <span className="star">★</span>
                            <span className="rating-val">
                              {host.averageRating?.toFixed(2) || "New"}
                            </span>
                            {host.reviewCount > 0 && (
                              <span className="review-count">
                                ({host.reviewCount})
                              </span>
                            )}
                          </div>
                          <div className="search-card__price">
                            {showTax ? (
                              <>
                                <span className="price-val">
                                  ${priceWithTax}
                                </span>
                                <span className="price-unit">
                                  {" "}
                                  night{" "}
                                  <small
                                    style={{
                                      color: "#717171",
                                      fontWeight: 400,
                                    }}
                                  >
                                    incl. tax
                                  </small>
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="price-val">${price}</span>
                                <span className="price-unit"> night</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                  <nav
                    className="search-pagination"
                    aria-label="Search results pagination"
                  >
                    <button
                      className="search-pagination__btn search-pagination__btn--arrow"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                    >
                      ‹
                    </button>
                    {getPageNumbers().map((p, i) =>
                      p === "..." ? (
                        <span
                          key={`dots-${i}`}
                          className="search-pagination__dots"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          className={`search-pagination__btn ${p === page ? "search-pagination__btn--active" : ""}`}
                          onClick={() => handlePageChange(p)}
                        >
                          {p}
                        </button>
                      ),
                    )}
                    <button
                      className="search-pagination__btn search-pagination__btn--arrow"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                    >
                      ›
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="search-page__footer">
            <Footer />
          </div>
        </div>

        <div className="search-page__map-container">
          <div className="search-page__map-placeholder">
            <SearchResultsMap hosts={processedHosts} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
