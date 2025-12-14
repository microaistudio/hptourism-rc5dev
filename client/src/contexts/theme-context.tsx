import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeName = "classic" | "professional-blue" | "mountain-sky";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const FALLBACK_THEME: ThemeName = "classic";
const THEME_OPTIONS: ThemeName[] = [
  "classic",
  "professional-blue",
  "mountain-sky",
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem("hp-tourism-theme");
    if (saved && THEME_OPTIONS.includes(saved as ThemeName)) {
      return saved as ThemeName;
    }
    return FALLBACK_THEME;
  });

  useEffect(() => {
    localStorage.setItem("hp-tourism-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
