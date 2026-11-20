import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const getMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  default: { get: getMock },
}));

vi.mock("../hooks/useDMs", () => ({
  useDMs: () => ({
    dms: [],
    hasRealAccount: false,
    loading: false,
    addDM: vi.fn(),
    deleteDM: vi.fn(),
  }),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ setActiveAccount: vi.fn() }),
}));

vi.mock("../context/ToastContext", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("../components/NavRail", () => ({
  default: () => <div data-testid="nav-rail" />,
}));
vi.mock("../components/home/DMList", () => ({
  default: () => <div data-testid="dm-list" />,
}));
vi.mock("../components/home/AddDMModal", () => ({
  default: () => <div data-testid="add-dm-modal" />,
}));
vi.mock("../components/chat/ChatView", () => ({
  default: () => <div data-testid="chat-view" />,
}));
vi.mock("../components/skeletons/Skeletons", () => ({
  DMListSkeleton: () => <div data-testid="skeleton" />,
}));

import HomePage from "./HomePage";

// Replace window.location with a plain object so setting href records the call
// instead of triggering jsdom's "navigation to another Document".
const hrefMock = vi.fn();
let currentHref = "http://localhost/";
Object.defineProperty(window, "location", {
  configurable: true,
  writable: true,
  value: {
    get href() {
      return currentHref;
    },
    set href(v) {
      currentHref = v;
      hrefMock(v);
    },
    assign: vi.fn(),
    replace: vi.fn(),
  },
});

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route path="/home" element={<HomePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getMock.mockReset();
  toastMock.mockReset();
  hrefMock.mockReset();
  currentHref = "http://localhost/";
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("HomePage dashboard OAuth connect", () => {
  it("requests the OAuth URL through the authenticated settings endpoint when Connect is clicked", async () => {
    getMock.mockResolvedValue({
      data: { oauth_url: "https://zernio.example/oauth?state=xyz" },
    });

    renderHome();

    await act(async () => {
      screen.getByText("Connect Instagram to track DMs");
      await screen.findByText("Connect");
    });

    const button = screen.getByText("Connect");
    await act(async () => {
      button.click();
    });

    expect(getMock).toHaveBeenCalledWith("/settings");
  });

  it("redirects directly to the returned OAuth URL instead of /settings", async () => {
    const oauthUrl = "https://zernio.example/oauth?state=xyz";
    getMock.mockResolvedValue({ data: { oauth_url: oauthUrl } });

    renderHome();

    const button = await screen.findByText("Connect");
    await act(async () => {
      button.click();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(hrefMock).toHaveBeenCalledWith(oauthUrl);
    expect(hrefMock).not.toHaveBeenCalledWith("/settings");
  });

  it("does not navigate to /settings", async () => {
    getMock.mockResolvedValue({ data: { oauth_url: "https://zernio.example/oauth" } });

    renderHome();

    const button = await screen.findByText("Connect");
    await act(async () => {
      button.click();
    });

    await act(async () => {
      await Promise.resolve();
    });

    const calls = hrefMock.mock.calls.map((c) => c[0]);
    expect(calls.some((url) => String(url).includes("zernio.example"))).toBe(
      true,
    );
    expect(calls.some((url) => url === "/settings")).toBe(false);
  });

  it("shows a loading state and prevents repeated clicks while fetching the OAuth URL", async () => {
    let resolveSettings;
    const settingsPromise = new Promise((resolve) => {
      resolveSettings = resolve;
    });
    getMock.mockReturnValue(settingsPromise);

    renderHome();

    const button = await screen.findByText("Connect");
    await act(async () => {
      button.click();
    });

    expect(screen.getByText("Connecting…")).toBeInTheDocument();
    expect(button).toBeDisabled();

    await act(async () => {
      resolveSettings({ data: { oauth_url: "https://zernio.example/oauth" } });
    });

    // On success the handler navigates away, so the request was made.
    expect(hrefMock).toHaveBeenCalledWith("https://zernio.example/oauth");
  });

  it("handles a missing OAuth URL with an error toast", async () => {
    getMock.mockResolvedValue({ data: {} });

    renderHome();

    const button = await screen.findByText("Connect");
    await act(async () => {
      button.click();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining("No OAuth URL available"),
      "error",
    );
  });

  it("handles an API failure with an error toast", async () => {
    const error = new Error("network down");
    error.response = { data: { detail: "settings unavailable" } };
    getMock.mockRejectedValue(error);

    renderHome();

    const button = await screen.findByText("Connect");
    await act(async () => {
      button.click();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining("settings unavailable"),
      "error",
    );
  });
});
