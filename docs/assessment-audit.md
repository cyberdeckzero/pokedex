# Assessment completion audit

Reviewed on 8 November 2026 against all six pages of **Pokemon Task.pdf** and the complete **DEVELOPER_GUIDE.pdf**. The assessment takes precedence over guide samples. AWS, authentication, authorization, and unrelated sample features are excluded.

**Result:** required application behavior is implemented locally, including the selected CDK drag-and-drop bonus. GitHub delivery remains pending: this repository has no remote, and publishing has not been authorized. The checks below distinguish automated evidence from remaining manual checks; they do not certify accessibility or the assessment's elapsed-time limit.

## Issues found and corrected

1. Recent UI changes made row selection update only the featured hero. The assessment explicitly requires a sliding detail panel. Clicking any desktop data row now both updates the hero and opens details; the mobile name action does the same. Buttons announce a dialog, Escape closes it, and the existing focus-return behavior remains. Hero navigation can still preview entries without opening the panel.
2. The selected-team overview disappeared while teams reloaded, moving the builder. It now has loading skeletons, empty guidance, an error with Retry, and success content. Saved-team and overview areas reserve space and scroll when necessary; the heading also reserves its status line. A browser regression test measures the builder's position before, during, and after reload in both viewport projects.
3. Added browser coverage for full-team and pending-submission drag rejection, in addition to existing copy, duplicate rejection, reorder, keyboard, and persistence checks.

## Required behavior and evidence

| Requirement                                           | Implementation / evidence                                                                                                                                                | Result                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Paginated GraphQL list with types, six stats, sprites | `pokedex/services/pokemon-api.service.ts`: named operations and variables, domain mapping, 100-record pages, aggregate count                                             | Implemented; live endpoint check passed                                         |
| Details by ID, including abilities                    | Same service; independent details request, English effect descriptions, hidden-ability labels                                                                            | Implemented; live and browser checks passed                                     |
| Delayed bounded retry and visible failures            | HttpClient queries have a 12-second timeout and at most two retries, 500 ms apart; HTTP and HTTP-200 GraphQL errors fail visibly                                         | Unit and browser recovery checks passed                                         |
| Supplied trainers and teams; port 4000                | `mock/db.cjs` contains both trainers and all three original teams; clipped avatar replaced with an empty fallback; default trainer Ash (`"1"`)                           | Implemented; live mock check passed                                             |
| Fetch/create/delete teams using generated schema      | `teams/services/team-api.service.ts`; introspected `ID!` mutation arguments, paginated team queries; pinned json-graphql-server 2.4.0                                    | Actual schema and create/read/delete/cleanup passed                             |
| BehaviorSubject Pokémon store and cache               | `src/app/pokedex/state/pokemon.store.ts`; private subject, read-only streams, successful detail cache and in-flight sharing; uncached team members hydrate separately    | Unit tests cover caching, deduplication, retries and missing pages              |
| Derived RxJS selectors                                | `src/app/pokedex/state/pokemon.selectors.ts`; `map`, `distinctUntilChanged`, `combineLatest`, immutable sorting; `shareReplay({ bufferSize: 1, refCount: true })`        | Selector tests passed                                                           |
| Required debounced search sequence                    | Both catalogue and autocomplete use `debounceTime(300)` → `distinctUntilChanged()` → `switchMap(...)`; retries have independent triggers                                 | Stale-response and same-input recovery checks passed                            |
| BehaviorSubject team store and optimistic mutations   | `src/app/teams/state/team.store.ts`; temporary pending IDs, response replacement, item-specific rollback; serialized mutations and no automatic create retry             | Rollback, replacement, conflict and recovery tests passed                       |
| Signals and lifecycle                                 | Local `signal()` selection/open state, `computed()` totals/types, one-time `toSignal()` bridges, storage `effect()`; cancellation/cleanup via Angular lifecycle and RxJS | Source inspection and selection/storage tests passed                            |
| Selected-team persistence                             | Restoration waits for loaded teams; invalid IDs/storage failures and selected-team deletion handled; failed optimistic deletion preserves selection                      | Unit/DOM and browser checks passed                                              |
| Complete table                                        | Sprite, name, colored types, HP, Attack, Defense, Sp. Atk, Sp. Def, Speed and total; seven ascending/descending stat sorts                                               | Browser browse/sort checks passed                                               |
| Global filtering and pagination                       | Name/type filters and sorting run before 10/25/50 pagination over the completed catalogue; page reset/clamping; no generation cutoff                                     | Selector and browser checks passed                                              |
| Row details and animated radar                        | Row opens a sliding panel with artwork, identity, measurements, types, six stats, abilities and Chart.js radar; six axes use consistent stat order                       | Browser row/detail/chart checks passed; unit instance-reuse/cleanup test passed |
| Typed Reactive Forms                                  | Shared typed draft form; normalized required 3–30-character name; async 300 ms case-insensitive uniqueness over all trainers' teams                                      | Validator tests confirm completion and unavailable-data errors                  |
| Picker and membership                                 | Debounced suggestions; removable members; one to six unique IDs; invalid/pending/busy submissions blocked; dirty/touched feedback                                        | Form and keyboard browser checks passed                                         |
| Failure recovery preserves useful input               | Failed create removes its pending record but retains the name and members; failed delete restores only that team with Retry                                              | Store/DOM/browser checks passed                                                 |
| Component and naming conventions                      | Feature folders; `*.component.ts/html/scss`, `*.service.ts`, models/utilities; standalone, OnPush, `inject()`, signal inputs/outputs, modern control flow                | Static inspection passed for all 15 components                                  |
| Service/store documentation and types                 | Concise JSDoc for all 18 public service/store methods; typed API/domain models; no explicit `any` in application source                                                  | TypeScript AST inspection passed                                                |
| SCSS and shared styles                                | BEM component names, CSS custom properties, local licensed fonts; substantive templates/styles separated                                                                 | Source inspection and production budgets passed                                 |
| Conventional history                                  | Existing history preserved; commitlint hook and scoped conventional messages; task changes committed separately                                                          | Existing history passed commitlint validation                                   |
| Minimum three meaningful unit tests                   | Optimistic rollback in `team.store.spec.ts`, immutable filtering/sorting in `pokemon.selectors.spec.ts`, completing async uniqueness in `team.validators.spec.ts`        | Included in 59 passing tests across 17 files                                    |
| README and runnable Angular app                       | Root README includes versions, setup, app/mock commands, architecture, fetch tradeoff, persistence, recovery checklist and realistic improvements                        | Build passed; browser suite runs through `ng serve`                             |

## Async-state coverage

A request failure never becomes a successful empty collection. Retry uses the current relevant search/selection and leaves the containing stream alive.

| Async area               | Loading                                                            | Empty                                                               | Error / Retry                                                   | Success                                                |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| Catalogue / mobile cards | Shaped placeholders and bounded page progress; reserved body space | No Pokémon match the filters, with reset guidance                   | Friendly catalogue failure; Retry Pokédex resumes missing pages | Full cached catalogue, filtered/sorted/paged           |
| Detail panel / abilities | Reserved portrait/stat/ability skeletons                           | Missing entry and no-abilities feedback                             | Details failure and Retry for the current ID                    | Latest selected details, six-axis radar and abilities  |
| Saved teams              | Shaped squad placeholders                                          | No teams yet; points to builder                                     | Retry teams; mutation feedback separate                         | Selectable squads, pending badge and member images     |
| Team-member hydration    | Sprite placeholders and overview skeleton                          | Empty roster remains a successful empty team state                  | Retry team Pokémon / Retry overview                             | Seeded members fetched even outside browse cache       |
| Selected-team overview   | Dedicated summary skeleton                                         | Create a team to see totals/types                                   | Friendly unavailable overview with Retry                        | Computed total base stats and type distribution        |
| Autocomplete             | Shaped suggestion skeletons                                        | No matching unselected Pokémon                                      | Friendly picker error with Retry; same input remains usable     | Keyboard-accessible suggestions excluding selected IDs |
| Restored draft members   | Reserved member placeholders                                       | Empty slots with one-to-six-member guidance                         | Hydration failure, Retry, save blocked                          | Removable/reorderable hydrated members                 |
| Deferred chart download  | Reserved chart area                                                | No selected entry is represented by the surrounding selection state | Reload action; exact numeric stats remain readable              | Reused animated canvas; cleaned up on destruction      |

Unit tests mock network access. Playwright fixtures also isolate catalogue, details, teams, mutations and images; they simulate waiting requests, transport failures and GraphQL errors. These fixtures are never used as production outage data.

## Selected bonus: number 2 only

The PDF says **“pick at most ONE”**. The submission selects **drag-and-drop Pokémon from the table into team slots with `@angular/cdk/drag-drop`**.

- Catalogue entries copy into the shared draft without removing or mutating the source catalogue.
- Drag handles reorder existing members. The persisted draft and submitted mutation preserve that order.
- Duplicate members, seventh members, and drops during a pending submission are rejected.
- Autocomplete/Add actions and labeled reorder buttons provide keyboard equivalents. Alt+ArrowUp/Down on a focused slot preserves focus and announces movement.
- Browser tests exercise actual CDK pointer dragging, reordering and all three rejection cases. These checks run in both Chromium projects; actual touch dragging still requires hardware verification.

Virtual scrolling and a type-highlight directive were not added. Existing shimmer, scanner effects, responsive cards and coverage summaries came from the user's earlier UI requests; they are not additional claimed assessment bonuses. The original ten-hour estimate and three-day deadline cannot be verified from repository state, and no claim is made that the expanded UI scope fits them.

## Compatibility and scope decisions

- The assignment's original PokéAPI endpoint is retired. The app uses the public `https://graphql.pokeapi.co/v1beta2` endpoint and its renamed fields. The live Node check passed without authentication, including 1,351 catalogue records and all 12 Ash-team seed IDs. No account/API key is required.
- Global client-side search/sort requires the complete collection. It loads in 100-record pages with at most two catalogue requests concurrently; successful pages survive failure in memory. Only a validated completed catalogue is saved in sessionStorage for one hour. A cold load still depends on upstream latency/quota; cached searches do not call the API.
- The desktop table remains complete. Below 600px, compact cards expose the same data and controls, including all six stats and all stat sorts; this follows the user's later mobile requirement.
- The mock uses json-graphql-server's generated schema. A small launcher persists mutations atomically to ignored `mock/data.local.json`, as requested later by the user. It is a local assessment mock, without auth or a separate application backend. Failed writes produce failures and restore the prior database. Isolated tests cover restart behavior, an empty database and failed-write rollback.
- Ash is the default trainer. Misty's original records stay in the mock and participate in uniqueness validation. Trainer management remains out of scope.

## Executed verification and delivery limits

The latest command results are recorded in [verification.md](verification.md). The final audit run includes production compilation, all 59 unit/DOM tests, the full 46-check desktop/mobile Chromium suite, formatting, e2e TypeScript, whitespace checks, live PokéAPI queries, actual generated mock mutations, and isolated disk-persistence failures/restarts. Visual tests also capture loading, empty, error, hero, suggestions and detail states.

Automated axe checks, responsive layouts at 320px/tablet/desktop, 200% text, Escape/focus return, stale selection, unchanged-query Retry, optimistic rollback and selection persistence are covered. Actual device touch, screen readers, Firefox/WebKit, real network disconnection/throttling and low-end animation performance remain manual verification; simulated failures do not replace these checks.

**Pending delivery:** create or connect the intended GitHub repository and push the local conventional history after explicit publication authorization. No remote was created, no history was rewritten and nothing was pushed. Unrelated local workspace changes were excluded from assessment commits.
