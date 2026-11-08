# Code quality review

Reviewed on 8 November 2026 against the complete supplied **CODEBASE_QUALITY_GUIDE.md**, the assessment and developer guide. This review focuses on behavior, state ownership and maintainability. Guide examples were treated as inspection prompts, not assumed defects.

**Outcome:** one confirmed cache-integrity defect was reproduced and fixed. No architecture replacement, dependency, generic abstraction, new product feature or authorship claim was added. The existing [assessment audit](assessment-audit.md) gives the detailed feature/state matrix; this report records the additional quality review.

## Material finding and correction

### P2 — a truncated catalogue page was marked complete

Location: `src/app/pokedex/state/pokemon.store.ts`, `loadPage$()`.

A deterministic reproduction returned 100 records from offset 0 with a reported total of 101, followed by an empty page at offset 100. The store marked both offsets complete and exposed successful browse/search with only 100 records. Session persistence already rejected the mismatched count, but in-memory success prevented Retry from requesting the missing page.

The store now checks each page's expected size against the requested batch and reported total **before** caching it or marking its offset complete. Incomplete pages enter the existing friendly error/Retry flow. Successful earlier pages remain cached, and Retry requests the incomplete offset again.

Verification: a new store test failed before the production correction because the promise resolved with partial data. It passes after the correction, asserting error status, retained complete records, no persisted partial catalogue, recovery to 101 records and request offsets `[0, 100, 100]`. The existing transport-failure/resume test now supplies a realistic full 100-record first page; its recovery and offset assertions remain intact.

## Checklist review

| Quality-guide area                    | Inspection and evidence                                                                                                                                                                                   | Outcome                                                                                                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Scope and conventions              | Angular 21 versions, feature folders, required store paths, concrete names, separate templates/SCSS, standalone/OnPush/inject/signal inputs and outputs, public-method JSDoc                              | Retained. No auth, AWS scaffolding, generic repository, base class or empty architectural folder was found. Prior user-requested UI and mock persistence remain in scope.             |
| B. Real integration                   | Typed HttpClient operations and variables, shared GraphQL-envelope checks, bounded delayed read retries, mutation policy, sprite mapping, uncached team hydration, CommonJS seed                          | Actual public queries and generated mock query/create/delete operations passed. HTTP-200 GraphQL errors are failures. No automatic create retry.                                      |
| C. Stores/selectors/request lifecycle | Private BehaviorSubjects; read-only streams; required search operators; immutable filter/sort/page projections; shared in-flight requests; cancellation, retry triggers and lifecycle cleanup             | Existing behavior retained. The truncated-page defect above was fixed. No application fake loading timeout or unguarded manual subscription was found.                                |
| D. Optimistic operations              | Pending create, server reconciliation, item-specific rollback, serialized conflicting operations, useful form input and selected-team recovery                                                            | Store/DOM/browser tests exercise confirmation, rollback and recovery, including a prior successful create surviving a later failed delete.                                            |
| E. Signals and persistence            | Store-owned collections, local interaction Signals, computed summaries, one-time observable bridges, delayed restoration/persistence, invalid storage and deleted IDs                                     | No independently writable duplicate Pokémon/team collection was found. The shared typed form owns the unfinished draft; browser storage is restoration data, not a second live store. |
| F. UI and forms                       | Four async states, current-parameter Retry, stable loading space, complete stats/sorts, page sizes, abilities/radar, name normalization and completing async uniqueness, membership and keyboard behavior | Covered by source inspection and existing behavioral tests; see the assessment async-state matrix.                                                                                    |
| G. Tests and delivery                 | Real scripts, meaningful failure assertions, network isolation, lockfile, README consistency, conventional history and explicit limitations                                                               | Build and tests run below. No focused/skipped/todo tests, TypeScript suppression or application `any` shortcut was found. No new test framework or lint stack was introduced.         |

The four existing application subscriptions use Angular destruction cleanup. Root-provided services live for the application lifetime. Read projections use replay with reference counting; sent team operations intentionally stay subscribed until their bounded HTTP request ends so a disappearing view cannot strand a pending team. Chart instances and media/event listeners have cleanup.

## Two complete flows

**Pokémon search and inspection:** a typed search control emits through the required 300 ms debounce, distinct check and switch. `PokemonStore.loadCatalogue$()` shares bounded page requests through `PokemonApiService`; the store owns items and request status. The selectors derive normalized filtering, immutable sorting and clamped pagination. `toSignal()` bridges those projections once for rendering. Selecting a row opens details; the selected ID and a separate Retry subject switch to the current detail request. Catching errors inside that switch preserves future selections/retries; cancellation prevents an older response from replacing the current panel. Chart updates reuse the existing instance.

**Team create and delete:** the shared typed form normalizes names, completes asynchronous uniqueness checks and hydrates selected members. Submission marks fields touched and checks validity/readiness/busy state. `TeamStore.create$()` immediately inserts a uniquely identified pending record, sends one generated-schema mutation, then replaces that record or removes only it on failure. The form clears only after success. Delete removes its target optimistically; failure reinserts only that team and exposes Retry. A simple busy guard prevents conflicting mutation/reload work. Selection persistence waits for resolved team loading and a settled mutation.

`requireGraphqlData()` rejects transport-success GraphQL error envelopes; services propagate failures. Stores/request projections translate them to explicit friendly error state. `catchError(() => of(undefined/null))` in completed action flows is paired with a published error state; it does not fabricate a successful empty catalogue.

## Explainability and change rehearsal

| Question from the guide                          | Concrete answer                                                                                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Why BehaviorSubjects and Signals?                | Stores own shared async domain state; Signals represent UI interaction and read-only derived/template values.                                 |
| Where does a GraphQL failure become UI feedback? | The shared envelope helper throws; store/request catches publish `error` status and friendly text.                                            |
| Why does unchanged-input Retry work?             | A separate Retry subject retriggers the current request instead of relying on the debounced input to emit again.                              |
| Why can an old detail response not win?          | `switchMap` unsubscribes the old ID/request; the view observes only the current branch.                                                       |
| What does rollback restore?                      | Create removes its own temporary ID; delete restores its own removed record. Neither replaces the entire earlier collection snapshot.         |
| Why filter/sort before paging?                   | The user's query and order apply to the full cached collection, not just the visible slice. Sorting copies the array.                         |
| Why does async uniqueness finish?                | A 300 ms timer switches to one store emission via `take(1)` and maps it to a validation result. Unavailable teams produce a validation error. |
| When does selection storage write?               | After restoration completes, team loading succeeds and no mutation is busy.                                                                   |
| Which regression protects rollback?              | `team.store.spec.ts`: failed create removes only its pending record; failed delete preserves an earlier successful create.                    |
| What was deliberately excluded?                  | Auth/trainer management, speculative repository/facade layers, a real multi-user backend and the three unselected assessment bonuses.         |

The default-page-size rehearsal changed `INITIAL_TABLE_OPTIONS.pageSize` from 10 to 25 in an **in-memory copy** of the selector module. Running the selectors against 30 records produced 25 visible records and two pages without changing the source array. Only that constant needed to change; no application edit was retained. Existing defensive initial view data remains local to the table. This exercise found no unrelated change spread.

## Verification and limits

Executed commands and outcomes are summarized in [verification.md](verification.md). The new store regression was observed failing before the fix, then all 10 store tests passed. The full unit suite subsequently passed **60 tests across 17 files**. The production build passed unchanged budgets at approximately **433.60 kB initial / 110.04 kB estimated transfer**.

The live public API check passed without authentication: pagination/types/six stats/sprites, all 12 default-trainer seed IDs and regular/hidden abilities with English descriptions. Actual mock introspection/create/read/delete/cleanup and isolated disk-write/restart checks passed. A four-team local database was preserved; checks used a disposable record or temporary port/file.

The full browser suite passed **46 checks across desktop/mobile Chromium** after the fix, using isolated traffic, slow/error/retry and stale-selection flows, and captured visual states. Formatting, e2e TypeScript and whitespace checks passed; no separate ESLint target is configured. It does not prove actual mobile touch dragging, assistive-technology usability, Firefox/WebKit compatibility, real disconnection/throttling or low-end frame rate. Those remain manual checks. A real multi-user backend would also need server-enforced uniqueness and reconciliation of ambiguous mutation timeouts; those existing documented limits are not expanded into assessment infrastructure.

No dependency was added or removed; imports, configuration and scripts accounted for the current dependencies. The existing reproducible-install record remains in the verification notes; `npm ci` was not rerun during this review because the lockfile/dependencies were unchanged. Temporary structural-analysis output was kept outside the submission, and the tool's generated source-folder cache was removed. Existing `angular.json` analytics preferences and local critique files were excluded from review commits. Git history and attribution were preserved.
