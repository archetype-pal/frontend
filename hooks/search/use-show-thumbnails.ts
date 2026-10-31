import { useStoredPreference } from '@/hooks/use-stored-preference';

const STORAGE_KEY = 'search-show-thumbnails';

// Only an explicit 'false' turns thumbnails off, so an absent or corrupted
// value falls back to the default rather than stranding the user in
// text-only mode.
const parse = (raw: string | null) => raw !== 'false';
const serialize = (value: boolean) => (value ? 'true' : 'false');

/** Thumbnail visibility in search results (images vs text-only), remembered across sessions. */
export function useShowThumbnails() {
  return useStoredPreference(STORAGE_KEY, parse, serialize, true);
}
