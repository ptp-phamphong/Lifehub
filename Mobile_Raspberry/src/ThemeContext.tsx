import React, { createContext, useContext, useEffect, useState } from 'react';
import { getApiBaseUrl } from './config';

// ── Dark mode color palette ──
export const lightColors = {
  background: '#f1f5f9',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  primary: '#0ea5e9',
  primaryHover: '#0284c7',
  danger: '#ef4444',
  headerBg: '#0d6efd',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e2e8f0',
  cardCpuBg: '#fffbeb',
  cardCpuBorder: '#fcd34d',
  cardCpuValue: '#b45309',
  cardRamBg: '#f0f9ff',
  cardRamBorder: '#7dd3fc',
  cardRamValue: '#0369a1',
  cardStorageBg: '#f0fdf4',
  cardStorageBorder: '#86efac',
  cardStorageValue: '#15803d',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  errorText: '#dc2626',
  summaryBg: '#e0f2fe',
  summaryText: '#0ea5e9',
  inputBg: '#f8fafc',
};

export const darkColors = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceAlt: '#334155',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: '#334155',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  danger: '#ef4444',
  headerBg: '#1e293b',
  tabBarBg: '#1e293b',
  tabBarBorder: '#334155',
  cardCpuBg: '#78350f',
  cardCpuBorder: '#92400e',
  cardCpuValue: '#fbbf24',
  cardRamBg: '#164e63',
  cardRamBorder: '#155e75',
  cardRamValue: '#7dd3fc',
  cardStorageBg: '#065f46',
  cardStorageBorder: '#047857',
  cardStorageValue: '#6ee7b7',
  errorBg: '#450a0a',
  errorBorder: '#991b1b',
  errorText: '#fca5a5',
  summaryBg: '#1e3a5f',
  summaryText: '#60a5fa',
  inputBg: '#0f172a',
};

export type ThemeColors = typeof lightColors;

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: lightColors,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Fetch mobile dark mode setting from API
    const url = `${getApiBaseUrl()}/GetThemeSetting`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.mobileDarkMode === true) {
          setIsDark(true);
        }
      })
      .catch((err) => {
        console.warn('Failed to load theme setting:', err.message);
      });
  }, []);

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}
