import { useI18n } from './i18nContext';

export const useTranslation = () => {
  const { t, language, dir } = useI18n();
  return { t, language, dir };
};
