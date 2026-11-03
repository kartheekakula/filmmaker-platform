"use client";

import { useState, useEffect } from "react";

export const SEARCH_MIN_CHARS = 2;

/**
 * Reusable debounce hook (default 250 ms).
 */
export function useDebounce<T>(value: T, delayMs: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * Validates if a search string meets the minimum character threshold (2 chars).
 */
export function isValidSearchTerm(term: string | null | undefined): boolean {
  return typeof term === "string" && term.trim().length >= SEARCH_MIN_CHARS;
}
