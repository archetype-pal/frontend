import type { GraphProposalItem } from '@/types/backoffice';

/**
 * Why a proposal cannot be accepted as it stands, or null when it can.
 *
 * The backend refuses the same cases with a 409 (Graph's check constraint
 * requires both for an image annotation); saying so up front spares the
 * reviewer a button that can only fail.
 */
export function acceptBlocker(
  proposal: Pick<GraphProposalItem, 'annotation_type' | 'allograph' | 'hand'>
): 'noHand' | 'noAllograph' | null {
  if (proposal.annotation_type !== 'image') return null;
  if (proposal.allograph == null) return 'noAllograph';
  if (proposal.hand == null) return 'noHand';
  return null;
}
