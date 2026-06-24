// Pure utility — no React or JSX dependency so it can be unit tested in isolation.
export function formatTime(timestamp) {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return "Just now";
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
}
