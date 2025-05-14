export function normalizeFacets(fields: Record<string, any>) {
    const min = 720 //fields.date_min?.[0]?.text
    const max = 1440 //fields.date_max?.[0]?.text

    if (typeof min === 'number' && typeof max === 'number') {
      fields.text_date_slider = [
        {
          label: 'range',
          value: 'range',
          count: 0,
          text: '',
          range: [min, max],
          defaultValue: [min, max],
        },
      ]
    }
  
    delete fields.date_min
    delete fields.date_max
  
    return fields
  }
  