import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CallbackPage from "./CallbackPage";
import { useAuth } from "../../context/AuthContext";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

function renderCallback() {
  return render(
    <MemoryRouter initialEntries={["/auth/callback"]}>
      <Routes>
        <Route path="/auth/callback" element={<CallbackPage />} />
        <Route path="/home" element={<div>Home screen</div>} />
        <Route path="/onboarding" element={<div>Onboarding screen</div>} />
        <Route path="/login" element={<div>Login screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function flushRedirect() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(800);
  });
}

describe("CallbackPage redirect resolution", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    useAuth.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it("cannot be bypassed by stale session-storage redirects", async () => {
    sessionStorage.setItem("hoop_redirect_after_login", "/home");
    sessionStorage.setItem("hoop_post_auth_target", "/home");
    useAuth.mockReturnValue({
      user: { id: 1, onboarded: false, has_api_key: false },
      loading: false,
      refreshUser: vi.fn(),
    });

    renderCallback();
    await flushRedirect();

    expect(screen.getByText("Onboarding screen")).toBeInTheDocument();
    expect(screen.queryByText("Home screen")).not.toBeInTheDocument();
    expect(sessionStorage.getItem("hoop_redirect_after_login")).toBeNull();
    expect(sessionStorage.getItem("hoop_post_auth_target")).toBeNull();
  });

  it("sends a user with a saved API key to the dashboard", async () => {
    sessionStorage.setItem("hoop_redirect_after_login", "/home");
    useAuth.mockReturnValue({
      user: { id: 1, onboarded: true, has_api_key: true },
      loading: false,
      refreshUser: vi.fn(),
    });

    renderCallback();
    await flushRedirect();

    expect(screen.getByText("Home screen")).toBeInTheDocument();
  });

  it("refreshes the authoritative status for an older stored session", async () => {
    const refreshUser = vi.fn().mockResolvedValue({
      id: 1,
      onboarded: false,
      has_api_key: false,
    });
    useAuth.mockReturnValue({
      user: { id: 1 },
      loading: false,
      refreshUser,
    });

    renderCallback();
    await flushRedirect();

    expect(refreshUser).toHaveBeenCalled();
    expect(screen.getByText("Onboarding screen")).toBeInTheDocument();
  });
});
