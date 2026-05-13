import type { HandType } from '@/types/hands';

const LAST_ORDER = Number.MAX_SAFE_INTEGER;
const LOWEST_PRIORITY = Number.MIN_SAFE_INTEGER;

function firstFiniteNumber(values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

export function getHandDisplayOrder(hand: HandType): number {
  return (
    firstFiniteNumber([hand.num, hand.order, hand.ordering, hand.sort_order, hand.display_order]) ??
    LAST_ORDER
  );
}

function getHandPriority(hand: HandType): number {
  return firstFiniteNumber([hand.priority]) ?? LOWEST_PRIORITY;
}

function isDefaultHand(hand: HandType): boolean {
  return Boolean(hand.is_default || hand.default || hand.default_hand);
}

export function compareHandsByPriority(a: HandType, b: HandType): number {
  const defaultDelta = Number(isDefaultHand(b)) - Number(isDefaultHand(a));
  if (defaultDelta !== 0) return defaultDelta;

  const priorityDelta = getHandPriority(b) - getHandPriority(a);
  if (priorityDelta !== 0) return priorityDelta;

  const orderDelta = getHandDisplayOrder(a) - getHandDisplayOrder(b);
  if (orderDelta !== 0) return orderDelta;

  const nameDelta = a.name.localeCompare(b.name, undefined, { numeric: true });
  if (nameDelta !== 0) return nameDelta;

  return a.id - b.id;
}

export function sortHandsByPriority(hands: HandType[]): HandType[] {
  return [...hands].sort(compareHandsByPriority);
}

export function getDefaultHand(hands: HandType[]): HandType | undefined {
  return sortHandsByPriority(hands)[0];
}
