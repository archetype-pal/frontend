import type { Allograph } from '@/types/allographs';

export function formatAllographLabel(allograph: Pick<Allograph, 'name' | 'character_name'>) {
  const characterName = allograph.character_name?.trim();
  const allographName = allograph.name.trim();

  if (!characterName) return allographName;
  if (!allographName || characterName === allographName) return characterName;

  return `${characterName}, ${allographName}`;
}
