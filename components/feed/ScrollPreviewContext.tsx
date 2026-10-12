"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface ScrollPreviewContextType {
  activeFilmId: string | null;
  setActiveFilmId: (id: string | null) => void;
  previewsEnabled: boolean;
}

const ScrollPreviewContext = createContext<ScrollPreviewContextType>({
  activeFilmId: null,
  setActiveFilmId: () => {},
  previewsEnabled: true,
});

export function ScrollPreviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeFilmId, setActiveFilmId] = useState<string | null>(null);
  const [previewsEnabled, setPreviewsEnabled] = useState(true);

  useEffect(() => {
    // Check reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const checkReducedMotion = () => {
      if (mediaQuery.matches) {
        setPreviewsEnabled(false);
        return true;
      }
      return false;
    };

    if (checkReducedMotion()) return;

    // Check data saver / connection speed
    const nav = navigator as Navigator & {
      connection?: {
        saveData?: boolean;
        effectiveType?: string;
      };
    };

    if (
      nav.connection?.saveData === true ||
      nav.connection?.effectiveType === "slow-2g" ||
      nav.connection?.effectiveType === "2g"
    ) {
      setPreviewsEnabled(false);
      return;
    }

    const handler = (e: MediaQueryListEvent) => {
      setPreviewsEnabled(!e.matches);
      if (e.matches) setActiveFilmId(null);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return (
    <ScrollPreviewContext.Provider
      value={{
        activeFilmId,
        setActiveFilmId,
        previewsEnabled,
      }}
    >
      {children}
    </ScrollPreviewContext.Provider>
  );
}

export function useScrollPreview() {
  return useContext(ScrollPreviewContext);
}
