import api from "../utils/axiosConfig";

const BASE = "/api/bookings";

export const createBooking = async (bookingData) => {
  const response = await api.post(BASE, bookingData);
  return response.data;
};

export const getBooking = async (bookingId) => {
  const response = await api.get(`${BASE}/${bookingId}`);
  return response.data;
};

export const getAllBookings = async () => {
  const response = await api.get(BASE);
  return response.data;
};

export const getBookingsByGuest = async (guestId) => {
  const response = await api.get(`${BASE}/guest/${guestId}`);
  return response.data;
};

export const getBookingsByHost = async (hostId) => {
  const response = await api.get(`${BASE}/host/${hostId}`);
  return response.data;
};

export const confirmBooking = async (bookingId) => {
  const response = await api.put(`${BASE}/${bookingId}/confirm`);
  return response.data;
};

export const cancelBooking = async (bookingId, cancellationReason = "") => {
  const response = await api.put(`${BASE}/${bookingId}/cancel`, {
    cancellationReason,
  });
  return response.data;
};

export const checkinBooking = async (bookingId) => {
  const response = await api.put(`${BASE}/${bookingId}/checkin`);
  return response.data;
};

export const hostConfirmCheckIn = async (bookingId, hostId) => {
  const response = await api.put(`${BASE}/${bookingId}/host-checkin?hostId=${hostId}`);
  return response.data;
};

export const hostConfirmCheckOut = async (bookingId, hostId) => {
  const response = await api.put(`${BASE}/${bookingId}/host-checkout?hostId=${hostId}`);
  return response.data;
};

export const hostCancelBooking = async (bookingId, cancellationReason) => {
  const response = await api.put(`${BASE}/${bookingId}/cancel`, {
    cancellationReason,
    cancelledBy: "HOST"
  });
  return response.data;
};

export const processPayment = async (bookingId, paymentMethod = "CARD") => {
  const response = await api.put(`${BASE}/${bookingId}/process-payment?paymentMethod=${paymentMethod}`, {});
  return response.data;
};

export const approvePayment = async (bookingId) => {
  const response = await api.put(`${BASE}/${bookingId}/approve-payment`);
  return response.data;
};

export const completeBooking = async (bookingId) => {
  const response = await api.put(`${BASE}/${bookingId}/complete`);
  return response.data;
};

export const refundBooking = async (bookingId, reason = "") => {
  const response = await api.put(`${BASE}/${bookingId}/refund`, { reason });
  return response.data;
};

export const issuePayout = async (bookingId) => {
  const response = await api.put(`${BASE}/${bookingId}/payout`);
  return response.data;
};

export const updatePaymentStatus = async (bookingId, status) => {
  const response = await api.put(
    `${BASE}/${bookingId}/payment-status?status=${status}`
  );
  return response.data;
};

const bookingService = {
  createBooking,
  getBooking,
  getAllBookings,
  getBookingsByGuest,
  getBookingsByHost,
  confirmBooking,
  cancelBooking,
  checkinBooking,
  hostConfirmCheckIn,
  hostConfirmCheckOut,
  hostCancelBooking,
  processPayment,
  approvePayment,
  completeBooking,
  refundBooking,
  issuePayout,
  updatePaymentStatus,
};

export default bookingService;
