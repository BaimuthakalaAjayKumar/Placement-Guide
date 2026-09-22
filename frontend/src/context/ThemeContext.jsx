import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Show Dark Mode by default whenever accounts or app are opened
  const [theme, setThemeState] = useState(() => {
    const savedPref = localStorage.getItem('app_theme_pref');
    if (savedPref === 'light' || savedPref === 'dark') {
      return savedPref;
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${theme}`);
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // Listen for account open events to reset/ensure dark mode by default
  useEffect(() => {
    const handleAccountOpened = (e) => {
      const targetTheme = e?.detail || 'dark';
      setThemeState(targetTheme);
      localStorage.setItem('app_theme_pref', targetTheme);
      localStorage.setItem('app_theme', targetTheme);
    };

    window.addEventListener('account_opened', handleAccountOpened);
    window.addEventListener('app_theme_change', handleAccountOpened);
    return () => {
      window.removeEventListener('account_opened', handleAccountOpened);
      window.removeEventListener('app_theme_change', handleAccountOpened);
    };
  }, []);

  const toggleTheme = () => {
    setThemeState((prevTheme) => {
      const nextTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('app_theme_pref', nextTheme);
      localStorage.setItem('app_theme', nextTheme);
      return nextTheme;
    });
  };

  const setTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setThemeState(newTheme);
      localStorage.setItem('app_theme_pref', newTheme);
      localStorage.setItem('app_theme', newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
