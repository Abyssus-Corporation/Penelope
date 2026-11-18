import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <App />
        <Toaster richColors position="bottom-right" />
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
