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
  description: string;
  /** Example value or format hint (optional). */
  example?: string;
}

export const helpTexts: Record<string, HelpEntry> = {
  // -- Manuscripts / Historical Items --
  'manuscript.type': {
    description: 'The type of historical item, such as Charter, Manuscript, or Document.',
  },
  'manuscript.date': {
    description:
      'The approximate date or date range for this item. Select from the reference date list.',
    example: 's.xi (mid)',
  },
  'manuscript.probableTextDate': {
    description:
      'An optional human-readable probable date for records where the firm date needs qualification.',
    example: 'Probably early 13th century',
  },
  'manuscript.datingNotes': {
    description:
      'Optional editorial notes explaining dating evidence, uncertainty, or manuscript-specific context.',
  },
  'manuscript.format': {
    description: 'The physical format of the item, e.g. Codex, Roll, or Single sheet.',
  },
  'manuscript.language': {
    description: 'The primary language of the manuscript text.',
    example: 'Latin, Old English',
  },
  'manuscript.hair_type': {
    description: 'The arrangement of hair and flesh sides in the quire. Leave blank if unknown.',
    example: 'HFHF',
  },

  // -- Current Location --
  'currentLocation.repository': {
    description: 'The archive or library where this charter is held today.',
    example: 'National Records of Scotland, Durham Cathedral Archives',
  },
  'currentLocation.shelfmark': {
    description:
      'The catalogue reference used by the repository to identify this document on their shelves.',
    example: 'GD55/1, 3.1.Pont.7',
  },

  // -- Item Parts --
  'itemPart.locus': {
    description: 'The folio or page range within the item for this part.',
    example: 'f.1r, ff.2-173, pp.1-24',
  },
  'itemPart.currentItem': {
    description: 'The item (repository + shelfmark) where this manuscript currently resides.',
  },
  'itemPart.customLabel': {
    description:
      'An optional label that overrides the auto-generated display name. Use when the standard "Repository Shelfmark Locus" format is insufficient.',
    example: 'Charter of King William (original)',
  },

  // -- Images --

  // -- Symbols / Palaeography --

  // -- Hands --

  // -- Common --
};
