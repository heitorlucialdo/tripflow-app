import { useState } from "react";

const KEY = "rj2025-notes";

function load(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}

export function useNotes() {
  const [notes, setNotes] = useState<Record<string, string>>(load);

  function save(place: string, text: string) {
    setNotes((prev) => {
      const next = { ...prev, [place]: text };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }

  return { notes, save };
}
