"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function to disable transitions momentarily during theme switch
// This eliminates flicker/flashing on scrollbars and backgrounds (Next-themes / Shadcn pattern)
const disableTransitionsTemporarily = () => {
  if (typeof document === "undefined") return () => {};

  const css = document.createElement("style");
  css.setAttribute("type", "text/css");
  css.setAttribute("id", "disable-theme-transitions");
  css.appendChild(
    document.createTextNode(
      "*:not([data-theme-transition]):not([data-theme-transition] *),*::before,*::after,::-webkit-scrollbar,::-webkit-scrollbar-thumb,::-webkit-scrollbar-corner{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
    )
  );
  document.head.appendChild(css);

  return () => {
    // Force a reflow
    (() => window.getComputedStyle(document.body))();

    // Re-enable transitions after browser paints the frame
    setTimeout(() => {
      const existing = document.getElementById("disable-theme-transitions");
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
    }, 16);
  };
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always default to "light" for a comfortable, eye-friendly light mode
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Reset to light mode unconditionally on initial load to ensure light theme priority
    setThemeState("light");
    applyTheme("light", false);
    localStorage.setItem("agrolens_theme", "light");
    setMounted(true);
  }, []);

  const applyTheme = (newTheme: Theme, disableTransitions: boolean = true) => {
    if (typeof document !== "undefined") {
      const enableTransitions = disableTransitions
        ? disableTransitionsTemporarily()
        : () => {};

      const root = document.documentElement;
      if (newTheme === "dark") {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      } else {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      }

      enableTransitions();
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("agrolens_theme", newTheme);
    applyTheme(newTheme, true);
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setTheme, isDark: theme === "dark" }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
