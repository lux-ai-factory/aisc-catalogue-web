import { useEffect, useState } from "react";

/**
 * Returns true when the viewport is at or below `breakpoint` px wide.
 * Used to switch inline styles to a mobile-friendly layout (the app uses
 * inline styles, so CSS media queries aren't an option).
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}
