import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n";
import "./index.css";
import { routes } from "./routes";

// A data router is needed for the route errorElement.
const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      {/* One provider for every tooltip in the app; per-component providers cost ~1ms per card. */}
      <Tooltip.Provider>
        <RouterProvider router={router} />
      </Tooltip.Provider>
      <Toaster richColors position="bottom-right" />
    </I18nProvider>
  </StrictMode>,
);
