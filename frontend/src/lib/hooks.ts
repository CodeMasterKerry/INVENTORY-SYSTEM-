"use client";
import { useSyncExternalStore } from "react";

// True only after the component mounted in the browser.
// Prevents server/browser mismatches when reading the saved login.
export function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}