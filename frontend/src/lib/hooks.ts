"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

// Loads data from the API. Pass a STABLE function (defined outside the component).
export function useFetch<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetcher());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    let active = true;
    const loadingTimer = window.setTimeout(() => {
      if (active) {
        setLoading(true);
        setError("");
      }
    }, 0);
    fetcher()
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((failure) => {
        if (active) {
          setData(null);
          setError(failure instanceof Error ? failure.message : "Failed to load");
        }
      })
      .finally(() => {
        window.clearTimeout(loadingTimer);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [fetcher]);

  return { data, error, loading, reload };
}