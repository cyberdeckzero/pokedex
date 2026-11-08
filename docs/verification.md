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
