export const ONBOARDING_PATH = "/onboarding";
export const HOME_PATH = "/home";

/**
 * A user has completed the mandatory onboarding step when a Zernio API key
 * has been saved. `has_api_key` is the explicit backend field; `onboarded`
 * is kept as a backwards-compatible alias for older responses.
 *
 * Connecting Instagram is intentionally NOT part of this check.
 */
export function hasSavedApiKey(source) {
  if (!source) return false;
  if (typeof source.has_api_key === "boolean") return source.has_api_key;
  return source.onboarded === true;
}

/**
 * Only allow same-origin absolute paths as post-auth destinations. This
 * prevents session-storage values (or tampered values) from becoming an
 * open redirect.
 */
export function safeInternalPath(value) {
  if (typeof value !== "string") return null;
  const target = value.trim();
  if (!target.startsWith("/") || target.startsWith("//")) return null;
  if (target.startsWith("/\\")) return null;
  return target;
}

/**
 * Resolve where to send a user after authentication.
 *
 * The API-key status always wins: a stale `/home` redirect stored in
 * sessionStorage can never bypass mandatory onboarding.
 */
export function resolvePostAuthTarget(source, requestedTarget) {
  if (!hasSavedApiKey(source)) return ONBOARDING_PATH;

  const target = safeInternalPath(requestedTarget);
  if (!target || target === ONBOARDING_PATH) return HOME_PATH;
  return target;
}

/**
 * Merge the authoritative API-key status into a user object before it is
 * persisted by AuthContext.
 */
export function withOnboardingStatus(user, source) {
  const hasApiKey = hasSavedApiKey(source);
  return {
    ...(user || {}),
    onboarded: hasApiKey,
    has_api_key: hasApiKey,
  };
}
