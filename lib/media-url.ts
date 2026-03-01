type ImageRouteInput = {
  item_part?: number | string | null;
  item_part_id?: number | string | null;
  item_image?: number | string | null;
  id?: number | string | null;
};

export function toNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getImageDetailUrl(input: ImageRouteInput): string {
  const imageId = toNumericId(input.item_image) ?? toNumericId(input.id);
  const manuscriptId = toNumericId(input.item_part) ?? toNumericId(input.item_part_id) ?? imageId;
  if (!imageId || !manuscriptId) return '#';
  return `/manuscripts/${manuscriptId}/images/${imageId}`;
}
