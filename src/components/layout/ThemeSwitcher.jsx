"use client";
const THEME_KEY = "theme";
import { useEffect } from "react";
import { ThemeList } from "@/data/themeList";


export default function ThemeSwitcher() {

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem(THEME_KEY) || "pink";
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const setTheme = (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  return (
    <div className="fixed top-2 left-2 flex gap-2">
      {ThemeList.map((theme) => (
        <button
          key={theme.value}
          onClick={() => setTheme(theme.value)}
          className="px-2 py-1 rounded bg-bd text-white text-sm"
        >
          {theme.icon ?? theme.name}
        </button>
      ))}

    </div>
  );
}
