"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      data-theme-transition="true"
      onClick={toggleTheme}
      title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
      aria-label={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
      className={`relative h-9 w-9 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs cursor-pointer overflow-hidden group select-none active:scale-90 transition-transform duration-150 ${className}`}
    >
      {/* Sun Icon (Visible & rotated in Light Mode, hidden & rotated out in Dark Mode) */}
      <Sun
        data-theme-transition="true"
        className="h-4 w-4 text-amber-500 transition-all duration-300 ease-in-out transform rotate-0 scale-100 opacity-100 dark:-rotate-90 dark:scale-0 dark:opacity-0"
      />

      {/* Moon Icon (Hidden & rotated out in Light Mode, visible & rotated in in Dark Mode) */}
      <Moon
        data-theme-transition="true"
        className="absolute h-4 w-4 text-blue-400 transition-all duration-300 ease-in-out transform rotate-90 scale-0 opacity-0 dark:rotate-0 dark:scale-100 dark:opacity-100"
      />
    </button>
  );
}
