export function normalizeFacets(fields: Record<string, any>) {
  let globalMin: number | undefined = undefined
  let globalMax: number | undefined = undefined

  if (Array.isArray(fields.date_min)) {
    const allMins = fields.date_min
      .map((b: any) => b.text)
      .filter((x: any): x is number => typeof x === 'number')

    if (allMins.length > 0) {
      globalMin = allMins.reduce((acc, cur) => Math.min(acc, cur), allMins[0])
    }
  }

  if (Array.isArray(fields.date_max)) {
    const allMaxes = fields.date_max
      .map((b: any) => b.text)
      .filter((x: any): x is number => typeof x === 'number')

    if (allMaxes.length > 0) {
      globalMax = allMaxes.reduce((acc, cur) => Math.max(acc, cur), allMaxes[0])
    }
  }

  if (typeof globalMin === 'number' && typeof globalMax === 'number') {
    fields.text_date_slider = [
      {
        label: 'range',
        value: 'range',
        count: 0,
        text: '',
        range: [globalMin, globalMax],
        defaultValue: [globalMin, globalMax],
        options: {
          date_min: fields.date_min || [],
          date_max: fields.date_max || [],
        },
      },
    ]
  }

  delete fields.date_min
  delete fields.date_max

  return fields
}
