import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// ─── Supported Languages ──────────────────────────────────
export const SUPPORTED_LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    dir: 'ltr',
    flag: '🇬🇧',
  },
  am: {
    code: 'am',
    name: 'Amharic',
    nativeName: 'አማርኛ',
    dir: 'ltr',
    flag: '🇪🇹',
  },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// ─── Namespaces ───────────────────────────────────────────
export const NAMESPACES = {
  COMMON: 'common',
  AUTH: 'auth',
  DASHBOARD: 'dashboard',
  FARMERS: 'farmers',
  YIELDS: 'yields',
  DISTRIBUTIONS: 'distributions',
  ORGANIZATIONS: 'organizations',
  USERS: 'users',
  MAP: 'map',
  ANALYTICS: 'analytics',
  EXPORTS: 'exports',
  NOTIFICATIONS: 'notifications',
  AUDIT: 'audit',
  SETTINGS: 'settings',
  ERRORS: 'errors',
  VALIDATION: 'validation',
} as const;

export type Namespace = (typeof NAMESPACES)[keyof typeof NAMESPACES];

// ─── i18n Configuration ───────────────────────────────────
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Default language
    fallbackLng: 'en',

    // Supported languages
    supportedLngs: Object.keys(SUPPORTED_LANGUAGES),

    // Default namespace
    defaultNS: NAMESPACES.COMMON,

    // All namespaces
    ns: Object.values(NAMESPACES),

    // Load translations from public/locales
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Language detection settings
    detection: {
      // Check these sources in order
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Store detected language in localStorage
      caches: ['localStorage'],
      // localStorage key
      lookupLocalStorage: 'agro_language',
    },

    interpolation: {
      // React already handles XSS
      escapeValue: false,
    },

    // React specific settings
    react: {
      useSuspense: false,
    },

    // Development settings
    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;

// ─── Helper Functions ─────────────────────────────────────

/**
 * Change the app language
 */
export const changeLanguage = async (
  lang: SupportedLanguage,
): Promise<void> => {
  await i18n.changeLanguage(lang);
  localStorage.setItem('agro_language', lang);

  // Update HTML dir attribute for RTL support
  document.documentElement.dir = SUPPORTED_LANGUAGES[lang].dir;
  document.documentElement.lang = lang;
};

/**
 * Get the current language
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  const lang = i18n.language as SupportedLanguage;
  return lang in SUPPORTED_LANGUAGES ? lang : 'en';
};

/**
 * Check if current language is Amharic
 */
export const isAmharic = (): boolean => {
  return getCurrentLanguage() === 'am';
};

/**
 * Get language display info
 */
export const getLanguageInfo = (lang: SupportedLanguage) => {
  return SUPPORTED_LANGUAGES[lang];
};
