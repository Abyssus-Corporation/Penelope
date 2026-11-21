/// <reference types="vitest/config" />
import { defineConfig, type PreviewServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { existsSync } from "node:fs";
import { cacheControlForPath, PREVIEW_SECURITY_HEADERS } from "./security-headers";

function previewSecurityPlugin() {
  return {
    name: "penelope-preview-security-headers",
    configurePreviewServer(server: PreviewServer) {
      // Run before Vite's preview middleware. Cache-Control is applied at
      // writeHead so a missing /assets/* file gets no-store (not immutable).
      // Hashed assets must 404 when missing; Vite's SPA fallback would
      // otherwise serve index.html as 200.
      const dist = path.resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? "/").split("?")[0] ?? "/";
        for (const [name, value] of Object.entries(PREVIEW_SECURITY_HEADERS)) {
          res.setHeader(name, value);
        }
        if (pathname.startsWith("/assets/")) {
          const assetsDir = path.join(dist, "assets");
          const file = path.resolve(assetsDir, path.relative("/assets", pathname));
          if (!file.startsWith(assetsDir + path.sep) || !existsSync(file)) {
            res.statusCode = 404;
            res.setHeader("Cache-Control", cacheControlForPath(pathname, 404));
            res.end("Not found");
            return;
          }
        }
        const originalSetHeader = res.setHeader.bind(res);
        const locked = new Set(
          [...Object.keys(PREVIEW_SECURITY_HEADERS), "Cache-Control"].map((key) =>
            key.toLowerCase(),
          ),
        );
        res.setHeader = ((name: string, value: number | string | readonly string[]) => {
          if (locked.has(name.toLowerCase())) return res;
          return originalSetHeader(name, value);
        }) as typeof res.setHeader;
        const originalWriteHead = res.writeHead.bind(res);
        res.writeHead = ((...args: unknown[]) => {
          const status = typeof args[0] === "number" ? args[0] : res.statusCode;
          originalSetHeader("Cache-Control", cacheControlForPath(pathname, status));
          return originalWriteHead(...(args as Parameters<typeof res.writeHead>));
        }) as typeof res.writeHead;
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
