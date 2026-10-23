import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function subscribe(cb: () => void) {
  window.addEventListener("themechange", cb);
  return () => window.removeEventListener("themechange", cb);
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage may be unavailable (private mode) */
  }
  window.dispatchEvent(new Event("themechange"));
}

/** Read and toggle the light/dark theme. Initial value is set by an inline script in the root shell. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setTheme = useCallback((t: Theme) => apply(t), []);
  const toggle = useCallback(() => apply(getSnapshot() === "dark" ? "light" : "dark"), []);
  return { theme, setTheme, toggle };
}
