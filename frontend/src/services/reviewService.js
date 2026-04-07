import api from "../utils/axiosConfig";

const BASE = "/api/reviews";

export const createReview = async (reviewData) => {
  const response = await api.post(BASE, reviewData);
  return response.data;
};

export const getReview = async (reviewId) => {
  const response = await api.get(`${BASE}/${reviewId}`);
  return response.data;
};

export const getReviewsByHost = async (hostId) => {
  const response = await api.get(`${BASE}/host/${hostId}`);
  return response.data;
};

export const getReviewsByGuest = async (guestId) => {
  const response = await api.get(`${BASE}/guest/${guestId}`);
  return response.data;
};

export const getReviewsByProperty = async (propertyId) => {
  const response = await api.get(`${BASE}/property/${propertyId}`);
  return response.data;
};

export const addHostResponse = async (reviewId, response) => {
  const res = await api.put(`${BASE}/${reviewId}/response`, { response });
  return res.data;
};

export const markHelpful = async (reviewId, userId) => {
  const response = await api.put(`${BASE}/${reviewId}/helpful?userId=${userId}`);
  return response.data;
};

export const getPendingReviews = async () => {
  const response = await api.get(`${BASE}/pending`);
  return response.data;
};

export const approveReview = async (reviewId) => {
  const response = await api.put(`${BASE}/${reviewId}/approve`);
  return response.data;
};

export const rejectReview = async (reviewId) => {
  const response = await api.put(`${BASE}/${reviewId}/reject`);
  return response.data;
};

const reviewService = {
  createReview,
  getReview,
  getReviewsByHost,
  getReviewsByGuest,
  getReviewsByProperty,
  addHostResponse,
  markHelpful,
  getPendingReviews,
  approveReview,
  rejectReview,
};

export default reviewService;
