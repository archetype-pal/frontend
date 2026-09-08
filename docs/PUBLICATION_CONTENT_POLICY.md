# Publication Content Policy

Publication content has two separate compatibility surfaces:

- Render existing publication HTML safely and consistently.
- Create new publication content through a smaller, intentional editor surface.

Rendering support for legacy HTML does not mean the rich editor should be able to
create that HTML.

## Display Compatibility

Public publication pages and the backoffice Preview tab render publication HTML
through `renderPublicationHtml()`.

That display path sanitizes legacy-safe publication HTML, links legacy footnotes,
and applies `.publication-body` styling. It exists so imported records from the
old project can continue to display without requiring every record to be
rewritten immediately.

## Supported Modern Authoring

The visual rich editor is the supported authoring surface for modern publication
content. It intentionally creates semantic HTML only:

- paragraphs
- `h1`, `h2`, `h3`
- bold, italic, strikethrough, and inline code
- unordered and ordered lists
- blockquotes
- code blocks
- horizontal rules
- links
- images

New editor-generated presentation should come from application CSS, not saved
`class=""` or `style=""` attributes in the publication body.

## Legacy Display-Only Markup

The following content may be displayed for backwards compatibility but should not
be added as visual editor tools unless there is a deliberate product decision to
support them as new authoring features:

- tables
- iframes and embeds
- arbitrary `class=""`
- inline `style=""`
- `h4`, `h5`, `h6`
- forms and inputs
- Bootstrap-style panels, lists, and utility classes
- old Word/import/search/event classes

These are treated as legacy/display-only because they came from the old
Mezzanine/admin content model or imported rich HTML rather than the current
authoring model.

## Raw Source Mode

`hasLegacyRichPublicationHtml()` identifies publication content that the visual
editor cannot preserve reliably. Matching records should open in raw/source mode
with a warning, and editors should use the Preview tab as the display authority.

## Future Editor Additions

Before adding a new toolbar control or Tiptap extension for publications, decide
whether it is meant to be a modern authoring feature or only legacy display
compatibility.

If it is a modern authoring feature, add the editor support, display styling,
sanitizer support, and detector tests together.

If it is only legacy display compatibility, keep it out of the visual editor and
make sure Preview/public rendering remains safe.
