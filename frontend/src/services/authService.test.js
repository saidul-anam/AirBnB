jest.mock("axios", () => {
  const mockAxios = {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  return {
    __esModule: true,
    default: mockAxios,
  };
});

import axios from "axios";
import authService from "./authService";

describe("authService", () => {
  beforeEach(() => {
    localStorage.clear();
    axios.post.mockReset();
    axios.get.mockReset();
    axios.put.mockReset();
  });

  test("register stores token and user", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        token: "jwt.token.value",
        userId: "u-1",
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        role: "GUEST",
        profileImage: "data:image/png;base64,abc",
        emailVerified: false,
        verificationStatus: "PENDING",
        message: "ok",
      },
    });

    const res = await authService.register({
      email: "a@b.com",
      password: "secret123",
      firstName: "A",
      lastName: "B",
      role: "GUEST",
    });

    expect(res.token).toBe("jwt.token.value");
    expect(localStorage.getItem("token")).toBe("jwt.token.value");
    expect(JSON.parse(localStorage.getItem("user"))).toEqual(
      expect.objectContaining({
        userId: "u-1",
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        role: "GUEST",
        profileImage: "data:image/png;base64,abc",
        emailVerified: false,
        verificationStatus: "PENDING",
        canBook: false,
        canHost: false,
      }),
    );
  });

  test("getMyProfile calls /me", async () => {
    axios.get.mockResolvedValueOnce({ data: { email: "a@b.com" } });
    const res = await authService.getMyProfile();
    expect(res).toEqual({ email: "a@b.com" });
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/users\/me$/),
    );
  });
});
