import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { translations, type Locale } from "./translations";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "vi",
  setLocale: () => {},
  t: (key) => key,
});

export const useI18n = () => useContext(I18nContext);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem("scp-locale") as Locale | null;
    return stored || "vi";
  });

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("scp-locale", l);
  };

  const t = useCallback(
    (key: string): string => translations[locale]?.[key] ?? translations.vi[key] ?? key,
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}
