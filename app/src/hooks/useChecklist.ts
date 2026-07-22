import { useState, useCallback } from "react";

function storageKey(userId: string) {
  return `rj2025-checklist-${userId}`;
}

function load(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function useChecklist(userId: string) {
  const [checked, setChecked] = useState<string[]>(() => load(userId));

  const toggle = useCallback((name: string) => {
    setChecked((prev) => {
      const next = prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name];
      localStorage.setItem(storageKey(userId), JSON.stringify(next));
      return next;
    });
  }, [userId]);

  const reset = useCallback(() => {
    localStorage.removeItem(storageKey(userId));
    setChecked([]);
  }, [userId]);

  return { checked, toggle, reset };
}
