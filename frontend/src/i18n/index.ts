import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en/translation.json';
import guTranslation from './locales/gu/translation.json';
import hiTranslation from './locales/hi/translation.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', flag: '🇮🇳' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

// 1. Saved preference in localStorage
// 2. Browser language (gu-* -> gu, hi-* -> hi, en-* -> en)
// 3. Fallback to English
const getInitialLanguage = (): SupportedLanguage => {
  try {
    const saved = localStorage.getItem('sahay_language');
    if (saved && (saved === 'en' || saved === 'gu' || saved === 'hi')) {
      return saved as SupportedLanguage;
    }

    const browserLang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
    if (browserLang.startsWith('gu')) return 'gu';
    if (browserLang.startsWith('hi')) return 'hi';
    if (browserLang.startsWith('en')) return 'en';
  } catch {
    // ignore localStorage access errors
  }
  return 'en';
};

const initialLang = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      gu: { translation: guTranslation },
      hi: { translation: hiTranslation },
    },
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'sahay_language',
    },
  });

// Synchronize document lang attribute and localStorage whenever language changes
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('sahay_language', lng);
    document.documentElement.lang = lng;
  } catch {
    // ignore
  }
});

// Set initial document lang
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
}

/**
 * Format a Date using Intl.DateTimeFormat in the current locale
 */
export const formatLocalizedDate = (
  date: string | number | Date,
  options?: Intl.DateTimeFormatOptions | string
): string => {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    const currentLang = typeof options === 'string' ? options : (i18n.language || 'en');
    const locale = currentLang.startsWith('gu') ? 'gu-IN' : currentLang.startsWith('hi') ? 'hi-IN' : 'en-IN';
    const fmtOptions: Intl.DateTimeFormatOptions = typeof options === 'object' && options !== null ? options : {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    return new Intl.DateTimeFormat(locale, fmtOptions).format(d);
  } catch {
    return String(date);
  }
};

/**
 * Format relative time (e.g. "5m ago", "2 hours ago") localized
 */
export const formatLocalizedTimeAgo = (dateStr: string | number | Date): string => {
  try {
    const date = typeof dateStr === 'string' || typeof dateStr === 'number' ? new Date(dateStr) : dateStr;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const t = i18n.t.bind(i18n);

    if (diffSecs < 60) return t('time.justNow', 'Just now');
    if (diffMins < 60) return `${diffMins} ${t('time.minutesAgo', 'minutes ago')}`;
    if (diffHours < 24) return `${diffHours} ${t('time.hoursAgo', 'hours ago')}`;
    if (diffDays === 1) return t('time.yesterday', 'Yesterday');
    return `${diffDays} ${t('time.daysAgo', 'days ago')}`;
  } catch {
    return '';
  }
};

export default i18n;
