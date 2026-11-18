import { createContext, useContext, type ReactNode } from "react";
import { en, type Messages } from "./locales/en";

const I18nContext = createContext<Messages>(en);

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nContext.Provider value={en}>{children}</I18nContext.Provider>;
}

export function useI18n(): Messages {
  return useContext(I18nContext);
}
