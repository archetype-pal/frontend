export type BackofficeKind = 'manuscript' | 'item-part' | 'scribe' | 'hand' | 'publication';

export function backofficeUrlFor(kind: BackofficeKind, id: string | number): string {
  switch (kind) {
    case 'manuscript':
    case 'item-part':
      return `/backoffice/manuscripts/${id}`;
    case 'scribe':
      return `/backoffice/scribes/${id}`;
    case 'hand':
      return `/backoffice/hands/${id}`;
    case 'publication':
      return `/backoffice/publications/${id}`;
  }
}
