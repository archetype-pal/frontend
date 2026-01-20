export const FILTER_RENDER_MAP: Record<
  string,
  Record<
    string,
    'checkbox' | 'toggle' | 'range' | 'number-select'
  >
> = {
  manuscripts: {
    image_availability: 'toggle',
    text_date: 'range',
    format: 'checkbox',
    type: 'checkbox',
    repository_city: 'checkbox',
    repository_name: 'checkbox',
  },
  images: {
    text_date: 'range',
    features: 'checkbox',
    components: 'checkbox',
    component_features: 'checkbox',
    repository_city: 'checkbox',
    locus: 'checkbox',
    type: 'checkbox',
    repository_name: 'checkbox',
    issuer_type: 'checkbox',
    issuer: 'checkbox',
    named_beneficiary: 'checkbox',
  },
  scribes: {
    text_date: 'range',
    scriptorium: 'checkbox',
  },
  hands: {
    text_date: 'range',
    repository_name: 'checkbox',
    repository_city: 'checkbox',
    place: 'checkbox',
  },
  graphs: {
    text_date: 'range',
    features: 'checkbox',
    components: 'checkbox',
    character: 'checkbox',
    component_features: 'checkbox',
    allograph: 'checkbox',
    character_type: 'checkbox',
    repository_city: 'checkbox',
    positions: 'checkbox',
    repository_name: 'checkbox',
    place: 'checkbox',
  },
}
