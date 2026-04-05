import api from "../utils/axiosConfig";

const NOTIFICATION_BASE_URL = "/api/notifications";

export const getUserNotifications = async (userId) => {
  const response = await api.get(`${NOTIFICATION_BASE_URL}/users/${userId}`);
  return response.data;
};

export const getRoleNotifications = async (role) => {
  const response = await api.get(`${NOTIFICATION_BASE_URL}/roles/${role}`);
  return response.data;
};

export const markNotificationAsRead = async (notificationId) => {
  const response = await api.put(
    `${NOTIFICATION_BASE_URL}/${notificationId}/read`,
  );
  return response.data;
};

const notificationService = {
  getUserNotifications,
  getRoleNotifications,
  markNotificationAsRead,
};

export default notificationService;
