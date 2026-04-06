import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";

jest.mock("../services/authService", () => ({
  __esModule: true,
  default: {
    register: jest.fn(),
    login: jest.fn(),
  },
}));

const authService = require("../services/authService").default;

const TestComponent = () => {
  const { register, login, isAuthenticated, user } = useAuth();
  return (
    <div>
      <div data-testid="authed">{isAuthenticated ? "yes" : "no"}</div>
      <div data-testid="email">{user?.email || ""}</div>
      <button
        onClick={() =>
          register({
            email: "x@y.com",
            password: "secret",
            firstName: "X",
            lastName: "Y",
          })
        }
      >
        do-register
      </button>
      <button onClick={() => login({ email: "x@y.com", password: "secret" })}>
        do-login
      </button>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    authService.register.mockReset();
    authService.login.mockReset();
  });

  test("register hydrates user/token", async () => {
    authService.register.mockResolvedValueOnce({
      token: "jwt.token.value",
      userId: "u-1",
      email: "x@y.com",
      firstName: "X",
      lastName: "Y",
      role: "GUEST",
      profileImage: "",
      emailVerified: false,
      verificationStatus: "PENDING",
      message: "ok",
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByText("do-register"));

    await waitFor(() =>
      expect(screen.getByTestId("authed").textContent).toBe("yes"),
    );
    expect(screen.getByTestId("email").textContent).toBe("x@y.com");
    expect(localStorage.getItem("token")).toBe("jwt.token.value");
  });
});
