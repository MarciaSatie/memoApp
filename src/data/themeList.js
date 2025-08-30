// themeList.js
export const ThemeList = [
  {
    name: "Pink",
    value: "pink",
    icon: "🟣",
    colorList: {
      primary: getComputedStyle(document.documentElement).getPropertyValue("--pink-primary"),
      bd: getComputedStyle(document.documentElement).getPropertyValue("--pink-bd"),
      greyTxt: getComputedStyle(document.documentElement).getPropertyValue("--pink-greyTxt"),
    },
  },
  {
    name: "Ocean",
    value: "ocean",
    icon: "🔵",
    colorList: {
      primary: getComputedStyle(document.documentElement).getPropertyValue("--ocean-primary"),
      bd: getComputedStyle(document.documentElement).getPropertyValue("--ocean-bd"),
    },
  },
];
