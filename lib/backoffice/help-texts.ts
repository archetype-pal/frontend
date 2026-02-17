/**
 * Central dictionary of field-level help texts for the backoffice.
 *
 * Keys use dot-notation: `<domain>.<field>` so they can be looked up
 * from any form.  Each entry has a short description and optionally
 * an example value or a note about expected format.
 *
 * To add a new entry, just add a key here — the HelpTooltip component
 * will render it automatically.
 */

export interface HelpEntry {
  /** One-sentence description of the field. */
  description: string
  /** Example value or format hint (optional). */
  example?: string
}

export const helpTexts: Record<string, HelpEntry> = {
  // -- Manuscripts / Historical Items --
  'manuscript.type': {
    description:
      'The type of historical item, such as Charter, Manuscript, or Document.',
  },
  'manuscript.date': {
    description:
      'The approximate date or date range for this item. Select from the reference date list.',
    example: 's.xi (mid)',
  },
  'manuscript.format': {
    description:
      'The physical format of the item, e.g. Codex, Roll, or Single sheet.',
  },
  'manuscript.language': {
    description: 'The primary language of the manuscript text.',
    example: 'Latin, Old English',
  },
  'manuscript.hair_type': {
    description:
      'The arrangement of hair and flesh sides in the quire. Leave blank if unknown.',
    example: 'HFHF',
  },

  // -- Current Location --
  'currentLocation.repository': {
    description:
      'The archive or library where this charter is held today.',
    example: 'National Records of Scotland, Durham Cathedral Archives',
  },
  'currentLocation.shelfmark': {
    description:
      'The catalogue reference used by the repository to identify this document on their shelves.',
    example: 'GD55/1, 3.1.Pont.7',
  },

  // -- Item Parts --
  'itemPart.locus': {
    description:
      'The folio or page range within the physical volume for this part.',
    example: 'f.1r, ff.2-173, pp.1-24',
  },
  'itemPart.currentItem': {
    description:
      'The physical volume (repository + shelfmark) where this manuscript currently resides.',
  },
  'itemPart.customLabel': {
    description:
      'An optional label that overrides the auto-generated display name. Use when the standard "Repository Shelfmark Locus" format is insufficient.',
    example: 'Charter of King William (original)',
  },

  // -- Catalogue Numbers --
  'catalogueNumber.source': {
    description:
      'The bibliographic source that assigned this catalogue number (e.g. Ker, Gneuss).',
  },
  'catalogueNumber.number': {
    description: 'The identifier assigned by the catalogue source.',
    example: '001, 345a',
  },
  'catalogueNumber.url': {
    description:
      'An optional URL linking to the catalogue entry online.',
  },

  // -- Images --
  'image.locus': {
    description:
      'The specific folio or page this image depicts.',
    example: 'f.2r, p.15',
  },

  // -- Image Texts --
  'imageText.type': {
    description:
      'Whether this text is a transcription (original script) or translation (modern language rendering).',
  },
  'imageText.status': {
    description:
      'The editorial status of this text: Draft, Review, Live, or Reviewed.',
  },

  // -- Symbols / Palaeography --
  'character.type': {
    description:
      'The category of this character, e.g. Letter, Punctuation, or Abbreviation.',
  },
  'allograph.name': {
    description:
      'A human-readable name for this allograph, typically describing its form.',
    example: 'b (minuscule), B (majuscule)',
  },
  'feature.set_by_default': {
    description:
      'When checked, this feature is pre-selected for new annotations using this allograph + component combination. Useful for the most common variant.',
  },

  // -- Scribes --
  'scribe.scriptorium': {
    description:
      'The writing centre or monastery associated with this scribe, if known.',
  },
  'scribe.period': {
    description:
      'The date range in which this scribe was active.',
  },

  // -- Hands --
  'hand.script': {
    description:
      'The script type used by this hand, e.g. Caroline Minuscule, Insular.',
  },
  'hand.itemPart': {
    description:
      'The specific part of a manuscript this hand is associated with. Changing this will update the available images.',
  },

  // -- Publications --
  'publication.status': {
    description:
      'Draft publications are only visible to staff. Published items appear on the public site.',
  },
  'publication.keywords': {
    description:
      'Comma-separated tags used for filtering and related post suggestions.',
    example: 'palaeography, charter, twelfth-century',
  },
  'publication.published_at': {
    description:
      'The date this publication goes live. Can be set in the future for scheduled publishing.',
  },

  // -- Common --
  'date.minWeight': {
    description:
      'The earliest year in the date range, used for sorting and filtering.',
    example: '1100',
  },
  'date.maxWeight': {
    description:
      'The latest year in the date range.',
    example: '1250',
  },
}
