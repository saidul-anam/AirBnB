import { Client } from "@stomp/stompjs";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import SockJS from "sockjs-client";

const WebSocketContext = createContext();
const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

export const WebSocketProvider = ({ children }) => {
  const [stompClient, setStompClient] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new SockJS(`${API_BASE_URL}/ws`);
    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      console.log("Connected to WebSocket");
      setConnected(true);
      setStompClient(client);
      toast.success("Real-time updates enabled");
    };

    client.onDisconnect = () => {
      console.log("Disconnected from WebSocket");
      setConnected(false);
      setStompClient(null);
      toast.info("Real-time updates disconnected");
    };

    client.onStompError = (frame) => {
      console.error("STOMP error:", frame);
      toast.error("WebSocket connection error");
    };

    client.activate();

    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, []);

  const subscribeToBookingUpdates = (userId, userRole) => {
    if (!stompClient || !connected) return null;

    const topic =
      userRole === "ADMIN"
        ? "/topic/admin/bookings"
        : userRole === "HOST"
          ? `/topic/hosts/${userId}/bookings`
          : `/topic/guests/${userId}/bookings`;

    const subscription = stompClient.subscribe(topic, (message) => {
      const update = JSON.parse(message.body);
      console.log("Received booking update:", update);

      // Handle different types of updates
      if (update.bookingStatus) {
        toast.info(`Booking status updated to: ${update.bookingStatus}`, {
          autoClose: 3000,
        });
      }

      if (update.paymentStatus) {
        toast.info(`Payment status updated to: ${update.paymentStatus}`, {
          autoClose: 3000,
        });
      }

      // Trigger a custom event for components to listen to
      window.dispatchEvent(
        new CustomEvent("bookingUpdate", {
          detail: update,
        }),
      );
    });

    return subscription;
  };

  const subscribeToPaymentUpdates = (userId) => {
    if (!stompClient || !connected) return null;

    const subscription = stompClient.subscribe(
      `/topic/guests/${userId}/payments`,
      (message) => {
        const update = JSON.parse(message.body);
        console.log("Received payment update:", update);

        toast.info(`Payment update: ${update.paymentStatus}`, {
          autoClose: 3000,
        });

        window.dispatchEvent(
          new CustomEvent("paymentUpdate", {
            detail: update,
          }),
        );
      },
    );

    return subscription;
  };

  return (
    <WebSocketContext.Provider
      value={{
        stompClient,
        connected,
        subscribeToBookingUpdates,
        subscribeToPaymentUpdates,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
