"use client";

import { useEffect } from "react";

/**
 * Next.js injects a visually hidden route announcer with role="alert". That makes every page carry an
 * extra, empty alert, so assistive tech and tests can't single out real error messages. Switch it to
 * role="status"; it keeps aria-live="assertive", so route changes are still announced.
 */
export function RouteAnnouncerRole() {
  useEffect(() => {
    const fix = () => {
      const node = document.querySelector("next-route-announcer")?.shadowRoot?.firstElementChild;
      if (node && node.getAttribute("role") === "alert") node.setAttribute("role", "status");
    };
    fix();
    const observer = new MutationObserver(fix);
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
