import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop ensures every client-side page navigation starts at the top
 * of the page (y = 0), resolving the issue where navigating from the bottom
 * of one page leaves the next page scrolled to the bottom.
 *
 * If a hash fragment is present in the URL (e.g. /#faq), it scrolls to that element.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 10);
        return () => clearTimeout(timer);
      }
    }

    // Immediately reset window scroll position to the top
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, hash]);

  return null;
}
