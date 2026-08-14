// Floating button fixed to the bottom-right corner that scrolls to the page bottom.
import React from "react";
import { ChevronDown } from "lucide-react";
export function ScrollToBottomButton({ activeTab, threshold = 200 }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let ticking = false;

    function updateVisibility() {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.body.scrollHeight;
      setVisible(scrolled < total - threshold);
      ticking = false;
    }

    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(updateVisibility);
        ticking = true;
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    updateVisibility();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [activeTab, threshold]);

  if (!visible) return null;

  function handleClick() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Scroll to bottom"
      title="Scroll to bottom"
      className="fixed bottom-6 right-6 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 bg-white text-ink shadow-md transition hover:border-moss hover:text-moss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss dark:border-border dark:bg-black dark:text-neutral-200 dark:hover:border-glow dark:hover:text-glow dark:focus-visible:ring-glow"
    >
      <ChevronDown size={20} aria-hidden="true" />
    </button>
  );
}

export default React.memo(ScrollToBottomButton);
