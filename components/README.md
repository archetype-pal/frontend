# Components structure

Components are organized by feature/domain:

- **layout/** – Site shell: header, footer, language switcher, page banner
- **page/** – Shared loading skeletons and error states for public pages
- **annotation/** – Annotation popup: header, popup card and layer, read-only and editor views
- **manuscript/** – Manuscript viewer: Annotorious overlay, toolbars, tabs, text panel, annotation gallery
- **text/** – Image-text viewer and its staff edit link
- **collection/** – Collection: star, selection toolbar, table view, print and share
- **compare/** – Compare: toggle button, store hydrator, Mirador viewer
- **lightbox/** – Lightbox image comparison and tools
- **content/** – Publications & content: intro section, article list, blog post preview, publication pages, share buttons
- **search/** – Search page, results table, grid, timeline and map views, keyword bar, sort and view controls
- **filters/** – Dynamic facets and facet panels
- **backoffice/** – Backoffice screens; shared building blocks in `backoffice/common/`, the shell in `backoffice/layout/`
- **common/** – "View in backoffice" link shown on public pages to signed-in users
- **providers/** – TanStack Query provider
- **ui/** – Primitive UI components (shadcn/ui)

Import across folders with `@/components/<folder>/<file>`; files in the same folder import each other with `./`.
