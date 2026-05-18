import { Theme } from '../types.js';

export const darkTheme: Theme = {
  name: 'dark',
  foreground: '#c9d1d9',
  background: '#0d1117',
  highlight: '#ffd700',
  statusBarBg: '#161b22',
  statusBarFg: '#8b949e',
};

export const lightTheme: Theme = {
  name: 'light',
  foreground: '#24292f',
  background: '#ffffff',
  highlight: '#ff4500',
  statusBarBg: '#f6f8fa',
  statusBarFg: '#57606a',
};

export const highContrastTheme: Theme = {
  name: 'high-contrast',
  foreground: '#ffffff',
  background: '#000000',
  highlight: '#00ff00',
  statusBarBg: '#1a1a1a',
  statusBarFg: '#cccccc',
};

export const themes: Record<string, Theme> = {
  dark: darkTheme,
  light: lightTheme,
  'high-contrast': highContrastTheme,
};

export const defaultTheme = darkTheme;
