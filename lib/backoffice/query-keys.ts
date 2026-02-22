/**
 * Centralised React Query key factory for the backoffice.
 *
 * Usage:
 *   queryKey: backofficeKeys.manuscripts.list({ offset: 0 })
 *   queryKey: backofficeKeys.manuscripts.detail(42)
 *
 * Invalidation:
 *   queryClient.invalidateQueries({ queryKey: backofficeKeys.manuscripts.all() })
 */

export const backofficeKeys = {
  all: ['backoffice'] as const,

  // ── Symbols ────────────────────────────────────────────────
  characters: {
    all: () => [...backofficeKeys.all, 'characters'] as const,
    list: () => [...backofficeKeys.characters.all(), 'list'] as const,
    detail: (id: number) => [...backofficeKeys.characters.all(), 'detail', id] as const,
  },
  components: {
    all: () => [...backofficeKeys.all, 'components'] as const,
  },
  features: {
    all: () => [...backofficeKeys.all, 'features'] as const,
  },
  positions: {
    all: () => [...backofficeKeys.all, 'positions'] as const,
  },

  // ── Manuscripts ────────────────────────────────────────────
  manuscripts: {
    all: () => [...backofficeKeys.all, 'manuscripts'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...backofficeKeys.manuscripts.all(), 'list', filters] as const,
    detail: (id: number) => [...backofficeKeys.manuscripts.all(), 'detail', id] as const,
  },
  currentItems: {
    all: () => [...backofficeKeys.all, 'currentItems'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...backofficeKeys.all, 'currentItems', 'list', filters] as const,
  },
  repositories: {
    all: () => [...backofficeKeys.all, 'repositories'] as const,
  },
  sources: {
    all: () => [...backofficeKeys.all, 'sources'] as const,
  },
  formats: {
    all: () => [...backofficeKeys.all, 'formats'] as const,
  },
  dates: {
    all: () => [...backofficeKeys.all, 'dates'] as const,
  },

  // ── Publications ───────────────────────────────────────────
  publications: {
    all: () => [...backofficeKeys.all, 'publications'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...backofficeKeys.publications.all(), 'list', filters] as const,
    detail: (slug: string) => [...backofficeKeys.publications.all(), 'detail', slug] as const,
  },
  events: {
    all: () => [...backofficeKeys.all, 'events'] as const,
    detail: (slug: string) => [...backofficeKeys.events.all(), 'detail', slug] as const,
  },
  comments: {
    all: () => [...backofficeKeys.all, 'comments'] as const,
    list: (filter?: string) => [...backofficeKeys.comments.all(), 'list', filter] as const,
  },
  carousel: {
    all: () => [...backofficeKeys.all, 'carousel'] as const,
  },

  // ── Scribes ────────────────────────────────────────────────
  scribes: {
    all: () => [...backofficeKeys.all, 'scribes'] as const,
    list: () => [...backofficeKeys.scribes.all(), 'list'] as const,
    detail: (id: number) => [...backofficeKeys.scribes.all(), 'detail', id] as const,
  },
  hands: {
    all: () => [...backofficeKeys.all, 'hands'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...backofficeKeys.hands.all(), 'list', filters] as const,
    detail: (id: number) => [...backofficeKeys.hands.all(), 'detail', id] as const,
  },
  scripts: {
    all: () => [...backofficeKeys.all, 'scripts'] as const,
  },

  // ── Annotations ──────────────────────────────────────────
  graphs: {
    all: () => [...backofficeKeys.all, 'graphs'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...backofficeKeys.all, 'graphs', 'list', filters] as const,
    detail: (id: number) => [...backofficeKeys.all, 'graphs', 'detail', id] as const,
  },

  // ── Stats (dashboard) ─────────────────────────────────────
  stats: {
    all: () => [...backofficeKeys.all, 'stats'] as const,
  },

  // ── Users ────────────────────────────────────────────────────
  users: {
    all: () => [...backofficeKeys.all, 'users'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...backofficeKeys.users.all(), 'list', filters] as const,
    detail: (id: number) => [...backofficeKeys.users.all(), 'detail', id] as const,
  },

  // ── Search Engine ───────────────────────────────────────────
  searchEngine: {
    all: () => [...backofficeKeys.all, 'searchEngine'] as const,
    stats: () => [...backofficeKeys.all, 'searchEngine', 'stats'] as const,
    task: (taskId: string) => [...backofficeKeys.all, 'searchEngine', 'task', taskId] as const,
  },
} as const;
