import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import userService from "../services/userService";
import Footer from "../components/Footer";
import "./WishlistsPage.css";

const WishlistsPage = () => {
  const { user, isAuthenticated, loading, updateUser } = useAuth();
  const [favoriteHosts, setFavoriteHosts] = useState([]);
  const [fetching, setFetching] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    const fetchWishlists = async () => {
      if (!user?.favoriteHostIds || user.favoriteHostIds.length === 0) {
        setFavoriteHosts([]);
        setFetching(false);
        return;
      }
      
      try {
        const promises = user.favoriteHostIds.map(id => userService.getUserProfile(id));
        const hosts = await Promise.all(promises);
        setFavoriteHosts(hosts.filter(Boolean));
      } catch (err) {
        console.error("Failed to fetch wishlisted hosts:", err);
      } finally {
        setFetching(false);
      }
    };
    
    if (user?.userId) {
      fetchWishlists();
    }
  }, [user]);

  const handleToggleFavorite = async (e, hostId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const updated = await userService.toggleFavoriteHost(hostId);
      const newFavs = updated.favoriteHostIds || [];
      // Update the centralized auth context so it persists on reload
      updateUser({ favoriteHostIds: newFavs }); 
      // Manually remove from local state to reflect change immediately
      setFavoriteHosts(prev => prev.filter(h => newFavs.includes(h.userId)));
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  if (loading || fetching) return <div className="loading-state">Loading your wishlists...</div>;

  return (
    <div className="page-wrapper">
      <div className="wishlists-page">
        <div className="wishlists-header">
          <h1>Your Wishlists</h1>
          <p>Homes and hosts you've saved for later</p>
        </div>
        
        {favoriteHosts.length === 0 ? (
          <div className="no-wishlists">
            <h2>No saved hosts yet</h2>
            <p>As you search, click the heart icon to save your favorite properties and hosts.</p>
            <button onClick={() => navigate("/")} className="primary-btn">
              Start exploring
            </button>
          </div>
        ) : (
          <div className="wishlists-grid">
            {favoriteHosts.map(host => (
              <div key={host.userId} className="wishlist-card" onClick={() => navigate(`/rooms/${host.userId}`)}>
                <div className="wishlist-card__image-container">
                  <img 
                    src={host.hostPortfolioImages?.[0] || host.profileImage || `https://picsum.photos/seed/${host.userId}-0/800/800`} 
                    alt={host.hostDisplayName || host.firstName} 
                    className="wishlist-card__image"
                  />
                  <button 
                    className="wishlist-card__heart active"
                    onClick={(e) => handleToggleFavorite(e, host.userId)}
                  >
                    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ fill: "#FF385C" }}>
                      <path d="m16 28c7-4.733 14-10 14-17 0-1.792-.683-3.583-2.05-4.95-1.367-1.366-3.158-2.05-4.95-2.05-1.791 0-3.583.684-4.949 2.05l-2.051 2.051-2.05-2.051c-1.367-1.366-3.158-2.05-4.95-2.05-1.791 0-3.583.684-4.949 2.05-1.367 1.367-2.051 3.158-2.051 4.95 0 7 7 12.267 14 17z"></path>
                    </svg>
                  </button>
                </div>
                <div className="wishlist-card__info">
                  <div className="wishlist-card__details">
                    <h3 className="wishlist-card__title">{host.hostDisplayName || host.firstName}</h3>
                    <p className="wishlist-card__subtitle">{host.propertyTypesOffered?.[0] || 'Home'} in {host.city || 'Location'}</p>
                    <div className="wishlist-card__price">
                      <span className="price-value">${host.nightlyRateUsd || 100}</span>
                      <span className="price-label"> night</span>
                    </div>
                  </div>
                  <div className="wishlist-card__rating">
                    <svg viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false"><path d="M15.094 1.579l-4.124 8.885-9.86 1.27a1 1 0 0 0-.542 1.736l7.293 6.565-1.965 9.852a1 1 0 0 0 1.483 1.061L16 25.951l8.625 4.997a1 1 0 0 0 1.482-1.06l-1.965-9.853 7.293-6.565a1 1 0 0 0-.541-1.735l-9.86-1.271-4.127-8.885a1 1 0 0 0-1.814 0z" fill="#222"></path></svg>
                    <span>{host.averageRating ? host.averageRating.toFixed(2) : "New"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default WishlistsPage;
