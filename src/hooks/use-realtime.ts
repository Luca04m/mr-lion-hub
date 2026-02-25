import { useEffect, useCallback, useRef } from "react";
import { subscribe } from "@/lib/store";

/**
 * Hook that triggers a callback whenever Supabase realtime pushes
 * new data into the localStorage cache. Use this in pages to reload
 * their local state from the store.
 */
export function useRealtime(onDataChange: () => void) {
  const callbackRef = useRef(onDataChange);
  callbackRef.current = onDataChange;

  useEffect(() => {
    const unsub = subscribe(() => callbackRef.current());
    return unsub;
  }, []);
}
