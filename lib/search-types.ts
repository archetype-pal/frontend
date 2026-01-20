export const SEARCH_RESULT_TYPES = ['manuscripts', 'images', 'scribes', 'hands', 'graphs'] as const
export type ResultType = (typeof SEARCH_RESULT_TYPES)[number]

const LABELS: Record<ResultType, string> = {
  manuscripts: 'Manuscripts',
  images: 'Images',
  scribes: 'Scribes',
  hands: 'Hands',
  graphs: 'Graphs',
}

export const resultTypeItems = SEARCH_RESULT_TYPES.map((value) => ({
  label: LABELS[value],
  value,
})) as { label: string; value: ResultType }[]
