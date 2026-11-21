/**
 * Dashboard security and cache headers for the production preview server.
 * `pnpm gen:caddy-headers` writes `deploy/security-headers.caddy` from this file.
 *
 * CSP is intentionally not applied to the Vite dev server: HMR and the React
 * refresh runtime need eval and a looser policy.
 */

/** Enforced CSP for the built dashboard. No third-party origins.
 *
 * `style-src` includes `'unsafe-inline'` because Radix UI and Sonner inject
 * `<style>` elements at runtime. Hashes are not practical for those dynamic tags.
 *
 * Trusted Types are enforced (`require-trusted-types-for 'script'` with
 * `trusted-types 'none'`). Any `trustedTypes.createPolicy` needs a named
 * policy listed here and AppSec (Kai) review.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'none'",
  "worker-src 'none'",
  "manifest-src 'self'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
].join("; ");

/** TLS-only addition for the Caddyfile. Not applied on HTTP preview. */
export const CONTENT_SECURITY_POLICY_TLS = `${CONTENT_SECURITY_POLICY}; upgrade-insecure-requests`;

export const CACHE_CONTROL_HTML = "no-cache";
export const CACHE_CONTROL_ERROR = "no-store";
export const CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000, immutable";

export const HSTS = "max-age=31536000";

/** Features Chromium recognizes. `bluetooth` and `interest-cohort` are omitted. */
export const PERMISSIONS_POLICY =
  "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()";

/** Headers for Vite preview (HTTP). HSTS and upgrade-insecure-requests belong on TLS in Caddy. */
export const PREVIEW_SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": PERMISSIONS_POLICY,
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

/** Security headers for Caddy (TLS), including HSTS. Cache-Control is set by path. */
export const CADDY_SECURITY_HEADERS: Record<string, string> = {
  ...PREVIEW_SECURITY_HEADERS,
  "Content-Security-Policy": CONTENT_SECURITY_POLICY_TLS,
  "Strict-Transport-Security": HSTS,
};

export function cacheControlForPath(pathname: string, status = 200): string {
  if (status >= 400) {
    return CACHE_CONTROL_ERROR;
  }
  if (pathname.startsWith("/assets/")) {
    return CACHE_CONTROL_IMMUTABLE;
  }
  return CACHE_CONTROL_HTML;
}
