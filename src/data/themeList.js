// src/data/themeList.js
export const ThemeList = [
  { name: "Pink",  value: "pink",  icon: "🟣" },
  { name: "Ocean", value: "ocean", icon: "🔵" },
];

// (Optional) If you want to read CSS variables, export a function
// that you call INSIDE a client component/useEffect:
export function readThemeColorsFromCSS(theme) {
  if (typeof window === "undefined") return null; // SSR guard
  const r = document.documentElement;
  const css = getComputedStyle(r);
  if (theme === "pink") {
    return {
      primary: css.getPropertyValue("--pink-primary").trim(),
      bd: css.getPropertyValue("--pink-bd").trim(),
      greyTxt: css.getPropertyValue("--pink-greyTxt").trim(),
      mmHover: css.getPropertyValue("--pink-mmHover").trim()
    };
  }
  if (theme === "ocean") {
    return {
      primary: css.getPropertyValue("--ocean-primary").trim(),
      bd: css.getPropertyValue("--ocean-bd").trim(),
      mmHover: css.getPropertyValue("--ocean-mmHover").trim()
    };
  }
  return null;
}
