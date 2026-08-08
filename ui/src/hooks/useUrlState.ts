import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

type HistoryMode = 'replace' | 'push';

interface UseUrlStateOptions<T extends string> {
  key: string;
  defaultValue: T;
  /** 'replace' for filters (no back-button spam), 'push' for tabs/views. */
  mode?: HistoryMode;
  /** Validate a URL value; return null to ignore it (keep default). Omit to accept any string. */
  validate?: (value: string) => T | null;
}

/**
 * Binds a piece of state to a URL query param. The URL is the single source of
 * truth — the value is derived from the query string on every render, and the
 * setter writes it back with replace (filters) or push (tabs/views) history.
 *
 * Deep-link safety: unknown/invalid values fall back to the default (or are
 * ignored via `validate`) so a bad/stale link never crashes. For values that
 * depend on async-loaded data (e.g. map names), pass a `validate` that returns
 * null until the valid set is known, OR tolerate unknown values by omitting it.
 */
export function useUrlState<T extends string>({
  key,
  defaultValue,
  mode = 'replace',
  validate,
}: UseUrlStateOptions<T>): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(key);
  let value: T = defaultValue;
  if (raw != null && raw !== '') {
    value = validate ? (validate(raw) ?? defaultValue) : (raw as T);
  }

  const set = useCallback(
    (next: T) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === defaultValue || next === '') {
            params.delete(key);
          } else {
            params.set(key, String(next));
          }
          return params;
        },
        { replace: mode === 'replace' },
      );
    },
    [key, defaultValue, mode, setSearchParams],
  );

  return [value, set];
}
