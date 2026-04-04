import api from "../utils/axiosConfig";

const getUserProfile = async (userId) => {
  try {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch user profile:", err);
    return null;
  }
};

const getMyProfile = async () => {
  const response = await api.get("/api/users/me");
  return response.data;
};

const updateMyProfile = async (data) => {
  const response = await api.put("/api/users/me", data);
  return response.data;
};

const toggleFavoriteHost = async (hostId) => {
  // Get current profile, toggle the host in favoriteHostIds, then update
  const profile = await getMyProfile();
  const current = profile.favoriteHostIds || [];
  let updated;
  if (current.includes(hostId)) {
    updated = current.filter((id) => id !== hostId);
  } else {
    updated = [...current, hostId];
  }
  const response = await api.put("/api/users/me", { favoriteHostIds: updated });
  return response.data;
};

const userService = {
  getUserProfile,
  getMyProfile,
  updateMyProfile,
  toggleFavoriteHost,
};

export default userService;
