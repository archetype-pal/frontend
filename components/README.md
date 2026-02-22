# Components structure

Components are organized by feature/domain:

- **layout/** – App shell: header, footer, theme provider
- **annotation/** – Annotation UI: header, history, metadata, popup
- **manuscript/** – Manuscript viewing & editing: viewer, image, tabs, toolbar, Annotorious, manuscripts table
- **collection/** – Collection feature: collection star
- **content/** – Publications & content: intro section, article list, blog post preview, paginated publications, share buttons
- **lightbox/** – Lightbox image comparison and tools
- **search/** – Search page, results table, grid, facets
- **filters/** – Dynamic facets and facet panels
- **ui/** – Primitive UI components (shadcn/ui)

Imports should use the `@/components/<folder>/<file>` path.
