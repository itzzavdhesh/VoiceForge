import { useEffect } from "react";

/**
 * Custom hook to prevent accidental data loss on tab close or refresh when unsaved state exists.
 * @param {boolean} condition - Whether there are unsaved changes.
 */
export function useUnsavedChanges(condition) {
  useEffect(() => {
    if (!condition) return;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      // Chrome/Safari/Firefox require setting returnValue for dialog display
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [condition]);
}

export default useUnsavedChanges;
