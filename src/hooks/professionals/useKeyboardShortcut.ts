// hooks/professionals/useKeyboardShortcut.ts
"use client";

import { useEffect } from "react";

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options?: { preventDefault?: boolean }
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const activeElement = document.activeElement;
      const isTyping =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute("contenteditable") === "true";

      if (event.key === key && !isTyping) {
        if (options?.preventDefault) {
          event.preventDefault();
        }
        callback();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback, options]);
}
