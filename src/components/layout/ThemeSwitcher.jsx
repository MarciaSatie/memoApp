"use client";
const THEME_KEY = "theme";

export default function ThemeSwitcher() {

    if (typeof window !== "undefined") {
    // On initial load, set theme from localStorage if available
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
        document.documentElement.setAttribute("data-theme", savedTheme);
    }
    }


  return (
    <div className="fixed top-2 right-2 flex gap-2">
      <button
        onClick={() => {
            localStorage.setItem(THEME_KEY, "pink");
            document.documentElement.removeAttribute("data-theme");
        }}
        className="px-2 py-1 rounded bg-bd text-white text-sm"
      >
        🌸
      </button>
      <button
        onClick={() => {
            localStorage.setItem(THEME_KEY, "ocean");
            document.documentElement.setAttribute("data-theme", "ocean");
        }}
        className="px-2 py-1 rounded bg-bd text-white text-sm"
      >
        🌊
      </button>
    </div>
  );
}
