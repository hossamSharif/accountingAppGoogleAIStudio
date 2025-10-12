import { Language } from '../i18n/i18nContext';

export const getBilingualText = (
  textAr: string,
  textEn: string | undefined,
  language: Language
): string => {
  if (language === 'en' && textEn) return textEn;
  return textAr; // Fallback to Arabic
};

export const getBilingualField = (
  obj: any,
  fieldName: string,
  language: Language
): string => {
  const enField = `${fieldName}En`;
  if (language === 'en' && obj[enField]) {
    return obj[enField];
  }
  return obj[fieldName] || '';
};
