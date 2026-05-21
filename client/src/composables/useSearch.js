// Global search query — drives the top-bar search input AND the per-view
// computed filters. Singleton ref at module scope (same pattern as
// useFilters.js and useTheme.js) so the App.vue header and any view share
// the same value with no plumbing.
//
// Scope today: the top-bar input is wired in App.vue, and Inventory.vue
// consumes it. Other views can opt in by replacing their local searchQuery
// ref with `const { searchQuery } = useSearch()`.

import { ref } from "vue";

const searchQuery = ref("");

export function useSearch() {
  const clearSearch = () => {
    searchQuery.value = "";
  };
  return { searchQuery, clearSearch };
}
