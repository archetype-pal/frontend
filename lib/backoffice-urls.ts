export type BackofficeKind = 'manuscript' | 'item-part' | 'scribe' | 'hand' | 'publication';

export function backofficeUrlFor(kind: BackofficeKind, id: string | number): string {
  switch (kind) {
    // The manuscript workspace is keyed by HistoricalItem id.
    case 'manuscript':
      return `/backoffice/manuscripts/${id}`;
    // The public site only knows an ItemPart id, which is a different table: the
    // resolver route looks up the part's HistoricalItem and redirects there.
    // archetype-pal/frontend#142
    case 'item-part':
      return `/backoffice/item-parts/${id}`;
    case 'scribe':
      return `/backoffice/scribes/${id}`;
    case 'hand':
      return `/backoffice/hands/${id}`;
    case 'publication':
      return `/backoffice/publications/${id}`;
  }
}
