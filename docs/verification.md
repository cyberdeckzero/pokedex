# Verification record

Verified locally on 7 November 2026 (Asia/Kolkata), with Node 22.14.0 and npm 11.6.4. This records executed checks, not a claim of browser certification.

| Check                                                   | Observed result                                                                                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx --yes npm@11.6.4 ci`                               | Passed from the committed lockfile; `prepare` installed the commitlint hook. npm reported 20 moderate dependency advisories in the tooling dependency tree.          |
| `npm run build`                                         | Passed, including strict Angular template checking and production budgets. Approximately 489 kB raw / 134 kB estimated transfer for the initial bundle.              |
| `npm test`                                              | 34 tests passed across 15 files, with mocked network access and deterministic debounce/retry timers.                                                                 |
| `npm run format:check`                                  | Passed. No separate ESLint target is configured.                                                                                                                     |
| `npm start` and an HTTP GET to `http://127.0.0.1:4200/` | Development compilation passed; entry page returned HTTP 200 with the expected application title and module script.                                                  |
| `npm run mock`                                          | Started the pinned 2.4.0 CLI with the `.cjs` seed on port 4000.                                                                                                      |
| `npm run check:mock`                                    | Live schema arguments matched; paginated query/metadata, create, read-back, delete, and test-record cleanup passed.                                                  |
| Mock CORS preflight                                     | HTTP 204; POST and Content-Type allowed for the app origin.                                                                                                          |
| Mock restart                                            | Created a disposable team, stopped/restarted the CLI, then verified that team was absent and all three seed teams were restored.                                     |
| `git diff --check`                                      | Passed.                                                                                                                                                              |
| `npm run check:poke`                                    | Passed against public `v1beta2`: pagination/count, six stats/types/sprites, all 12 default-trainer seed IDs, and regular/hidden abilities with English descriptions. |
| Browser inventory                                       | Native browser host unavailable; local Playwright Chromium subsequently launched and completed the UI audit.                                                         |

## 8 November reload-performance follow-up

Inspection confirmed that catalogue pagination was unchanged by the interaction work, but every page refresh discarded its memory-only cache and fetched the complete collection again. The UI bundle had grown from approximately 348 kB to 430 kB with the interaction dependency. A validated, versioned, one-hour session cache now restores only completed catalogues. Expired/corrupt/partial data and failures are never treated as cached success; blocked storage preserves ordinary browsing. Initial selector output makes a restored collection render before the search debounce completes.

`npm test` passed 59 tests across 17 files, covering successful reload reuse, expiry/corruption/incomplete cache rejection, uncached failures, and unavailable storage. Eight focused desktop/mobile browser checks passed reload reuse, same-input recovery, loading layouts, and visual flows; final reload/recovery checks also passed after immediate selector initialization. The reload test blocks upstream catalogue traffic after the first success and confirms zero additional catalogue requests while search still works. Production build, formatting, TypeScript, and whitespace checks passed; no budget was raised.

Two terminal availability probes returned HTTP 403 with `error code: 1010`, so current real API latency could not be measured from this environment. This does not establish that the user's browser receives the same response. Cold-load speed still depends on the upstream service; no fixture fallback or authentication workaround was introduced.

## 8 November interactive follow-up

`npm run build` passed within unchanged budgets (approximately 431 kB initial / 109 kB transfer). `npm test` passed **53 tests across 17 files**, including reorder persistence, dual-type immunities, and coverage counts. `AUDIT_CAPTURE=interactive npm run test:e2e` passed **40 desktop/mobile Chromium checks**, including direct hero selection, drag-to-copy, duplicate-drop rejection, drag/keyboard reordering, focus after DOM moves, saved draft order, mobile cards/sorting, axe scans, and recovery states. Final focused accessibility/selection and visual/order checks also passed after refinements. Formatting, e2e TypeScript and whitespace checks passed.

`npm run check:mock-persistence` passed isolated create/restart, delete/restart, empty-database schema, and failed-disk-write rollback checks. `npm run check:mock` passed schema/query/create/read/delete/cleanup against the running persistent mock. Migration preserved all four existing teams and both trainers, with an ignored local backup; comparison after endpoint verification confirmed those records unchanged. Port 4200 served compiled card and drag-list components. The initial browser fixture setup was made automatic for all tests after discovering new tests could omit its explicit parameter; final runs use intercepted network throughout. No browser test fixture is a production outage fallback.

See the [interaction report](ui-audit/INTERACTIONS.md). Real touch dragging, assistive technologies, Firefox/WebKit, and low-end frame rate remain manual checks. The CDK's pointer dragging was exercised in both Chromium projects; this does not substitute for hardware testing.

## 8 November supplied dashboard reference

The reference implementation adds a dark artwork hero with a shared deferred radar, contextual controls, aligned stat columns, persistent active-row highlighting, larger squad sprites, and three distinct team panels. `npm test` passed all 50 tests; `AUDIT_CAPTURE=reference npm run test:e2e` passed all 34 desktop/mobile Chromium checks and captured sixteen states, including Charizard. The shared radar test covers exact value labels as well as instance reuse/cleanup. Build passed within unchanged budgets at approximately 348 kB initial / 91 kB transfer; formatting, e2e TypeScript, and whitespace checks passed. A final visual capture run also passed both projects after correcting the pinned-name highlight. See the [implementation report](ui-audit/REFERENCE.md).

## 8 November contemporary refresh

After removing the navigation/status/footer copy and modernizing the screens, `npm run build` passed without budget warnings (approximately 348 kB initial / 91 kB estimated transfer). The updated touch-control checks passed both projects. A subsequent full `AUDIT_CAPTURE=modern npm run test:e2e` run passed all **34 desktop/mobile Chromium checks**, and `npm test` passed **50 tests across 16 files**. Formatting and whitespace checks passed. See the [current refresh report](ui-audit/MODERN.md) for fourteen fresh captures and visual inspection notes. Existing app/mock processes were preserved; no live API operations changed.

## 8 November flow and loading follow-up

The current follow-up uses the same Node/npm setup. `npm test` passed **50 tests across 16 files**. `npm run test:e2e` passed **34 checks across desktop/mobile Chromium**, using isolated GraphQL/image fixtures on its own production-configuration server at port 4300. Existing app/mock servers were preserved.

`npm run build` passed without budget warnings: approximately **353 kB initial / 92 kB estimated transfer**, plus a deferred chart chunk of approximately **160 kB / 50 kB transfer**. `npx tsc --project e2e/tsconfig.json`, `npm run format:check`, and `git diff --check` passed. No separate lint target is configured.

New checks cover inspect-to-draft additions, duplicate control disabling, refresh restoration, invalid/unavailable storage, failed draft hydration and Retry, save guards, successful-save clearing, deliberate deletion/cancellation, pinned mobile identity, visible initial suggestions, shaped loading placeholders, stable table height, and reduced motion. Keyboard Escape from suggestion error feedback is also covered. `AUDIT_CAPTURE=polish npm run test:e2e -- --grep 'visual evidence'` also passed both projects and refreshed fourteen captures linked in the [follow-up report](ui-audit/POLISH.md).

An intermediate browser run was invalidated by a source-triggered development-server reload during autocomplete entry; its trace showed a second page initialization clearing the input. Final verification ran with source files unchanged. The original audit and endpoint checks below remain historical records; this follow-up did not change API operations or re-run live mutations against user data.

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

## UI/UX audit verification

A subsequent hands-on audit used local Playwright against a separately started Angular production-configuration server on port 4300. All **26 browser checks passed** across desktop/mobile Chromium. The suite uses isolated GraphQL/image fixtures and checks uncaught runtime exceptions. Four axe states per project returned no violations of the selected WCAG A/AA rules; this does not certify full accessibility.

Checks cover all principal flows, independent loading/error/empty states, same-input recovery, optimistic mutations and rollback, saved selection, keyboard focus, a 30-character unbroken team name, touch targets, 320px reflow, 200% text, chart canvas reuse/pixel changes, and adaptive native dialog behavior. The final portrait unit checks also passed after preserving image layout during fallback failure.

`npm run build` passed without budget warnings. `npx tsc --project e2e/tsconfig.json`, `npm run format:check`, and `git diff --check` passed. The full Angular unit suite passed **34 tests across 15 files**. Browser installation used `npx playwright install chromium`. Test-owned servers were stopped automatically; existing app/mock processes were preserved.

The [audit report](ui-audit/README.md) contains eleven findings/fixes, current standards references, and **26 before/after screenshots**. A live initial browser load rendered all 1,351 catalogue records; repeatable browser checks use 56 fixture records and separate test teams, with no production fixture fallback.

## Remaining verification

Screen readers, real phones/tablets, Firefox/WebKit, forced-colors mode, actual network disconnection/throttling, and low-end-device performance remain manual checks. Playwright verifies simulated network failures and recovery, screenshot appearance, responsive overflow, focus behavior, and real chart rendering in Chromium. It does not measure animation frame rate or certify full WCAG compliance. The app never injects test fixtures as an outage fallback.

All changes are local Git commits. No remote repository was created and nothing was pushed; GitHub delivery is still separate. Startup commands remain unchanged.
