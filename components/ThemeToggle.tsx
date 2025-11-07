import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';
import { useTranslation } from '../i18n/useTranslation';

// Icons
const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
  </svg>
);

const SystemIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
  </svg>
);

interface ThemeOption {
  mode: ThemeMode;
  icon: React.ReactNode;
  label: string;
}

const ThemeToggle: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themeOptions: ThemeOption[] = [
    { mode: 'light', icon: <SunIcon />, label: t('theme.light', {}, 'common') },
    { mode: 'dark', icon: <MoonIcon />, label: t('theme.dark', {}, 'common') },
    { mode: 'system', icon: <SystemIcon />, label: t('theme.system', {}, 'common') },
  ];

  const currentOption = themeOptions.find(option => option.mode === theme) || themeOptions[2];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2 rounded-lg bg-surface hover:bg-surface-hover transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
        }}
        title={t('theme.toggle', {}, 'common')}
        aria-label={t('theme.toggle', {}, 'common')}
      >
        {currentOption.icon}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 mt-2 w-40 rounded-lg shadow-lg overflow-hidden z-50"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {themeOptions.map((option) => (
            <button
              key={option.mode}
              onClick={() => handleThemeChange(option.mode)}
              className="w-full flex items-center px-4 py-2 text-sm transition-colors duration-150"
              style={{
                color: theme === option.mode ? 'var(--color-primary)' : 'var(--color-text-primary)',
                backgroundColor: theme === option.mode ? 'var(--color-surface-hover)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
              }}
              onMouseLeave={(e) => {
                if (theme !== option.mode) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="ml-3">{option.icon}</span>
              <span className="mr-3">{option.label}</span>
              {theme === option.mode && (
                <svg
                  className="w-4 h-4 mr-auto"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  style={{ color: 'var(--color-primary)' }}
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Visual indicator of resolved theme when system mode is active */}
      {theme === 'system' && (
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2"
          style={{
            backgroundColor: resolvedTheme === 'dark' ? '#1F2937' : '#F9FAFB',
            borderColor: 'var(--color-border)',
          }}
          title={`${t('theme.currentlyUsing', {}, 'common')}: ${resolvedTheme === 'dark' ? t('theme.dark', {}, 'common') : t('theme.light', {}, 'common')}`}
        />
      )}
    </div>
  );
};

export default ThemeToggle;
