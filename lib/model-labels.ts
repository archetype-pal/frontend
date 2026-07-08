export type ModelLabelKey =
  | 'historicalItem'
  | 'catalogueNumber'
  | 'position'
  | 'date'
  | 'appManuscripts'
  | 'fieldHairType'
  | 'fieldShelfmark'
  | 'fieldDateMinWeight'
  | 'fieldDateMaxWeight'
  // Search result-category tab labels. The "Manuscripts" category reuses
  // `appManuscripts` (it is the site-wide manuscripts label); the rest get
  // their own keys so each search tab can be renamed independently.
  | 'searchCategoryImages'
  | 'searchCategoryScribes'
  | 'searchCategoryHands'
  | 'searchCategoryGraphs'
  | 'searchCategoryTexts'
  | 'searchCategoryClauses'
  | 'searchCategoryPeople'
  | 'searchCategoryPlaces'
  // General site branding, shown in the header and footer.
  | 'siteTitle'
  | 'siteTagline'
  | 'footerFunded'
  | 'footerCopyright'
  // Full HTML bodies for the static "About" pages, edited as rich text.
  | 'pageHistoricalContext'
  | 'pageAboutModelsOfAuthority'
  | 'pageAccessibility';

export type ModelLabelLocale = 'en' | 'fr';

export type LocalizedLabel = {
  en: string;
  fr: string;
};

export type ModelLabelsConfig = {
  labels: Record<ModelLabelKey, LocalizedLabel>;
};

// Default page bodies, seeded from the copy that used to be hardcoded in the
// corresponding app/(site)/about/*/page.tsx files before they became editable.
const DEFAULT_HISTORICAL_CONTEXT_HTML = `
<p class="drop-cap">Government as we recognise it today, a form of public authority functioning continuously and impersonally, first emerged in Western Europe in the twelfth century. One of the cardinal points on which our understanding of this development turns is the evidence of charters: and it is from the twelfth century onwards that charters begin to survive in large numbers. This project focuses on analysing the most distinctive features of charters: the appearance of their handwriting, and the formulaic aspects of their prose as a way to reach a new perspective on the origins of government in its modern western European form.</p>
<h2>Royal charters as a new 'model of authority'</h2>
<p>Charters are generally recognised as artefacts of authority: as such, the way in which they were composed and written out must be significant for understanding the authority they represent. During the first half of the twelfth century English royal scribes wrote in an increasingly rapid manner, introducing simplified forms and cursive elements into their handwriting. During the second half of the century and into the thirteenth, they sometimes combined these more rapid traces with various stylistic elements for visual effect, a process that ultimately culminated in the emergence of a new cursive script. Scottish royal scribes were not far behind in imitating their English counterparts. Non-royal scribes in Scotland as well as England sometimes also followed suit.</p>
<p>The conventional view is that the increasing use of more rapidly-traced handwriting and the development of cursive script can be put down to pressure of business. But was this the only factor? In Scotland there are examples of hurried writing in contexts where there is no evidence for pressure of business. An alternative explanation would be that there was a conscious attempt to mimic the appearance of royal documents, perhaps perceiving them as models of authority: Scottish royal scribes imitated English practice, and then other scribes in Scotland imitated the handwriting of Scottish or English royal documents. The same pattern of influence can be found not just in the handwriting of Scottish charters, but in their prose too. By the early thirteenth century in Britain, a more regularised form of prose was being used, with stock phrases and standardised formulae accompanying the newly emergent cursive script. Yet this emergence of regularised prose and cursive script has not been studied from the perspective of charters as artefacts of authority modelled increasingly on royal exemplars. All this makes the handwriting and prose of charters a significant untapped resource for tracking the increasing profile of kingship as a source of social authority in relation to the growth of government, particularly in relation to property and privileges.</p>
<h2>Royal charters and other 'models of authority'</h2>
<p>In this project we plan to track how scribes imitated one another in the incremental process of stylistic change. Royal charters were not the only model available to them: there were also two more formal varieties of handwriting, one little different from the formal bookhand, modified only by the inclusion of a few variant letter-forms, and found most commonly in twelfth-century monastic charters, the other the more stylistically elaborate handwriting of the papal chancery, sometimes mediated through episcopal charters. Both were influential on Scottish royal charters. We ask to what extent kingship itself evolved as a model of authority for the way in which non-royal scribes expressed their own property and privileges. This project, by identifying the influence on non-royal charters of practices observed in royal charters, will show how far and when the charter styles of a developing royal bureaucracy permeated the written conceptions of authority of other institutions and individuals in relation to property and privileges. It will also show the effect of other forms of authority – papal and monastic – on the styles of written kingship itself.</p>
<h2>Research question:</h2>
<p>This new context for examining the emergence of government is encapsulated in the project's core question: how does kingship as a model of authority in the writing of Scottish charters relate to the emergence of government?</p>
<p>The answers to this question would be revealed by mapping those features that have their origin in royal documents against aspects of handwriting and prose that represent other models of authority in charter-writing during this period. In this way one can be sensitive to the evidence for whether a particular scribe was working for the donor, the beneficiary, or the king. This comparison should then show us at which points in time and in what situations royal authority was taken as a model of authority by those who produced charters.</p>
<p>The results will form a new framework of questions for thinking about the emergence of government. To what extent did a desire for order initially look as much towards ecclesiastical authority as towards kingship? For how long and in what situations did a distinctive modified bookhand and innovative prose – with neither having clear reference to royal or papal practice – most strongly persist? In what types of document was the standardisation of the prose and the emergence of cursive elements in the handwriting most apparent, and how did this relate to procedural changes in the adjudication of property rights? Which came first: greater royal power and bureaucratisation, or a growing espousal of royal authority by those with property and privileges? Were royal models influential in particular situations?</p>
<h2>Why Scotland?</h2>
<p>Scotland is best placed to be the case-study for four main reasons. First, a collection of 691 digital images of charters has been assembled from a range of medieval archives – an unparalleled resource for a kingdom in this period. Second, the essential task of dating the text of each charter has recently been completed in the 'People of Medieval Scotland' database (launched on 5 September 2012); see www.poms.ac.uk. Third, Scotland's institutional development in this period has recently been reappraised in Alice Taylor's monograph The Shape of the State in Medieval Scotland, 1124–1290 (due to be published by OUP later this year or early in 2016). Finally, the corpus of charters is small enough to be manageable but large enough for the results of the analysis of their handwriting and prose to be significant, embracing an entire kingdom.</p>
`.trim();

// About-models-of-authority currently mirrors the historical-context copy
// verbatim in the pre-existing hardcoded page — preserved as-is here; the
// site owner can now edit them independently via the backoffice.
const DEFAULT_ABOUT_PROJECT_HTML = DEFAULT_HISTORICAL_CONTEXT_HTML;

const DEFAULT_ACCESSIBILITY_HTML = `
<h2>Our Commitment</h2>
<p>The Models of Authority project is committed to making this website accessible to as many people as possible. We aim to meet the requirements of the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA where practicable.</p>
<h2>Standards and Technologies</h2>
<p>This site is built with modern web technologies (HTML5, CSS, JavaScript) and is designed to work with current browsers and assistive technologies. We use semantic markup, descriptive link text, and appropriate heading structure to support navigation and screen readers.</p>
<h2>Known Limitations</h2>
<p>Some areas of the site (for example, the manuscript image viewer and annotation tools) use third-party components that may have accessibility limitations. We continue to review and improve these where possible. PDF and image content from external repositories may not be fully optimised for accessibility.</p>
<h2>Feedback and Contact</h2>
<p>If you have difficulty using any part of this site or have suggestions for improvement, please contact us. We will do our best to respond and to make the site more accessible where we can.</p>
<p>The Models of Authority project is based at the University of Glasgow. You can find contact details on the <a href="/about/about-models-of-authority">About the Project</a> page.</p>
<p><em>This statement was last updated in February 2026.</em></p>
`.trim();

export const DEFAULT_MODEL_LABELS: Record<ModelLabelKey, LocalizedLabel> = {
  historicalItem: { en: 'Historical Item', fr: 'Objet historique' },
  catalogueNumber: { en: 'Catalogue Number', fr: 'Numéro de catalogue' },
  position: { en: 'Position', fr: 'Position' },
  date: { en: 'Date', fr: 'Date' },
  appManuscripts: { en: 'Manuscripts', fr: 'Manuscrits' },
  fieldHairType: { en: 'Hair Type', fr: 'Type de poil' },
  fieldShelfmark: { en: 'Shelfmark', fr: 'Cote' },
  fieldDateMinWeight: { en: 'Minimum weight', fr: 'Poids minimum' },
  fieldDateMaxWeight: { en: 'Maximum weight', fr: 'Poids maximum' },
  searchCategoryImages: { en: 'Images', fr: 'Images' },
  searchCategoryScribes: { en: 'Scribes', fr: 'Copistes' },
  searchCategoryHands: { en: 'Hands', fr: 'Mains' },
  searchCategoryGraphs: { en: 'Graphs', fr: 'Graphes' },
  searchCategoryTexts: { en: 'Texts', fr: 'Textes' },
  searchCategoryClauses: { en: 'Clauses', fr: 'Clauses' },
  searchCategoryPeople: { en: 'People', fr: 'Personnes' },
  searchCategoryPlaces: { en: 'Places', fr: 'Lieux' },
  siteTitle: { en: 'Models of Authority', fr: 'Models of Authority' },
  siteTagline: {
    en: 'Scottish Charters and the Emergence of Government, 1100–1250',
    fr: "Les chartes écossaises et l'émergence du gouvernement, 1100–1250",
  },
  footerFunded: {
    en: 'Funded by the Arts and Humanities Research Council (AHRC).',
    fr: 'Financé par le Arts and Humanities Research Council (AHRC).',
  },
  footerCopyright: {
    en: '©2015–17 Models of Authority. Some parts available under CC-BY licence. All manuscript images are copyright of their respective repositories. Website by DDH / KDL. Built with Archetype.',
    fr: '©2015–17 Models of Authority. Certaines parties sont disponibles sous licence CC-BY. Toutes les images de manuscrits sont la propriété de leurs dépôts respectifs. Site web par DDH / KDL. Construit avec Archetype.',
  },
  pageHistoricalContext: { en: DEFAULT_HISTORICAL_CONTEXT_HTML, fr: DEFAULT_HISTORICAL_CONTEXT_HTML },
  pageAboutModelsOfAuthority: { en: DEFAULT_ABOUT_PROJECT_HTML, fr: DEFAULT_ABOUT_PROJECT_HTML },
  pageAccessibility: { en: DEFAULT_ACCESSIBILITY_HTML, fr: DEFAULT_ACCESSIBILITY_HTML },
};

function normalizeLocalizedValue(value: unknown, fallback: LocalizedLabel): LocalizedLabel {
  // Pre-i18n config files stored a single string shown to every locale. Seed
  // both languages from it so an existing customization survives the upgrade
  // instead of reverting to the English default for French visitors.
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? { en: trimmed, fr: trimmed } : fallback;
  }

  if (!value || typeof value !== 'object') return fallback;

  const partial = value as Partial<Record<ModelLabelLocale, unknown>>;
  const en = typeof partial.en === 'string' && partial.en.trim() ? partial.en.trim() : fallback.en;
  const fr = typeof partial.fr === 'string' && partial.fr.trim() ? partial.fr.trim() : fallback.fr;
  return { en, fr };
}

export function normalizeModelLabels(
  labels: Partial<Record<ModelLabelKey, unknown>> | undefined
): Record<ModelLabelKey, LocalizedLabel> {
  const normalized = {} as Record<ModelLabelKey, LocalizedLabel>;

  for (const key of Object.keys(DEFAULT_MODEL_LABELS) as ModelLabelKey[]) {
    normalized[key] = normalizeLocalizedValue(labels?.[key], DEFAULT_MODEL_LABELS[key]);
  }

  return normalized;
}

export function getDefaultModelLabelsConfig(): ModelLabelsConfig {
  return {
    labels: Object.fromEntries(
      (Object.keys(DEFAULT_MODEL_LABELS) as ModelLabelKey[]).map((key) => [
        key,
        { ...DEFAULT_MODEL_LABELS[key] },
      ])
    ) as Record<ModelLabelKey, LocalizedLabel>,
  };
}

export function resolveModelLabel(label: LocalizedLabel, locale: ModelLabelLocale): string {
  return label[locale] || label.en;
}

export function pluralizeLabel(label: string): string {
  // Match the suffix's casing to the character it replaces/follows so an all-caps
  // or stylised label keeps a consistent case (e.g. 'CITY' -> 'CITIES', not 'CITies').
  if (/[^aeiou]y$/i.test(label)) {
    const isUpper = label.slice(-1) === label.slice(-1).toUpperCase();
    return `${label.slice(0, -1)}${isUpper ? 'IES' : 'ies'}`;
  }
  if (/(s|x|z|ch|sh)$/i.test(label)) {
    const isUpper = label.slice(-1) === label.slice(-1).toUpperCase();
    return `${label}${isUpper ? 'ES' : 'es'}`;
  }
  const isUpper = label.length > 0 && label.slice(-1) === label.slice(-1).toUpperCase();
  return `${label}${isUpper ? 'S' : 's'}`;
}
