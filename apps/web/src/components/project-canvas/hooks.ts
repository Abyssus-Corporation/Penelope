import { useMemo, useSyncExternalStore } from "react";

function subscribe(query: string) {
  return (onChange: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener?.("change", onChange);
    return () => list.removeEventListener?.("change", onChange);
  };
}

export function useMediaQuery(query: string): boolean {
  const onSubscribe = useMemo(() => subscribe(query), [query]);
  return useSyncExternalStore(
    onSubscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** Phones get the list first: a canvas is a poor default on a 320px screen. */
export const NARROW_QUERY = "(max-width: 767px)";
