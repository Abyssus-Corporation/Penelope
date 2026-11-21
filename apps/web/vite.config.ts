/// <reference types="vitest/config" />
import { defineConfig, type PreviewServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { cacheControlForPath, PREVIEW_SECURITY_HEADERS } from "./security-headers";

function previewSecurityPlugin() {
  return {
    name: "penelope-preview-security-headers",
    configurePreviewServer(server: PreviewServer) {
      // Run before Vite's preview middleware, then ignore later Cache-Control
      // overwrites (preview sets `no-cache` on HTML).
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? "/").split("?")[0] ?? "/";
        const locked: Record<string, string> = {
          ...PREVIEW_SECURITY_HEADERS,
          "Cache-Control": cacheControlForPath(pathname),
        };
        for (const [name, value] of Object.entries(locked)) {
          res.setHeader(name, value);
        }
        const originalSetHeader = res.setHeader.bind(res);
        res.setHeader = ((name: string, value: number | string | readonly string[]) => {
          const blocked = Object.keys(locked).some(
            (key) => key.toLowerCase() === name.toLowerCase(),
          );
          if (blocked) return res;
          return originalSetHeader(name, value);
        }) as typeof res.setHeader;
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), previewSecurityPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
