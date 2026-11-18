import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const SITE_URL = "https://hooop.tech";
export const SITE_NAME = "Hooop";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
export const DEFAULT_DESCRIPTION =
  "Out of words in a DM? Hooop lets a trusted wingman help you reply to Instagram DMs in real time. No password sharing, no app installs.";

const INDEX_ROBOTS =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const NOINDEX_ROBOTS = "noindex, nofollow";

/**
 * Metadata for every public or private route.
 *
 * Only `/` and `/privacy` are indexable. Everything else is an authenticated
 * app screen (or a utility/auth screen) and is marked noindex both here and
 * with an `X-Robots-Tag` header in `vercel.json`.
 */
const PAGES = {
  "/": {
    title: "Hooop  -  Your Instagram DM Wingman",
    description: DEFAULT_DESCRIPTION,
    index: true,
  },
  "/privacy": {
    title: "Privacy & Data Policy  -  Hooop",
    description:
      "How Hooop handles your Instagram messages, what data is stored, how to delete it, and the rules for using the service responsibly.",
    index: true,
  },
  "/login": {
    title: "Sign in  -  Hooop",
    description:
      "Sign in to Hooop and invite a trusted wingman into your Instagram DMs.",
    index: false,
  },
  "/signup": {
    title: "Create your Hooop account",
    description:
      "Create a free Hooop account and tag in a wingman the next time you run out of words in a DM.",
    index: false,
  },
  "/forgot-password": {
    title: "Reset your password  -  Hooop",
    description:
      "Reset the password for your Hooop account with a one-time email code.",
    index: false,
  },
  "/onboarding": {
    title: "Set up your account  -  Hooop",
    description: "Connect Instagram and finish setting up your Hooop account.",
    index: false,
  },
  "/home": {
    title: "Your conversations  -  Hooop",
    description: "Your private Hooop conversation workspace.",
    index: false,
  },
  "/wingmen": {
    title: "Wingman sessions  -  Hooop",
    description: "Manage the wingmen helping you with your conversations.",
    index: false,
  },
  "/settings": {
    title: "Settings  -  Hooop",
    description: "Manage your Hooop account settings.",
    index: false,
  },
  "/settings/security": {
    title: "Security settings  -  Hooop",
    description: "Manage your Hooop security settings.",
    index: false,
  },
  "/settings/accounts": {
    title: "Connected accounts  -  Hooop",
    description: "Manage the accounts connected to Hooop.",
    index: false,
  },
  "/admin": {
    title: "Admin  -  Hooop",
    description: "Hooop administration.",
    index: false,
  },
  "/auth/callback": {
    title: "Signing you in  -  Hooop",
    description: "Completing your Hooop sign-in.",
    index: false,
  },
  "/sentry-test": {
    title: "Diagnostics  -  Hooop",
    description: "Hooop diagnostics page.",
    index: false,
  },
};

const PRIVATE_PREFIXES = [
  ["/chat/", "Chat  -  Hooop"],
  ["/sessions/", "Wingman sessions  -  Hooop"],
  ["/wingman/", "Wingman session  -  Hooop"],
];

function normalisePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function resolvePage(pathname) {
  const path = normalisePath(pathname);

  if (PAGES[path]) {
    return { ...PAGES[path], path };
  }

  for (const [prefix, title] of PRIVATE_PREFIXES) {
    if (path.startsWith(prefix)) {
      return {
        title,
        description: "This is a private Hooop workspace.",
        index: false,
        path,
      };
    }
  }

  return {
    title: "Page not found  -  Hooop",
    description: "The page you were looking for could not be found.",
    index: false,
    path: "/",
    notFound: true,
  };
}

function setMeta(attribute, key, content) {
  if (!content) return;

  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function setCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]');

  if (!href) {
    if (link) link.remove();
    return;
  }

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
}

function applyPageMeta(page) {
  const url = `${SITE_URL}${page.path === "/" ? "/" : page.path}`;
  const socialUrl = page.notFound ? `${SITE_URL}/` : url;
  const imageAlt = `${SITE_NAME}  -  Instagram DM wingman app`;

  document.title = page.title;

  setMeta("name", "description", page.description);
  setMeta("name", "robots", page.index ? INDEX_ROBOTS : NOINDEX_ROBOTS);

  setMeta("property", "og:type", "website");
  setMeta("property", "og:site_name", SITE_NAME);
  setMeta("property", "og:title", page.title);
  setMeta("property", "og:description", page.description);
  setMeta("property", "og:url", socialUrl);
  setMeta("property", "og:image", DEFAULT_OG_IMAGE);
  setMeta("property", "og:image:type", "image/png");
  setMeta("property", "og:image:width", "1200");
  setMeta("property", "og:image:height", "630");
  setMeta("property", "og:image:alt", imageAlt);

  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", page.title);
  setMeta("name", "twitter:description", page.description);
  setMeta("name", "twitter:image", DEFAULT_OG_IMAGE);
  setMeta("name", "twitter:image:alt", imageAlt);

  // Only indexable pages get a canonical. Utility and app routes are
  // noindex, so leaving a stale homepage canonical on them would be wrong.
  setCanonical(page.index ? url : null);
}

/**
 * Keeps the document head in sync with the current route.
 *
 * Mounted once inside the router so every client-side navigation updates the
 * title, description, Open Graph tags, robots directive and canonical URL.
 */
export function useSeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    applyPageMeta(resolvePage(pathname));
  }, [pathname]);
}
