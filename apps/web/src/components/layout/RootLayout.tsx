import { Outlet } from "react-router-dom";

export function RootLayout() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:outline-none focus:ring-1 focus:ring-ring"
      >
        Skip to main content
      </a>
      <Outlet />
    </>
  );
}
