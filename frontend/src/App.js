import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";
import AdminBookingsPage from "./pages/AdminBookingsPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminVerificationPage from "./pages/AdminVerificationPage";
import BookingDetailsPage from "./pages/BookingDetailsPage";
import CustomerTripsPage from "./pages/CustomerTripsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import HostDashboardPage from "./pages/HostDashboardPage";
import InboxPage from "./pages/InboxPage";
import ListingDetailsPage from "./pages/ListingDetailsPage";
import LoginPage from "./pages/LoginPage";
import PaymentPage from "./pages/PaymentPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import ReservationPage from "./pages/ReservationPage";
import SearchPage from "./pages/SearchPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import WishlistsPage from "./pages/WishlistsPage";

import { WebSocketProvider } from "./context/WebSocketContext";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WebSocketProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <div className="app">
              <Navbar />
              <main className="main-content">
                <ErrorBoundary>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/rooms/:userId" element={<ListingDetailsPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/admin/login" element={<AdminLoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />

                    {/* Protected Routes */}
                    <Route
                      path="/reservation"
                      element={
                        <ProtectedRoute>
                          <ReservationPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/payment/:bookingId"
                      element={
                        <ProtectedRoute>
                          <PaymentPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/my-bookings"
                      element={
                        <ProtectedRoute>
                          <CustomerTripsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/bookings"
                      element={
                        <ProtectedRoute>
                          <CustomerTripsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/my-trips"
                      element={
                        <ProtectedRoute>
                          <CustomerTripsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <ProfilePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/wishlists"
                      element={
                        <ProtectedRoute>
                          <WishlistsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/inbox"
                      element={
                        <ProtectedRoute>
                          <InboxPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/verification-requests"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN"]}
                          redirectTo="/admin/login"
                        >
                          <AdminVerificationPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/bookings"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN"]}
                          redirectTo="/admin/login"
                        >
                          <AdminBookingsPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Host Dashboard */}
                    <Route
                      path="/host/dashboard"
                      element={
                        <ProtectedRoute allowedRoles={["HOST"]}>
                          <HostDashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/my-listings"
                      element={
                        <ProtectedRoute allowedRoles={["HOST"]}>
                          <HostDashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Booking Details */}
                    <Route
                      path="/booking/:bookingId"
                      element={
                        <ProtectedRoute>
                          <BookingDetailsPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </ErrorBoundary>
              </main>
            </div>
            <ToastContainer
              position="top-right"
              autoClose={2500}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </Router>
        </WebSocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
