import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
const BASE_URL = `${API_BASE_URL}/api/users`;
const ADMIN_BASE_URL = `${API_BASE_URL}/api/admin`;

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

const toStoredUser = (payload) => ({
  userId: payload.userId,
  email: payload.email,
  firstName: payload.firstName,
  lastName: payload.lastName,
  role: payload.role,
  profileImage: payload.profileImage || "",
  emailVerified: Boolean(payload.emailVerified),
  verificationStatus: payload.verificationStatus || "NOT_REQUESTED",
  canBook: Boolean(payload.canBook),
  canHost: Boolean(payload.canHost),
});

const persistAuth = (payload) => {
  if (!payload?.token) {
    return;
  }
  localStorage.setItem("token", payload.token);
  localStorage.setItem("user", JSON.stringify(toStoredUser(payload)));
};

export const register = async (data) => {
  const response = await axios.post(`${BASE_URL}/register`, data);
  persistAuth(response.data);
  return response.data;
};

export const login = async (data) => {
  const response = await axios.post(`${BASE_URL}/login`, data);
  persistAuth(response.data);
  return response.data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const verifyEmail = async (token) => {
  const response = await axios.get(`${BASE_URL}/verify-email`, {
    params: { token },
    headers: {
      Authorization: undefined,
    },
  });
  return response.data;
};

export const resendVerification = async () => {
  const response = await axios.post(`${BASE_URL}/me/resend-verification`);
  return response.data;
};

export const getMyProfile = async () => {
  const response = await axios.get(`${BASE_URL}/me`);
  return response.data;
};

export const updateMyProfile = async (data) => {
  const response = await axios.put(`${BASE_URL}/me`, data);
  return response.data;
};

export const changePassword = async (data) => {
  const response = await axios.put(`${BASE_URL}/me/password`, data);
  return response.data;
};

export const getUserById = async (userId) => {
  const response = await axios.get(`${BASE_URL}/${userId}`);
  return response.data;
};

export const getVerificationRequests = async () => {
  const response = await axios.get(`${ADMIN_BASE_URL}/verification-requests`);
  return response.data;
};

export const approveVerificationRequest = async (userId, data) => {
  const response = await axios.put(
    `${ADMIN_BASE_URL}/verification-requests/${userId}/approve`,
    data,
  );
  return response.data;
};

export const rejectVerificationRequest = async (userId, data) => {
  const response = await axios.put(
    `${ADMIN_BASE_URL}/verification-requests/${userId}/reject`,
    data,
  );
  return response.data;
};

export const getAdminUsers = async () => {
  const response = await axios.get(`${ADMIN_BASE_URL}/users`);
  return response.data;
};

export const forgotPassword = async (data) => {
  const response = await axios.post(`${BASE_URL}/forgot-password`, data);
  return response.data;
};

export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const getToken = () => localStorage.getItem("token");

const authService = {
  register,
  login,
  logout,
  verifyEmail,
  resendVerification,
  getMyProfile,
  updateMyProfile,
  changePassword,
  forgotPassword,
  getUserById,
  getVerificationRequests,
  approveVerificationRequest,
  rejectVerificationRequest,
  getAdminUsers,
  getCurrentUser,
  isAuthenticated,
  getToken,
};

export default authService;
