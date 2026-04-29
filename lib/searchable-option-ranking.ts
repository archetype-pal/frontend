export type SearchableOption = {
  value: string;
  label: string;
};

function getPrefixRank(label: string, queryLength: number) {
  const nextCharacter = label.charAt(queryLength);

  if (!nextCharacter) return 0;
  if (nextCharacter === ',') return 1;

  return 2;
}

function getSearchRank(label: string, query: string): number | null {
  if (label.startsWith(query)) {
    return getPrefixRank(label, query.length);
  }

  const lowerLabel = label.toLocaleLowerCase();
  const lowerQuery = query.toLocaleLowerCase();

  if (lowerLabel.startsWith(lowerQuery)) {
    return 10 + getPrefixRank(label, query.length);
  }

  const caseSensitiveIndex = label.indexOf(query);
  if (caseSensitiveIndex >= 0) {
    return 20 + Math.min(caseSensitiveIndex, 9);
  }

  const caseInsensitiveIndex = lowerLabel.indexOf(lowerQuery);
  if (caseInsensitiveIndex >= 0) {
    return 30 + Math.min(caseInsensitiveIndex, 9);
  }

  return null;
}

export function rankSearchableOptions(options: SearchableOption[], search: string) {
  const query = search.trim();

  if (!query) return options;

  return options
    .map((option, index) => {
      const rank = getSearchRank(option.label, query);
      return rank == null ? null : { option, rank, index };
    })
    .filter((item): item is { option: SearchableOption; rank: number; index: number } =>
      Boolean(item)
    )
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;

      const labelCompare = a.option.label.localeCompare(b.option.label, undefined, {
        sensitivity: 'variant',
      });

      return labelCompare || a.index - b.index;
    })
    .map((item) => item.option);
}
