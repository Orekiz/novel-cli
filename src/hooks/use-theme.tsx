import { createContext, useContext, useState, ReactNode } from 'react';
import { Theme } from '../types.js';
import { themes, defaultTheme } from '../themes/index.js';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (name: string) => boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  setTheme: () => false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  const setTheme = (name: string): boolean => {
    if (themes[name]) {
      setThemeState(themes[name]);
      return true;
    }
    return false;
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
