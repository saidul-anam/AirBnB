import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import notificationService from "../services/notificationService";

const POLL_INTERVAL_MS = 15000;

const parseBackendDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const normalizedValue =
    typeof value === "string" && !/[zZ]|[+-]\d{2}:\d{2}$/.test(value)
      ? `${value}Z`
      : value;

  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatRelativeTime = (value) => {
  if (!value) return "";
  const date = parseBackendDate(value);
  if (!date) return "";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const isUnread = (notification) => !notification.readAt;

const NotificationBell = ({ user }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);
  const panelRef = useRef(null);
  const initializedRef = useRef(false);
  const unreadIdsRef = useRef(new Set());

  const loadNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (!user?.userId) return;

      if (!silent) {
        setLoading(true);
      }

      try {
        const data =
          user.role === "ADMIN"
            ? await notificationService.getRoleNotifications("ADMIN")
            : await notificationService.getUserNotifications(user.userId);

        const normalized = (data || []).sort(
          (left, right) =>
            (parseBackendDate(right.createdAt)?.getTime() || 0) -
            (parseBackendDate(left.createdAt)?.getTime() || 0),
        );

        const nextUnreadIds = new Set(
          normalized.filter(isUnread).map((item) => item.notificationId),
        );

        if (initializedRef.current) {
          const previousUnreadIds = unreadIdsRef.current;
          const hasNewUnread = normalized.some(
            (item) =>
              nextUnreadIds.has(item.notificationId) &&
              !previousUnreadIds.has(item.notificationId),
          );

          if (hasNewUnread) {
            setPulse(true);
            window.setTimeout(() => setPulse(false), 2200);
          }
        } else {
          initializedRef.current = true;
        }

        unreadIdsRef.current = nextUnreadIds;
        setNotifications(normalized);
      } catch (error) {
        if (!silent) {
          console.error(
            error.response?.data?.error || "Failed to load notifications.",
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [user?.role, user?.userId],
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user?.userId) return undefined;

    const intervalId = window.setInterval(() => {
      loadNotifications({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications, user?.userId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;

    const unreadNotifications = notifications.filter(isUnread);
    if (unreadNotifications.length === 0) return;

    unreadNotifications.forEach((item) => {
      notificationService
        .markNotificationAsRead(item.notificationId)
        .catch(() => {});
    });

    setNotifications((prev) =>
      prev.map((item) =>
        isUnread(item)
          ? {
              ...item,
              readAt: new Date().toISOString(),
              status: item.status === "UNREAD" ? "READ" : item.status,
            }
          : item,
      ),
    );
    unreadIdsRef.current = new Set();
  }, [open, notifications]);

  const unreadCount = useMemo(
    () => notifications.filter(isUnread).length,
    [notifications],
  );

  return (
    <div className="navbar__notification" ref={panelRef}>
      <button
        type="button"
        className={`navbar__icon-btn navbar__notification-btn ${pulse ? "navbar__notification-btn--pulse" : ""}`}
        aria-label="Notifications"
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2a5 5 0 0 0-5 5v2.17c0 .53-.21 1.04-.59 1.41L5.2 11.8A2 2 0 0 0 6.61 15H17.4a2 2 0 0 0 1.41-3.41l-1.22-1.21A1.99 1.99 0 0 1 17 9V7a5 5 0 0 0-5-5zm0 20a3 3 0 0 0 2.82-2H9.18A3 3 0 0 0 12 22z"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="navbar__notification-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="navbar__notification-panel animate-fade-in">
          <div className="navbar__notification-header">
            <div>
              <h3>Notifications</h3>
              <p>
                {user?.role === "ADMIN"
                  ? "Verification requests and admin updates"
                  : "Your account updates"}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => loadNotifications()}
            >
              Refresh
            </button>
          </div>

          <div className="navbar__notification-list">
            {loading ? (
              <div className="navbar__notification-empty">
                <span className="spinner spinner-dark" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="navbar__notification-empty">
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 12).map((notification) => (
                <article
                  key={notification.notificationId}
                  className={`navbar__notification-item ${isUnread(notification) ? "navbar__notification-item--unread" : ""}`}
                >
                  <div className="navbar__notification-row">
                    <strong>{notification.title || "Notification"}</strong>
                    <span>{formatRelativeTime(notification.createdAt)}</span>
                  </div>
                  <p>{notification.message}</p>
                  <div className="navbar__notification-meta">
                    <span className="badge badge-gray">
                      {notification.type?.replaceAll("_", " ") || "UPDATE"}
                    </span>
                    {notification.resolutionNote && (
                      <span className="navbar__notification-note">
                        {notification.resolutionNote}
                      </span>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
