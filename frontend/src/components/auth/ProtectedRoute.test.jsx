import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Protected from "./ProtectedRoute";
import { useAuth } from "../../context/AuthContext";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

function renderProtected({ path = "/home", requireOnboarding = true } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Login screen</div>} />
        <Route path="/onboarding" element={<div>Onboarding screen</div>} />
        <Route
          path="/home"
          element={
            <Protected requireOnboarding={requireOnboarding}>
              <div>Dashboard screen</div>
            </Protected>
          }
        />
        <Route
          path="/onboarding-only"
          element={
            <Protected requireOnboarding={false}>
              <div>Onboarding screen</div>
            </Protected>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Protected route guard", () => {
  beforeEach(() => {
    useAuth.mockReset();
  });

  it("redirects an unauthenticated visitor to login", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderProtected();
    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  it("redirects an authenticated user without an API key away from /home", () => {
    useAuth.mockReturnValue({
      user: { id: 1, onboarded: false, has_api_key: false },
      loading: false,
    });
    renderProtected();
    expect(screen.getByText("Onboarding screen")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard screen")).not.toBeInTheDocument();
  });

  it("allows a user with an API key to access the dashboard", () => {
    useAuth.mockReturnValue({
      user: { id: 1, onboarded: true, has_api_key: true },
      loading: false,
    });
    renderProtected();
    expect(screen.getByText("Dashboard screen")).toBeInTheDocument();
  });

  it("allows a key-only user (Instagram not connected) into the dashboard", () => {
    useAuth.mockReturnValue({
      user: { id: 1, onboarded: true, has_api_key: true, accounts: [] },
      loading: false,
    });
    renderProtected();
    expect(screen.getByText("Dashboard screen")).toBeInTheDocument();
  });

  it("keeps the onboarding route reachable without an API key", () => {
    useAuth.mockReturnValue({
      user: { id: 1, onboarded: false, has_api_key: false },
      loading: false,
    });
    renderProtected({
      path: "/onboarding-only",
      requireOnboarding: false,
    });
    expect(screen.getByText("Onboarding screen")).toBeInTheDocument();
  });

  it("does not render the dashboard while the session is still restoring", () => {
    useAuth.mockReturnValue({
      user: { id: 1, onboarded: true, has_api_key: true },
      loading: true,
    });
    renderProtected();
    expect(screen.queryByText("Dashboard screen")).not.toBeInTheDocument();
  });
});
