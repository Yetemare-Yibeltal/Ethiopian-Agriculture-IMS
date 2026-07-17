'use client';

import { useCallback, useEffect, useState } from 'react';

// ─── Storage Keys ─────────────────────────────────────────
export const STORAGE_KEYS = {
  LANGUAGE: 'agro_language',
  SIDEBAR_COLLAPSED: 'agro_sidebar_collapsed',
  MAP_ZOOM: 'agro_map_zoom',
  MAP_CENTER: 'agro_map_center',
  LAST_REGION_FILTER: 'agro_last_region',
  LAST_SEASON_FILTER: 'agro_last_season',
  TABLE_PAGE_SIZE: 'agro_table_page_size',
  THEME: 'agro_theme',
  FARMER_LIST_VIEW: 'agro_farmer_list_view',
  DASHBOARD_LAYOUT: 'agro_dashboard_layout',
  NOTIFICATION_SOUND: 'agro_notification_sound',
  COMPACT_MODE: 'agro_compact_mode',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// ─── Helper: Safe JSON parse ──────────────────────────────
const safeJsonParse = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

// ─── Helper: Is browser ──────────────────────────────────
const isBrowser = (): boolean => typeof window !== 'undefined';

// ─── useLocalStorage ─────────────────────────────────────
/**
 * Type-safe localStorage hook with SSR support.
 *
 * Usage:
 *   const [language, setLanguage] = useLocalStorage('agro_language', 'en');
 *   const [collapsed, setCollapsed] = useLocalStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Initialize state from localStorage or use initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!isBrowser()) {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? safeJsonParse(item, initialValue) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Update localStorage when state changes
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prev) => {
          const newValue = value instanceof Function ? value(prev) : value;

          if (isBrowser()) {
            window.localStorage.setItem(key, JSON.stringify(newValue));
          }

          return newValue;
        });
      } catch (error) {
        console.warn(`useLocalStorage: Failed to set "${key}"`, error);
      }
    },
    [key],
  );

  // Remove item from localStorage
  const removeValue = useCallback(() => {
    try {
      if (isBrowser()) {
        window.localStorage.removeItem(key);
      }
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`useLocalStorage: Failed to remove "${key}"`, error);
    }
  }, [key, initialValue]);

  // Sync with other tabs/windows
  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key) {
        return;
      }

      if (event.newValue === null) {
        setStoredValue(initialValue);
      } else {
        setStoredValue(safeJsonParse(event.newValue, initialValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// ─── useSessionStorage ────────────────────────────────────
/**
 * Type-safe sessionStorage hook.
 * Data is cleared when the browser tab is closed.
 * Used for temporary state like current filter selections.
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!isBrowser()) {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      return item !== null ? safeJsonParse(item, initialValue) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prev) => {
          const newValue = value instanceof Function ? value(prev) : value;

          if (isBrowser()) {
            window.sessionStorage.setItem(key, JSON.stringify(newValue));
          }

          return newValue;
        });
      } catch (error) {
        console.warn(`useSessionStorage: Failed to set "${key}"`, error);
      }
    },
    [key],
  );

  const removeValue = useCallback(() => {
    try {
      if (isBrowser()) {
        window.sessionStorage.removeItem(key);
      }
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`useSessionStorage: Failed to remove "${key}"`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// ─── Specific Storage Hooks ───────────────────────────────

/**
 * Persists the user's language preference
 */
export function useLanguagePreference() {
  return useLocalStorage<'en' | 'am'>(STORAGE_KEYS.LANGUAGE, 'en');
}

/**
 * Persists the sidebar collapsed state
 */
export function useSidebarState() {
  return useLocalStorage<boolean>(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
}

/**
 * Persists the map zoom level
 */
export function useMapZoom() {
  return useLocalStorage<number>(STORAGE_KEYS.MAP_ZOOM, 6);
}

/**
 * Persists the map center coordinates
 */
export function useMapCenter() {
  return useLocalStorage<[number, number]>(
    STORAGE_KEYS.MAP_CENTER,
    [9.0, 38.7],
  );
}

/**
 * Persists the last selected region filter
 */
export function useLastRegionFilter() {
  return useLocalStorage<string | null>(STORAGE_KEYS.LAST_REGION_FILTER, null);
}

/**
 * Persists the last selected season filter
 */
export function useLastSeasonFilter() {
  return useLocalStorage<'Meher' | 'Belg'>(
    STORAGE_KEYS.LAST_SEASON_FILTER,
    'Meher',
  );
}

/**
 * Persists the table page size preference
 */
export function useTablePageSize() {
  return useLocalStorage<number>(STORAGE_KEYS.TABLE_PAGE_SIZE, 20);
}

/**
 * Persists the farmer list view mode (table or card)
 */
export function useFarmerListView() {
  return useLocalStorage<'table' | 'card'>(
    STORAGE_KEYS.FARMER_LIST_VIEW,
    'table',
  );
}

/**
 * Persists notification sound preference
 */
export function useNotificationSound() {
  return useLocalStorage<boolean>(STORAGE_KEYS.NOTIFICATION_SOUND, true);
}

/**
 * Persists compact mode preference
 */
export function useCompactMode() {
  return useLocalStorage<boolean>(STORAGE_KEYS.COMPACT_MODE, false);
}

export default useLocalStorage;
