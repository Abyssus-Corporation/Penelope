import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        {/* One provider for every tooltip in the app; per-component providers cost ~1ms per card. */}
        <Tooltip.Provider>
          <App />
        </Tooltip.Provider>
        <Toaster richColors position="bottom-right" />
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
