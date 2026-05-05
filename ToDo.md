# FineCut Admin Panel — Remaining Tasks

## Completed (2025-05-04)

- [x] Port admin panel frontend (HTML/CSS/JS) from `_adm/` to `public/`
- [x] Fix runtime errors: style.css 404, elFinder 500, POST 415/400/404
- [x] Fix Fastify route ordering conflict (catch-all before API routes)
- [x] Fix Properties tab `[object Object]` — `getPage()`/`setPage()` now return raw strings for `info`/`blocks` matching PHP behavior
- [x] Build: 0 errors, Tests: 49/49 passing

## Upcoming

- [ ] **elFinder / Files Manager tab** — currently not functional. Backend handler exists in `admin.ts` (`handleElfinder`) but needs testing and frontend integration.
- [ ] **Templates tab empty dropdown** — template list endpoint `/engine/template` works, but dropdown in admin UI is empty. Likely frontend wiring issue in `startup.js`.
