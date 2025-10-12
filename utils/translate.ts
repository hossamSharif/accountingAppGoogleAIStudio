import { translations } from '../i18n/translations';

/**
 * Translation utility for non-React code (services, utilities)
 * This function can be used outside of React components where hooks are not available
 */
export const translate = (
  key: string,
  language: 'ar' | 'en' = 'ar',
  params?: Record<string, any>
): string => {
  const keys = key.split('.');
  let value: any = translations[language];

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) break;
  }

  if (typeof value !== 'string') {
    console.warn(`Translation missing for key: ${key} in language: ${language}`);
    return key;
  }

  // Replace parameters
  if (params) {
    return Object.entries(params).reduce((str, [k, v]) => {
      return str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }, value);
  }

  return value;
};

/**
 * Get current language from localStorage
 */
export const getCurrentLanguage = (): 'ar' | 'en' => {
  const saved = localStorage.getItem('app_language');
  return (saved === 'en' || saved === 'ar') ? saved : 'ar';
};

/**
 * Translate using current language from localStorage
 */
export const t = (key: string, params?: Record<string, any>): string => {
  const language = getCurrentLanguage();
  return translate(key, language, params);
};
