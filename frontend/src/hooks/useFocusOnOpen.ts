import { useEffect, useRef } from "react";

/** A dialog's ref that takes the focus when the dialog opens, so the keyboard
 *  (Escape, Tab) works in it rather than on the page behind. The element needs
 *  tabIndex={-1}. */
export function useFocusOnOpen<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);
  return ref;
}
