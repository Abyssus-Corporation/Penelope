/**
 * Dashboard security and cache headers for the production preview server.
 * Keep `deploy/Caddyfile` in sync with these values.
 *
 * CSP is intentionally not applied to the Vite dev server: HMR and the React
 * refresh runtime need eval and a looser policy.
 */

/** Enforced CSP for the built dashboard. No third-party origins.
 *
 * `style-src` includes `'unsafe-inline'` because Radix UI and Sonner inject
 * `<style>` elements at runtime. Hashes are not practical for those dynamic tags.
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
].join("; ");

/**
 * Trusted Types in Report-Only. React 18 still assigns to innerHTML in a few
 * places (toasts, some Radix portals), so this is not enforced yet.
 */
export const TRUSTED_TYPES_REPORT_ONLY = "require-trusted-types-for 'script'";

export const CACHE_CONTROL_HTML = "no-store";
export const CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000, immutable";

/** Headers for Vite preview (HTTP). HSTS and upgrade-insecure-requests belong on TLS in Caddy. */
export const PREVIEW_SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Content-Security-Policy-Report-Only": TRUSTED_TYPES_REPORT_ONLY,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), display-capture=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export function cacheControlForPath(pathname: string): string {
  if (pathname.startsWith("/assets/") || pathname.startsWith("/fonts/")) {
    return CACHE_CONTROL_IMMUTABLE;
  }
  return CACHE_CONTROL_HTML;
}
