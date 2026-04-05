import api from "../utils/axiosConfig";

const sendMessage = async (receiverId, content) => {
  const response = await api.post("/api/messages", { receiverId, content });
  return response.data;
};

const getConversations = async () => {
  const response = await api.get("/api/messages/conversations");
  return response.data;
};

const getMessageHistory = async (otherUserId) => {
  const response = await api.get(`/api/messages/history/${otherUserId}`);
  return response.data;
};

const reactToMessage = async (messageId, reaction) => {
  const response = await api.post(`/api/messages/${messageId}/react?reaction=${reaction}`);
  return response.data;
};

const messageService = {
  sendMessage,
  getConversations,
  getMessageHistory,
  reactToMessage,
};

export default messageService;
