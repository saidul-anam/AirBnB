import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import authService from "../services/authService";

const AuthContext = createContext(null);

const toStoredUser = (authResponse) => ({
  userId: authResponse.userId,
  email: authResponse.email,
  firstName: authResponse.firstName,
  lastName: authResponse.lastName,
  role: authResponse.role,
  profileImage: authResponse.profileImage || "",
  emailVerified: Boolean(authResponse.emailVerified),
  verificationStatus: authResponse.verificationStatus || "NOT_REQUESTED",
  canBook: Boolean(authResponse.canBook),
  canHost: Boolean(authResponse.canHost),
  favoriteHostIds: authResponse.favoriteHostIds || [],
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const payload = JSON.parse(atob(storedToken.split(".")[1]));
        const isExpired = payload.exp * 1000 < Date.now();

        if (isExpired) {
          clearAuthData();
        } else {
          setToken(storedToken);
          setUser(parsedUser);
        }
      } catch {
        clearAuthData();
      }
    }

    setLoading(false);
  }, [clearAuthData]);

  const saveAuthData = useCallback((authResponse) => {
    const nextUser = toStoredUser(authResponse);
    localStorage.setItem("token", authResponse.token);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setToken(authResponse.token);
    setUser(nextUser);
  }, []);

  const register = useCallback(
    async (registerData) => {
      setError(null);
      setLoading(true);
      try {
        const response = await authService.register(registerData);
        saveAuthData(response);
        toast.success(response.message || "Account created.");
        return { success: true, message: response.message };
      } catch (err) {
        const message =
          err.response?.data?.error || "Registration failed. Please try again.";
        setError(message);
        toast.error(message);
        return { success: false, message };
      } finally {
        setLoading(false);
      }
    },
    [saveAuthData],
  );

  const login = useCallback(
    async (loginData) => {
      setError(null);
      setLoading(true);
      try {
        const response = await authService.login(loginData);
        saveAuthData(response);
        toast.success(response.message || "Logged in.");
        return { success: true, message: response.message };
      } catch (err) {
        const message =
          err.response?.data?.error ||
          "Login failed. Please check your credentials.";
        setError(message);
        toast.error(message);
        return { success: false, message };
      } finally {
        setLoading(false);
      }
    },
    [saveAuthData],
  );

  const logout = useCallback(() => {
    clearAuthData();
    setError(null);
    toast.info("Logged out.");
  }, [clearAuthData]);

  const updateUser = useCallback((updatedData) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedData };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = {
    user,
    token,
    loading,
    error,
    register,
    login,
    logout,
    updateUser,
    setError,
    isAuthenticated: !!token && !!user,
    isGuest: user?.role === "GUEST",
    isHost: user?.role === "HOST",
    isAdmin: user?.role === "ADMIN",
    isEmailVerified: Boolean(user?.emailVerified),
    canBook: Boolean(user?.canBook),
    canHost: Boolean(user?.canHost),
    fullName: user ? `${user.firstName} ${user.lastName}` : "",
    initials: user
      ? `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase()
      : "",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
