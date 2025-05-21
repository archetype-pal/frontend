// export function normalizeFacets(fields: Record<string, any>) {
//   const min = fields.date_min?.[0]?.text
//   const max = fields.date_max?.[0]?.text

//   if (typeof min === 'number' && typeof max === 'number') {
//     fields.text_date_slider = [
//       {
//         label: 'range',
//         value: 'range',
//         count: 0,
//         text: '',
//         range: [min, max],
//         defaultValue: [min, max],
//       },
//     ]
//   }

//   delete fields.date_min
//   delete fields.date_max

//   return fields
// }

export function normalizeFacets(fields: Record<string, any>) {
  const min = fields.date_min?.[0]?.text
  const max = fields.date_max?.[0]?.text

  if (typeof min === 'number' && typeof max === 'number') {
    fields.text_date_slider = [
      {
        label: 'range',
        value: 'range',
        count: 0,
        text: '',
        range: [min, max],
        defaultValue: [min, max],
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
