import { describe, it, expect } from "vitest";
import {
  trimHistoryPreservingFavorites,
  toggleFavoriteWithCap,
  clampFavorites,
} from "./useSpeechHistory.js";

function makeEntries(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, text: `msg ${i}` }));
}

describe("trimHistoryPreservingFavorites", () => {
  it("keeps a favorited entry even after it would normally be evicted", () => {
    // Pin the oldest entry, then simulate 25 newer messages pushing it
    // past the old MAX_HISTORY cutoff.
    const pinned = { id: "pinned-1", text: "pinned message" };
    const newer = makeEntries(25); // 25 unique unpinned entries
    const entries = [...newer, pinned]; // pinned is now at position 25 (oldest)

    const favoriteIds = new Set(["pinned-1"]);
    const result = trimHistoryPreservingFavorites(entries, favoriteIds, 25);

    expect(result.find((m) => m.id === "pinned-1")).toBeDefined();
    // Regression guard: favorites must not shrink the unpinned budget.
    // All 25 unpinned entries must also survive alongside the favorite.
    const unpinnedKept = result.filter((m) => m.id !== "pinned-1");
    expect(unpinnedKept).toHaveLength(25);
  });

  it("does not let favorites reduce the unpinned budget (25 unpinned + 1 favorite)", () => {
    // This is the exact case the maxHistory - pinned.length bug breaks:
    // with 25 unpinned entries and 1 favorite, the old logic kept only
    // 24 unpinned entries instead of the full 25.
    const favorite = { id: "fav-1", text: "favorite message" };
    const unpinnedEntries = makeEntries(25);
    const entries = [favorite, ...unpinnedEntries];

    const favoriteIds = new Set(["fav-1"]);
    const result = trimHistoryPreservingFavorites(entries, favoriteIds, 25);

    expect(result).toHaveLength(26); // 25 unpinned + 1 favorite, none dropped
    expect(result.find((m) => m.id === "fav-1")).toBeDefined();
    const unpinnedIds = unpinnedEntries.map((m) => m.id);
    const keptUnpinnedIds = result.filter((m) => m.id !== "fav-1").map((m) => m.id);
    expect(keptUnpinnedIds).toEqual(unpinnedIds);
  });

  it("still caps non-favorited entries at maxHistory", () => {
    const entries = makeEntries(30); // 30 unpinned entries
    const favoriteIds = new Set(); // nothing pinned

    const result = trimHistoryPreservingFavorites(entries, favoriteIds, 25);

    expect(result).toHaveLength(25);
    // Most-recent-first ordering preserved — entries 0..24 kept, 25..29 dropped.
    expect(result.map((m) => m.id)).toEqual(makeEntries(25).map((m) => m.id));
  });

  it("preserves all favorited entries even if favorites exceed maxHistory", () => {
    const entries = makeEntries(30);
    const favoriteIds = new Set(entries.slice(0, 28).map((m) => m.id)); // 28 pinned

    const result = trimHistoryPreservingFavorites(entries, favoriteIds, 25);

    // All 28 favorited entries must survive, even though that's over the cap.
    const keptIds = new Set(result.map((m) => m.id));
    for (const id of favoriteIds) {
      expect(keptIds.has(id)).toBe(true);
    }
  });

  it("preserves original relative order of kept entries", () => {
    const entries = makeEntries(5);
    const favoriteIds = new Set(["id-3"]); // pin a middle entry

    const result = trimHistoryPreservingFavorites(entries, favoriteIds, 5);

    expect(result.map((m) => m.id)).toEqual(["id-0", "id-1", "id-2", "id-3", "id-4"]);
  });

  it("returns an empty array when given no entries", () => {
    const result = trimHistoryPreservingFavorites([], new Set(), 25);
    expect(result).toEqual([]);
  });
});

describe("toggleFavoriteWithCap", () => {
  it("pins a new id when under the cap", () => {
    const current = new Set(["a", "b"]);
    const { favorites, applied } = toggleFavoriteWithCap(current, "c", 5);

    expect(applied).toBe(true);
    expect(favorites.has("c")).toBe(true);
    expect(favorites.size).toBe(3);
  });

  it("unpins an already-pinned id regardless of the cap", () => {
    const current = new Set(["a", "b", "c"]);
    const { favorites, applied } = toggleFavoriteWithCap(current, "b", 3);

    expect(applied).toBe(true);
    expect(favorites.has("b")).toBe(false);
    expect(favorites.size).toBe(2);
  });

  it("refuses to pin a new id once the cap is reached", () => {
    const current = new Set(["a", "b", "c"]);
    const { favorites, applied } = toggleFavoriteWithCap(current, "d", 3);

    expect(applied).toBe(false);
    // Unchanged — the refused pin must not be applied.
    expect(favorites).toBe(current);
    expect(favorites.size).toBe(3);
  });

  it("still allows unpinning even when the Set is at or over the cap", () => {
    const current = new Set(["a", "b", "c"]);
    const { favorites, applied } = toggleFavoriteWithCap(current, "a", 3);

    expect(applied).toBe(true);
    expect(favorites.has("a")).toBe(false);
    expect(favorites.size).toBe(2);
  });

  it("does not mutate the original Set", () => {
    const current = new Set(["a"]);
    toggleFavoriteWithCap(current, "b", 5);

    expect(current.has("b")).toBe(false);
    expect(current.size).toBe(1);
  });

  it("correctly enforces the cap across rapid sequential calls when chained off the previous result", () => {
    // Simulates toggleFavorite's call pattern: each call reads the result
    // of the previous call (as favoritesRef.current would, updated
    // synchronously) rather than a stale snapshot from before any of the
    // calls happened. At a cap of 2, pinning "a" then "b" should both
    // succeed, and a third pin attempt on "c" should be refused.
    let current = new Set();

    const first = toggleFavoriteWithCap(current, "a", 2);
    current = first.favorites;
    expect(first.applied).toBe(true);

    const second = toggleFavoriteWithCap(current, "b", 2);
    current = second.favorites;
    expect(second.applied).toBe(true);

    const third = toggleFavoriteWithCap(current, "c", 2);
    expect(third.applied).toBe(false);
    expect(third.favorites.size).toBe(2);
    expect(third.favorites.has("c")).toBe(false);
    expect(third.favorites.has("a")).toBe(true);
    expect(third.favorites.has("b")).toBe(true);
  });
});

describe("clampFavorites", () => {
  it("leaves a set under the cap unchanged", () => {
    const ids = ["a", "b", "c"];
    const result = clampFavorites(ids, 50);

    expect(result).toEqual(new Set(["a", "b", "c"]));
  });

  it("clamps a legacy/oversized set down to the cap on load", () => {
    // Simulates loading localStorage data written before MAX_FAVORITES
    // existed, or oversized due to the earlier orphaned-id eviction bug.
    const ids = Array.from({ length: 80 }, (_, i) => `id-${i}`);

    const result = clampFavorites(ids, 50);

    expect(result.size).toBe(50);
  });

  it("keeps the most recently pinned ids (trailing entries) when clamping", () => {
    // Ids are persisted in Set insertion order, oldest-pinned-first, so the
    // most recently pinned ids are at the end of the array.
    const ids = Array.from({ length: 80 }, (_, i) => `id-${i}`);

    const result = clampFavorites(ids, 50);

    expect(result.has("id-79")).toBe(true); // most recently pinned, kept
    expect(result.has("id-0")).toBe(false); // oldest pin, dropped
    expect(result.has("id-30")).toBe(true); // boundary: 80 - 50 = 30, first kept
    expect(result.has("id-29")).toBe(false); // boundary: just before cutoff, dropped
  });

  it("returns an empty Set for empty input", () => {
    const result = clampFavorites([], 50);
    expect(result.size).toBe(0);
  });

  it("returns an empty Set when maxFavorites is 0", () => {
    const result = clampFavorites(["a", "b"], 0);
    expect(result.size).toBe(0);
  });

  it("a legacy set already under the cap still allows new pins after loading", () => {
    // Clamping should be a no-op for sets that were never oversized, so
    // pinning continues to work normally for typical users.
    const legacyIds = Array.from({ length: 10 }, (_, i) => `id-${i}`);
    const loaded = clampFavorites(legacyIds, 50);

    const { applied } = toggleFavoriteWithCap(loaded, "brand-new-id", 50);
    expect(applied).toBe(true);
  });

  it("an oversized legacy set is clamped to exactly the cap, not blocked entirely", () => {
    // The bug being fixed isn't "pins never work again" — it's that an
    // unclamped oversized set would stay oversized forever. After clamping,
    // the set sits at exactly maxFavorites; a new pin is correctly refused
    // until the user frees up a slot by unpinning, same as any user who
    // legitimately reaches the cap through normal use.
    const legacyIds = Array.from({ length: 80 }, (_, i) => `id-${i}`);
    const loaded = clampFavorites(legacyIds, 50);

    expect(loaded.size).toBe(50);

    const refused = toggleFavoriteWithCap(loaded, "brand-new-id", 50);
    expect(refused.applied).toBe(false);

    // Unpinning one frees a slot, restoring normal pin behavior.
    const afterUnpin = toggleFavoriteWithCap(loaded, "id-79", 50);
    expect(afterUnpin.applied).toBe(true);
    expect(afterUnpin.favorites.size).toBe(49);

    const pinAfterFreeingSlot = toggleFavoriteWithCap(afterUnpin.favorites, "brand-new-id", 50);
    expect(pinAfterFreeingSlot.applied).toBe(true);
  });
});
