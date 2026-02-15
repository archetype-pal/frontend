/**
 * Centralised React Query key factory for the admin.
 *
 * Usage:
 *   queryKey: adminKeys.manuscripts.list({ offset: 0 })
 *   queryKey: adminKeys.manuscripts.detail(42)
 *
 * Invalidation:
 *   queryClient.invalidateQueries({ queryKey: adminKeys.manuscripts.all() })
 */

export const adminKeys = {
  all: ['admin'] as const,

  // ── Symbols ────────────────────────────────────────────────
  characters: {
    all: () => [...adminKeys.all, 'characters'] as const,
    list: () => [...adminKeys.characters.all(), 'list'] as const,
    detail: (id: number) =>
      [...adminKeys.characters.all(), 'detail', id] as const,
  },
  components: {
    all: () => [...adminKeys.all, 'components'] as const,
  },
  features: {
    all: () => [...adminKeys.all, 'features'] as const,
  },
  positions: {
    all: () => [...adminKeys.all, 'positions'] as const,
  },

  // ── Manuscripts ────────────────────────────────────────────
  manuscripts: {
    all: () => [...adminKeys.all, 'manuscripts'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...adminKeys.manuscripts.all(), 'list', filters] as const,
    detail: (id: number) =>
      [...adminKeys.manuscripts.all(), 'detail', id] as const,
  },
  repositories: {
    all: () => [...adminKeys.all, 'repositories'] as const,
  },
  sources: {
    all: () => [...adminKeys.all, 'sources'] as const,
  },
  formats: {
    all: () => [...adminKeys.all, 'formats'] as const,
  },
  dates: {
    all: () => [...adminKeys.all, 'dates'] as const,
  },

  // ── Publications ───────────────────────────────────────────
  publications: {
    all: () => [...adminKeys.all, 'publications'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...adminKeys.publications.all(), 'list', filters] as const,
    detail: (slug: string) =>
      [...adminKeys.publications.all(), 'detail', slug] as const,
  },
  events: {
    all: () => [...adminKeys.all, 'events'] as const,
    detail: (slug: string) =>
      [...adminKeys.events.all(), 'detail', slug] as const,
  },
  comments: {
    all: () => [...adminKeys.all, 'comments'] as const,
    list: (filter?: string) =>
      [...adminKeys.comments.all(), 'list', filter] as const,
  },
  carousel: {
    all: () => [...adminKeys.all, 'carousel'] as const,
  },

  // ── Scribes ────────────────────────────────────────────────
  scribes: {
    all: () => [...adminKeys.all, 'scribes'] as const,
    list: () => [...adminKeys.scribes.all(), 'list'] as const,
    detail: (id: number) =>
      [...adminKeys.scribes.all(), 'detail', id] as const,
  },
  hands: {
    all: () => [...adminKeys.all, 'hands'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...adminKeys.hands.all(), 'list', filters] as const,
    detail: (id: number) =>
      [...adminKeys.hands.all(), 'detail', id] as const,
  },
  scripts: {
    all: () => [...adminKeys.all, 'scripts'] as const,
  },

  // ── Stats (dashboard) ─────────────────────────────────────
  stats: {
    all: () => [...adminKeys.all, 'stats'] as const,
  },

  // ── Search Engine ───────────────────────────────────────────
  searchEngine: {
    all: () => [...adminKeys.all, 'searchEngine'] as const,
    stats: () => [...adminKeys.all, 'searchEngine', 'stats'] as const,
    task: (taskId: string) =>
      [...adminKeys.all, 'searchEngine', 'task', taskId] as const,
  },
} as const
