import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { markHelpful } from "../services/reviewService";
import { toast } from "react-toastify";
import "./ReviewsSection.css";

const ReviewsSection = ({ reviews, averageRating, reviewCount, categoryScores }) => {
  const [showAll, setShowAll] = useState(false);
  const [localReviews, setLocalReviews] = useState([]);
  const { user } = useAuth();
  
  useEffect(() => {
    setLocalReviews(reviews || []);
  }, [reviews]);

  const displayedReviews = showAll ? localReviews : localReviews.slice(0, 6);

  const handleHelpfulClick = async (reviewId) => {
    if (!user) {
      toast.info("Please log in to mark reviews as helpful");
      return;
    }

    try {
      const response = await markHelpful(reviewId, user.userId);
      setLocalReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? response : r))
      );
    } catch (error) {
      console.error("Failed to mark review as helpful:", error);
      toast.error("Failed to update helpful status");
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={`full-${i}`} className="star star-full">★</span>);
    }
    if (hasHalfStar) {
      stars.push(<span key="half" className="star star-half">★</span>);
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="star star-empty">☆</span>);
    }
    return stars;
  };

  const renderRatingBar = (score) => {
    const percentage = (score / 5) * 100;
    return (
      <div className="rating-bar">
        <div className="rating-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div className="reviews-section">
        <h2 className="reviews-title">Reviews</h2>
        <p className="reviews-empty">No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  return (
    <div className="reviews-section">
      {/* Overall Rating Header */}
      <div className="reviews-header">
        <div className="reviews-overall">
          <div className="overall-rating-badge">
            <span className="rating-icon">★</span>
            <span className="rating-number">{averageRating?.toFixed(2)}</span>
          </div>
          <div className="overall-info">
            <h2 className="reviews-title">Guest favorite</h2>
            <p className="reviews-subtitle">
              One of the most loved homes on Airbnb based on ratings, reviews, and reliability
            </p>
            <p className="reviews-count">{reviewCount} reviews</p>
          </div>
        </div>
      </div>

      {/* Category Ratings */}
      {categoryScores && (
        <div className="category-ratings">
          <div className="category-grid">
            <div className="category-item">
              <div className="category-header">
                <span className="category-icon">🧹</span>
                <span className="category-name">Cleanliness</span>
              </div>
              <div className="category-score">
                <span className="score-number">{categoryScores.cleanliness?.toFixed(1)}</span>
                {renderRatingBar(categoryScores.cleanliness)}
              </div>
            </div>
            <div className="category-item">
              <div className="category-header">
                <span className="category-icon">✓</span>
                <span className="category-name">Accuracy</span>
              </div>
              <div className="category-score">
                <span className="score-number">{categoryScores.accuracy?.toFixed(1)}</span>
                {renderRatingBar(categoryScores.accuracy)}
              </div>
            </div>
            <div className="category-item">
              <div className="category-header">
                <span className="category-icon">🔑</span>
                <span className="category-name">Check-in</span>
              </div>
              <div className="category-score">
                <span className="score-number">{categoryScores.checkIn?.toFixed(1)}</span>
                {renderRatingBar(categoryScores.checkIn)}
              </div>
            </div>
            <div className="category-item">
              <div className="category-header">
                <span className="category-icon">💬</span>
                <span className="category-name">Communication</span>
              </div>
              <div className="category-score">
                <span className="score-number">{categoryScores.communication?.toFixed(1)}</span>
                {renderRatingBar(categoryScores.communication)}
              </div>
            </div>
            <div className="category-item">
              <div className="category-header">
                <span className="category-icon">📍</span>
                <span className="category-name">Location</span>
              </div>
              <div className="category-score">
                <span className="score-number">{categoryScores.location?.toFixed(1)}</span>
                {renderRatingBar(categoryScores.location)}
              </div>
            </div>
            <div className="category-item">
              <div className="category-header">
                <span className="category-icon">💰</span>
                <span className="category-name">Value</span>
              </div>
              <div className="category-score">
                <span className="score-number">{categoryScores.value?.toFixed(1)}</span>
                {renderRatingBar(categoryScores.value)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Reviews */}
      <div className="reviews-list">
        {displayedReviews.map((review) => {
          const hasMarkedHelpful = user && review.helpfulByUserIds?.includes(user.userId);
          return (
          <div key={review.id} className="review-card">
            <div className="review-header">
              <div className="reviewer-info">
                <div className="reviewer-avatar">
                  {review.guestProfileImage ? (
                    <img src={review.guestProfileImage} alt={review.guestName} />
                  ) : (
                    <span>{review.guestName?.charAt(0) || "?"}</span>
                  )}
                </div>
                <div className="reviewer-details">
                  <h4 className="reviewer-name">{review.guestName}</h4>
                  <p className="review-date">{formatDate(review.createdAt)}</p>
                </div>
              </div>
              <div className="review-rating">
                {renderStars(review.overallRating)}
                <span className="rating-value">{review.overallRating?.toFixed(1)}</span>
              </div>
            </div>

            {/* Mentioned Categories */}
            {review.mentionedCategories && review.mentionedCategories.length > 0 && (
              <div className="review-categories">
                {review.mentionedCategories.map((cat, idx) => (
                  <span key={idx} className="category-tag">{cat}</span>
                ))}
              </div>
            )}

            <p className="review-text">{review.reviewText}</p>

            {/* Host Response */}
            {review.hostResponse && (
              <div className="host-response">
                <div className="response-header">
                  <strong>Response from host:</strong>
                  <span className="response-date">{formatDate(review.hostResponseDate)}</span>
                </div>
                <p className="response-text">{review.hostResponse}</p>
              </div>
            )}

            {/* Helpful Button */}
            <div className="review-footer">
              <button 
                className={`helpful-btn ${hasMarkedHelpful ? "active" : ""}`}
                onClick={() => handleHelpfulClick(review.id)}
                style={{ 
                  fontWeight: hasMarkedHelpful ? "bold" : "normal",
                  color: hasMarkedHelpful ? "#222222" : "#717171" 
                }}
              >
                👍 Helpful ({review.helpfulCount || 0})
              </button>
              {review.isGuestFavorite && (
                <span className="favorite-badge">⭐ Guest favorite</span>
              )}
            </div>
          </div>
        )})}
      </div>

      {/* Show More Button */}
      {reviews.length > 6 && (
        <div className="reviews-actions">
          <button className="show-more-btn" onClick={() => setShowAll(!showAll)}>
            {showAll ? `Show less` : `Show all ${reviews.length} reviews`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;
