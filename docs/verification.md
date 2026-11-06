# Verification record

Verified locally on 7 November 2026 (Asia/Kolkata), with Node 22.14.0 and npm 11.6.4. This records executed checks, not a claim of browser certification.

| Check                                                   | Observed result                                                                                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx --yes npm@11.6.4 ci`                               | Passed from the committed lockfile; `prepare` installed the commitlint hook. npm reported 20 moderate dependency advisories in the tooling dependency tree.          |
| `npm run build`                                         | Passed, including strict Angular template checking and production budgets. Approximately 482 kB raw / 132 kB estimated transfer for the initial bundle.              |
| `npm test`                                              | 32 tests passed across 15 files, with mocked network access and deterministic debounce/retry timers.                                                                 |
| `npm run format:check`                                  | Passed. No separate ESLint target is configured.                                                                                                                     |
| `npm start` and an HTTP GET to `http://127.0.0.1:4200/` | Development compilation passed; entry page returned HTTP 200 with the expected application title and module script.                                                  |
| `npm run mock`                                          | Started the pinned 2.4.0 CLI with the `.cjs` seed on port 4000.                                                                                                      |
| `npm run check:mock`                                    | Live schema arguments matched; paginated query/metadata, create, read-back, delete, and test-record cleanup passed.                                                  |
| Mock CORS preflight                                     | HTTP 204; POST and Content-Type allowed for the app origin.                                                                                                          |
| Mock restart                                            | Created a disposable team, stopped/restarted the CLI, then verified that team was absent and all three seed teams were restored.                                     |
| `git diff --check`                                      | Passed.                                                                                                                                                              |
| `npm run check:poke`                                    | Passed against public `v1beta2`: pagination/count, six stats/types/sprites, all 12 default-trainer seed IDs, and regular/hidden abilities with English descriptions. |
| Browser inventory                                       | Browser automation host unavailable; no browser surfaces could be opened.                                                                                            |

## Behaviors covered by automated tests

- Optimistic create rollback, temporary-record replacement, duplicate-submission guards, delete rollback that preserves an earlier successful create, and load recovery.
- Filtering/sorting before pagination without source mutation, normalized search, and page clamping.
- In-flight catalogue sharing, completed-cache reuse, failed-request recovery, missing-page resumption, and independent team-ID hydration.
- HTTP-200 GraphQL errors, bounded PokéAPI retries, fresh requests after failure, complete mock-team pagination, and no automatic mutation retry.
- Public `v1beta2` requests, renamed catalogue and ability relations, sprite mapping, and team hydration using the new `pokemon` root.
- Completing 300 ms uniqueness validation, case/whitespace normalization, unavailable team data, and one-to-six unique member validation.
- Table error versus empty state and same-search Retry; stale detail responses and same-selection Retry; autocomplete keyboard selection, exclusion of selected members, stale search cancellation, and same-query recovery.
- Preserved form values after create failure; selection restoration, invalid/unavailable storage, failed/successful deletion, and team-member hydration Retry.
- A complete rendered Angular form flow with autocomplete, optimistic create, server replacement, failed-delete rollback, successful retry, and selection persistence.
- Chart instance reuse, the configured animation, and destruction on close. The chart library is mocked for this lifecycle test; actual pixels/animation timing require browser verification.

## API migration verification

The initial checks against the assessment’s `v1beta` URL returned HTTP 522; a later request returned HTTP 401. The [official documentation](https://pokeapi.co/docs/graphql) confirms that this endpoint was removed in November 2026. The app, HTTP fixtures, and live check script now use `https://graphql.pokeapi.co/v1beta2` and its prefix-free schema. Catalogue, ID hydration, and detail/ability operations returned HTTP 200 without credentials. The live count during migration verification was 1,351 Pokémon.

The migration regression tests failed against the old response mapper before the fix; all 29 tests pass with the new mapping. The running development app also returned HTTP 200 after migration.

## Device UI verification

The UI overhaul passed the full 32-test suite and production build without budget warnings. New tests cover portrait image fallbacks, selection resets, bounded pointer tilt/reduced motion, catalogue navigation wraparound, and retaining the displayed entry when the drawer closes. The existing rendered form/create/delete recovery flow also passes with the device components in place.

The running development server returned HTTP 200 for the new application entry, local font, and device favicon. Browser inventory was checked again, but the browser access host remained unavailable. No screenshot or real pointer/canvas animation check was performed.

Calculated WCAG contrast ratios for the main display tokens: display ink on LCD 9.37:1; muted text on the light input surface 6.13:1; muted text on the darker LCD 4.64:1. Small enclosure labels use white, which measures 4.57:1 against the brightest red header surface. These token checks do not replace a browser accessibility audit.

## Remaining verification

Browser appearance, real canvas animation, responsive overflow, screen-reader/focus behavior, and DevTools offline/throttled recovery remain manual checks. Follow the README checklist when browser access and the public endpoint are available. The app never injects test fixtures as an outage fallback.

All changes are local Git commits. No remote repository was created and nothing was pushed; GitHub delivery is still separate. Startup commands remain unchanged.
