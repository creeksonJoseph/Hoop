import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGoogleAuth, useLogin } from "./useAuthForms";

const navigateMock = vi.hoisted(() => vi.fn());
const loginMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ login: loginMock }),
}));

vi.mock("../context/ToastContext", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("../lib/api", () => ({
  default: { post: postMock },
}));

describe("auth form redirects", () => {
  beforeEach(() => {
    sessionStorage.clear();
    navigateMock.mockReset();
    loginMock.mockReset();
    toastMock.mockReset();
    postMock.mockReset();
  });

  it("sends a user without an API key to onboarding, ignoring a stale /home redirect", async () => {
    sessionStorage.setItem("hoop_redirect_after_login", "/home");
    postMock.mockResolvedValue({
      data: {
        access_token: "token",
        onboarded: false,
        has_api_key: false,
        user: { id: 1, email: "new@example.com" },
      },
    });

    const { result } = renderHook(() => useLogin());
    await act(async () => {
      await result.current.submit("new@example.com", "password");
    });

    expect(navigateMock).toHaveBeenCalledWith("/onboarding", {
      replace: true,
    });
    expect(loginMock).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ onboarded: false, has_api_key: false }),
    );
    expect(sessionStorage.getItem("hoop_redirect_after_login")).toBeNull();
  });

  it("sends a returning user who abandoned onboarding back to onboarding", async () => {
    postMock.mockResolvedValue({
      data: {
        access_token: "token",
        onboarded: false,
        has_api_key: false,
        user: { id: 1, email: "returning@example.com" },
      },
    });

    const { result } = renderHook(() => useLogin());
    await act(async () => {
      await result.current.submit("returning@example.com", "password");
    });

    expect(navigateMock).toHaveBeenCalledWith("/onboarding", {
      replace: true,
    });
  });

  it("honours a requested destination when an API key is saved", async () => {
    sessionStorage.setItem(
      "hoop_redirect_after_login",
      "/settings/accounts",
    );
    postMock.mockResolvedValue({
      data: {
        access_token: "token",
        onboarded: true,
        has_api_key: true,
        user: { id: 1, email: "keyed@example.com" },
      },
    });

    const { result } = renderHook(() => useLogin());
    await act(async () => {
      await result.current.submit("keyed@example.com", "password");
    });

    expect(navigateMock).toHaveBeenCalledWith("/settings/accounts", {
      replace: true,
    });
  });

  it("sends a returning Google user without an API key to the callback (which enforces onboarding)", async () => {
    postMock.mockResolvedValue({
      data: {
        access_token: "token",
        onboarded: false,
        has_api_key: false,
        is_new_user: false,
        user: { id: 1, email: "google@example.com" },
      },
    });

    const { result } = renderHook(() => useGoogleAuth());
    await act(async () => {
      await result.current.submitGoogleToken("credential");
    });

    expect(navigateMock).toHaveBeenCalledWith("/auth/callback");
    expect(loginMock).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ onboarded: false, has_api_key: false }),
    );
  });

  it("keeps a Google user with an API key onboarded", async () => {
    postMock.mockResolvedValue({
      data: {
        access_token: "token",
        onboarded: true,
        has_api_key: true,
        is_new_user: false,
        user: { id: 1, email: "google@example.com" },
      },
    });

    const { result } = renderHook(() => useGoogleAuth());
    await act(async () => {
      await result.current.submitGoogleToken("credential");
    });

    expect(loginMock).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ onboarded: true, has_api_key: true }),
    );
  });
});
