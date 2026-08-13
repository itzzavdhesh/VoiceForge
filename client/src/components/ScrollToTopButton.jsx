// Floating button fixed to the bottom-right corner (above ScrollToBottomButton) that scrolls to the page top.
import React from "react";
import { ChevronUp } from "lucide-react";

export default function ScrollToTopButton({ activeTab }) {
  const [visible, setVisible] = React.useState(false);
  const [atBottom, setAtBottom] = React.useState(false);


  React.useEffect(() => {
    function handleScroll() {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.body.scrollHeight;
      setVisible(window.scrollY > 40);
      setAtBottom(scrolled >= total - 40);
  }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [activeTab]);

  if (!visible) return null;

  function handleClick() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Scroll to top"
      title="Scroll to top"
      className={`fixed ${atBottom ? "bottom-6" : "bottom-20"} right-6 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 bg-white text-ink shadow-md transition-all hover:border-moss hover:text-moss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss dark:border-border dark:bg-black dark:text-neutral-200 dark:hover:border-glow dark:hover:text-glow dark:focus-visible:ring-glow`}
    >
      <ChevronUp size={20} aria-hidden="true" />
    </button>
  );
}
