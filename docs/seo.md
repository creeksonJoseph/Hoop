# SEO & Google Search Console Guide

This document covers the SEO setup for the Hooop frontend and the steps to take
when the production domain is added to Google Search Console (GSC).

## Indexing model

Hooop is a React SPA, so only pages with real, public content should be
indexable. Authenticated app screens are intentionally excluded.

| Route | Indexable | How it is handled |
|:---|:---|:---|
| `/` | Yes | Static `index.html` head + `WebSite`, `WebApplication`, `Organization` and `FAQPage` JSON-LD |
| `/privacy` | Yes | Static `privacy.html` head with its own canonical and `WebPage` JSON-LD |
| `/login`, `/signup`, `/forgot-password` | No | `X-Robots-Tag: noindex` response header |
| `/onboarding`, `/home`, `/chat/*`, `/wingmen`, `/wingman/*` | No | `noindex` header + `robots.txt` disallow |
| `/sessions/*`, `/settings`, `/settings/*`, `/admin`, `/auth/*`, `/sentry-test` | No | `noindex` header + `robots.txt` disallow |
| Anything else | No | Vercel serves `404.html` with a real `404` status |

Why this split matters:

- Google can render JavaScript, but the initial HTML for an SPA is the best
  source of truth for titles, descriptions, and canonical URLs. The two
  indexable routes therefore get their own static HTML head.
- Utility pages (`login`, `signup`, `forgot-password`) are crawlable so Google
  can see their `X-Robots-Tag: noindex` header, but they are not in the sitemap.
- Private routes are blocked in `robots.txt` and protected by authentication.
- Unknown URLs return a real `404` instead of a `200` soft 404. This is why the
  old `"/(.*)"` catch-all rewrite was replaced with explicit rewrites for known
  app routes.

## What is implemented

| File | Purpose |
|:---|:---|
| `frontend/index.html` | Homepage title, description, canonical, Open Graph/Twitter tags, JSON-LD, font and crawl improvements |
| `frontend/privacy.html` | Static head for the indexable privacy page (built as a second Vite HTML entry) |
| `frontend/src/hooks/useSeo.js` | Keeps title, description, robots, Open Graph, Twitter and canonical in sync during client-side navigation |
| `frontend/public/robots.txt` | Allow public pages, disallow private app routes, point to the sitemap |
| `frontend/public/sitemap.xml` | Only canonical, indexable URLs (`/` and `/privacy`) |
| `frontend/public/404.html` | Branded 404 page served with a real `404` status by Vercel |
| `frontend/vercel.json` | Explicit SPA rewrites, `.html` redirects, `noindex` headers, cache and security headers |
| `frontend/vite.config.js` | Builds both HTML entries and serves `/privacy` in local dev |

Additional on-page changes:

- FAQ answers are rendered with native `<details>`/`<summary>`, so the question
  and answer text exist in the DOM even when collapsed (matching the FAQ
  structured data).
- The homepage hero mentions "Instagram DMs" in the copy.
- The footer links to `#how-it-works`, `#features`, `#faq`, and `/privacy` for
  internal linking.
- Decorative icon fonts and duplicate Google Fonts requests were consolidated.
- The header avatar has explicit dimensions to avoid layout shift.

## After deploying, before adding the GSC property

1. **Choose one canonical host.** The canonical URL is `https://hooop.tech`
   (no `www`). `vercel.json` redirects `www.hooop.tech` to `hooop.tech` once
   both domains are attached to the Vercel project, so the two hosts do not
   serve duplicate content.
2. **Verify HTTPS** works on the apex domain.
3. **Confirm the production build output contains:**
   - `dist/index.html`
   - `dist/privacy.html`
   - `dist/404.html`
   - `dist/robots.txt`
   - `dist/sitemap.xml`
4. **Check response headers and status codes** after deployment:

   ```bash
   curl -I https://hooop.tech/
   curl -I https://hooop.tech/privacy
   curl -I https://hooop.tech/login
   curl -I https://hooop.tech/home
   curl -I https://hooop.tech/this-does-not-exist
   curl https://hooop.tech/robots.txt
   curl https://hooop.tech/sitemap.xml
   ```

   Expected:
   - `/` and `/privacy` return `200`.
   - `/login` and `/home` include `X-Robots-Tag: noindex, nofollow`.
   - `/this-does-not-exist` returns `404`.
   - `/index.html` and `/privacy.html` redirect to their extensionless URLs.

5. **Validate the HTML head.** View source (not just DevTools) for `/` and
   `/privacy` and confirm the title, description, canonical and OG tags match
   the URL.
6. **Validate structured data** with the
   [Rich Results Test](https://search.google.com/test/rich-results) and the
   [Schema Markup Validator](https://validator.schema.org/).
7. **Run Lighthouse** on mobile and desktop, focusing on Performance, SEO, and
   Accessibility.

## Adding the domain to Google Search Console

Use a **Domain property** (`hooop.tech`). It covers `www`, `http`, and `https`
variants, so it is more robust than a URL-prefix property.

1. Open [Google Search Console](https://search.google.com/search-console).
2. Add a property → **Domain** → enter `hooop.tech`.
3. Verify with a **DNS TXT record** at your DNS provider (recommended). The
   alternative HTML file/meta verification is not needed.
4. After verification, open **Sitemaps** and submit:
   `https://hooop.tech/sitemap.xml`
5. Use **URL Inspection** on `https://hooop.tech/` and click **Request
   indexing**.
6. Use **URL Inspection** on `https://hooop.tech/privacy` and request indexing.
7. Check **Settings → Crawl stats** and **Pages** over the next few days. It is
   normal for new sites to take days or weeks to be indexed.
8. Review **Core Web Vitals** after enough field data is collected.
9. Check **Security & Manual Actions** and resolve anything reported.

Do not add a fake `google-site-verification` meta tag. Use DNS verification, or
add the real token only if you choose the HTML tag method.

## Adding a new public page later

Any new page that should rank must have its own static HTML `<head>` with a
unique title, description, and canonical URL. The current SPA fallback alone is
not enough for a new public page.

1. Add a new HTML entry (for example `frontend/pricing.html`) and register it in
   `vite.config.js` under `build.rollupOptions.input`.
2. Add a rewrite in `frontend/vercel.json` from `/pricing` to `/pricing.html`.
3. Add the route to `frontend/src/App.jsx`.
4. Add its metadata to `PAGES` in `frontend/src/hooks/useSeo.js`.
5. Add the URL to `frontend/public/sitemap.xml`.
6. Add the URL to the `STATIC_ASSETS` list in `frontend/public/sw.js` if it
   should work offline.
7. Confirm it is not covered by a `Disallow` rule in `robots.txt`.

> **Important:** every SPA route must also be listed in the `rewrites` array in
> `frontend/vercel.json`. The catch-all rewrite was removed on purpose so
> unknown URLs return a real `404` instead of a `200` soft 404. A new route
> that is not in that array will work during client-side navigation but will
> return `404` on a hard refresh.

For a content-heavy site (blog, docs, marketing pages), move public pages to a
static-site generator or SSR framework. Many AI crawlers do not execute
JavaScript, so a JS-only body limits visibility in AI search results even
though Google can render it.

## Recommendations before launch

- **Social preview image.** `frontend/public/og-image.png` is a 1200×630
  wordmark card built from the favicon geometry (rounded black square with the
  white H). Regenerate it if the brand mark changes, and keep the dimensions in
  the static OG tags, `useSeo.js`, and `og:image:width`/`height` in sync.
- **Add social profiles to `Organization.sameAs`** in the JSON-LD once official
  accounts exist.
- **Keep `lastmod` accurate** in `sitemap.xml` when the homepage or privacy
  policy changes.
- **Do not block `/assets/`** in `robots.txt`; Google needs styles and scripts to
  render the page.
- **Keep private routes out of the sitemap** and verify the `X-Robots-Tag`
  header after deployment.
