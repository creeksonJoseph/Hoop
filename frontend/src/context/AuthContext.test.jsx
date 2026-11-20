import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

const getMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  default: { get: getMock },
}));

vi.mock("../hooks/useDMs", () => ({
  clearDMsCache: vi.fn(),
}));

function AuthProbe() {
  const { user, loading } = useAuth();
  if (loading) return <div>restoring</div>;
  if (!user) return <div>signed out</div>;
  return (
    <div>
      {user.email}:{String(user.has_api_key)}
    </div>
  );
}

describe("AuthContext session restoration", () => {
  beforeEach(() => {
    localStorage.clear();
    getMock.mockReset();
  });

  it("refreshes /auth/me on reload so a stale key status cannot grant access", async () => {
    localStorage.setItem("hoop_token", "stored-token");
    localStorage.setItem(
      "hoop_user",
      JSON.stringify({
        id: 1,
        email: "user@example.com",
        onboarded: true,
        has_api_key: true,
      }),
    );
    let resolveMe;
    getMock.mockReturnValue(
      new Promise((resolve) => {
        resolveMe = resolve;
      }),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText("restoring")).toBeInTheDocument();

    await act(async () => {
      resolveMe({
        data: {
          id: 1,
          email: "user@example.com",
          onboarded: false,
          has_api_key: false,
        },
      });
    });

    expect(
      await screen.findByText("user@example.com:false"),
    ).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("/auth/me");
  });

  it("does not restore a user profile without a session token", () => {
    localStorage.setItem(
      "hoop_user",
      JSON.stringify({ id: 1, email: "stale@example.com", has_api_key: true }),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText("signed out")).toBeInTheDocument();
    expect(getMock).not.toHaveBeenCalled();
  });
});
