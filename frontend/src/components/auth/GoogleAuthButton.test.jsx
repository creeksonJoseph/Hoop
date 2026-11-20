import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GoogleAuthButton from "./GoogleAuthButton";

const mockUseGoogleIdToken = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/useGoogleIdToken", () => ({
  useGoogleIdToken: mockUseGoogleIdToken,
}));

// Mutable state returned by the mocked hook so tests can simulate the Google
// flow starting and finishing without the real Google Identity Services script.
const googleState = { ready: true, error: "", isConnecting: false };

beforeEach(() => {
  Object.assign(googleState, { ready: true, error: "", isConnecting: false });
  mockUseGoogleIdToken.mockReturnValue(googleState);
});

afterEach(() => {
  vi.resetAllMocks();
});

const renderButton = (uiProps = {}) =>
  render(<GoogleAuthButton onSuccess={vi.fn()} {...uiProps} />);

describe("GoogleAuthButton loading states", () => {
  it("does not show 'Connecting to Google…' when email/password login is loading (disabled only)", () => {
    renderButton({ disabled: true });

    expect(screen.queryByText("Connecting to Google…")).not.toBeInTheDocument();
  });

  it("does not show 'Connecting to Google…' when email signup/OTP is loading (disabled only)", () => {
    renderButton({ disabled: true });

    expect(screen.queryByText("Connecting to Google…")).not.toBeInTheDocument();
  });

  it("shows 'Connecting to Google…' only while the Google flow is active", () => {
    googleState.isConnecting = true;
    renderButton();

    expect(screen.getByText("Connecting to Google…")).toBeInTheDocument();
  });

  it("clears 'Connecting to Google…' and shows the error after a failed Google auth", () => {
    googleState.isConnecting = true;
    const { rerender } = renderButton();
    expect(screen.getByText("Connecting to Google…")).toBeInTheDocument();

    Object.assign(googleState, { isConnecting: false, error: "Google sign-in failed." });
    rerender(<GoogleAuthButton onSuccess={vi.fn()} />);

    expect(screen.queryByText("Connecting to Google…")).not.toBeInTheDocument();
    expect(screen.getByText("Google sign-in failed.")).toBeInTheDocument();
  });

  it("remains non-interactive while another authentication operation is in progress", () => {
    const { container } = renderButton({ disabled: true });
    const wrapper = container.firstChild;

    expect(wrapper).toHaveClass("pointer-events-none");
    expect(wrapper).toHaveClass("opacity-80");
  });
});
