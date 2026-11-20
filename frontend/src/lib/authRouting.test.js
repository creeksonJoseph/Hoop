import { describe, expect, it } from "vitest";
import {
  HOME_PATH,
  ONBOARDING_PATH,
  hasSavedApiKey,
  resolvePostAuthTarget,
  safeInternalPath,
  withOnboardingStatus,
} from "./authRouting";

describe("authRouting", () => {
  it("treats a missing key as not onboarded", () => {
    expect(hasSavedApiKey(null)).toBe(false);
    expect(hasSavedApiKey({ onboarded: false, has_api_key: false })).toBe(false);
    expect(resolvePostAuthTarget({ has_api_key: false }, "/home")).toBe(
      ONBOARDING_PATH,
    );
  });

  it("uses has_api_key as the authoritative signal", () => {
    expect(
      hasSavedApiKey({ onboarded: false, has_api_key: true }),
    ).toBe(true);
    expect(
      hasSavedApiKey({ onboarded: true, has_api_key: false }),
    ).toBe(false);
  });

  it("falls back to onboarded for older backend responses", () => {
    expect(hasSavedApiKey({ onboarded: true })).toBe(true);
    expect(resolvePostAuthTarget({ onboarded: true })).toBe(HOME_PATH);
  });

  it("does not let a stale /home redirect bypass onboarding", () => {
    expect(
      resolvePostAuthTarget({ has_api_key: false }, "/home"),
    ).toBe(ONBOARDING_PATH);
    expect(
      resolvePostAuthTarget({ has_api_key: false }, "/settings/accounts"),
    ).toBe(ONBOARDING_PATH);
  });

  it("honours a safe requested destination once onboarding is complete", () => {
    expect(
      resolvePostAuthTarget({ has_api_key: true }, "/settings/accounts"),
    ).toBe("/settings/accounts");
    expect(resolvePostAuthTarget({ has_api_key: true }, "/home")).toBe(
      HOME_PATH,
    );
  });

  it("rejects external and malformed redirect targets", () => {
    expect(safeInternalPath("https://evil.example")).toBeNull();
    expect(safeInternalPath("//evil.example")).toBeNull();
    expect(safeInternalPath("/\\evil.example")).toBeNull();
    expect(
      resolvePostAuthTarget({ has_api_key: true }, "https://evil.example"),
    ).toBe(HOME_PATH);
  });

  it("normalizes the status stored on the user object", () => {
    expect(
      withOnboardingStatus({ id: 1, email: "a@b.c" }, { has_api_key: true }),
    ).toEqual({
      id: 1,
      email: "a@b.c",
      onboarded: true,
      has_api_key: true,
    });
  });
});
