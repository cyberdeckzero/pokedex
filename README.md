# Mini Pokédex

Angular 21 assessment: browse the full Pokémon catalogue, inspect stats and abilities, and build teams of one to six Pokémon. Includes explicit loading, empty, error/Retry, and success states; optimistic team mutations; and focused unit/DOM tests.

## Run locally

Use **Node 22.14.0** (`.nvmrc`) and **npm 11.6.4**. Angular also supports Node 20.19+ or 24; the pinned Node/npm pair is the tested setup. npm 11.2 hit a peer-dependency resolver bug during installation.

```bash
nvm use                       # if using nvm
npx --yes npm@11.6.4 ci        # or npm ci with npm 11.6.4 already installed
```

Start two terminals in the repository:

```bash
npm run mock
# http://localhost:4000/ — GraphQL endpoint and GraphiQL
```

```bash
npm start
# http://127.0.0.1:4200/
```

The app uses `https://graphql.pokeapi.co/v1beta2` directly. No credentials, environment file, proxy, or API key is required. `npm run ng -- serve` also works with Angular's default port 4200.

The assessment specifies `https://beta.pokeapi.co/graphql/v1beta`, which was removed in November 2026. The app uses its public replacement and the renamed GraphQL fields (`pokemon`, `pokemontypes`, `pokemonstats`, `pokemonability`, etc.). This compatibility change follows the [official PokéAPI migration documentation](https://pokeapi.co/docs/graphql).

## Checks

```bash
npm run build          # production output: dist/mini-pokedex/browser/
npm test               # Angular CLI + Vitest, one deterministic run; no live network
npm run format:check   # Prettier; no separate ESLint setup
npm run test:e2e       # Playwright desktop/mobile Chromium; isolated fixtures
npm run check:mock     # live schema introspection + create/read/delete; cleans its test team
npm run check:mock-persistence # isolated restart, empty-schema and failed-write checks
npm run check:poke     # live pagination, seeded-team IDs, stats/sprites, and abilities
```

Before the first browser test run, install Chromium with `npx playwright install chromium`. The browser suite starts/stops its own production-configuration app on port **4300** and intercepts GraphQL/image traffic, so it does not need the mock server or change its data. Port 4300 must be free. `npx playwright show-report` opens the generated HTML results.

`npm run format` formats the source. Installation configures a small Git `commit-msg` hook using commitlint; messages follow `type(scope): lowercase imperative subject`, maximum 100 characters. No remote is configured.

## Structure and state

- `pokedex/services/pokemon-api.service.ts` uses typed HttpClient GraphQL operations and variables, maps API shapes to domain models, and treats HTTP-200 GraphQL errors as failures. PokéAPI requests time out after 12 seconds and retry at most twice, 500 ms apart.
- `pokedex/state/pokemon.store.ts` owns a private BehaviorSubject catalogue/cache, deduplicates in-flight requests, caches successful detail responses, and hydrates uncached team IDs independently of browse loading. Failed requests remain retryable.
- `pokedex/state/pokemon.selectors.ts` combines collection, search, type, sort, and page options. Filtering and immutable sorting happen before pagination. Shared derived streams use `shareReplay({bufferSize: 1, refCount: true})`.
- `teams/state/team.store.ts` owns teams and explicit load/mutation status. Creates add a temporary pending team; successful responses replace it. Failed creates remove that item, and failed deletes restore only the affected team. Mutations are serialized, reloads are blocked during mutations, and creates are never retried automatically.
- Standalone OnPush components use `inject()`, `input()`/`output()`, typed Reactive Forms, and modern template control flow. `toSignal()` subscriptions are created once per component and cleaned up with it. RxJS handles requests and cancellation; Signals handle local interaction, submission state, computed team totals/type counts, and selection persistence.
- `common/` holds shared request models, GraphQL error handling, and the shaped skeleton component. SCSS uses BEM names and CSS custom properties. Chart.js provides a six-axis radar chart, updates the existing instance with a 600 ms animation, respects reduced motion, and destroys the instance on close.

The detail panel is **non-modal on wide screens** (1200px and above), with room reserved so it does not cover the app. On narrower screens it uses a native modal dialog to keep background controls out of the tab order. It focuses its close button on opening, closes on Escape, and returns focus to the opener, with a row/search fallback when needed. The autocomplete supports arrows, Enter, Escape, and Tab.

## Pokédex device interface

The compact red header, cyan lens, dark featured-Pokémon hero, and pale mint screens give the catalogue and team builder a contemporary Pokédex identity. Slim borders, flat buttons, and consistent sans-serif section headings reduce visual noise. The top navigation, connection readout, and attribution footer have been removed. The hero toolbar steps through the cached national catalogue or focuses search; the plus action adds the displayed Pokémon to the shared team draft. Inspect an entry to open its stats, abilities, and animated radar.

Portraits use official PokéAPI artwork, then the cached sprite and a local fallback. Bounded pointer tilt adapts the React Bits portrait pattern to Angular. The pixel transition was removed; shaped skeletons use a restrained CSS shimmer and become static with reduced motion. Fonts and their licenses are included locally.

The [interaction follow-up](docs/ui-audit/INTERACTIONS.md) includes current desktop/mobile screenshots and verification.

[DESIGN.md](DESIGN.md) records the Behance, Dribbble, and React Bits references, tokens, and component decisions. Below 600px, compact Pokémon cards replace the table. Each card offers selection, Details, Add to team, and expandable six-stat bars. A mobile sort select exposes all seven stat sorts in both directions. Wider layouts retain the complete horizontally scrollable table.

The [flow and loading follow-up](docs/ui-audit/POLISH.md) addresses the critique: Add to draft from details, draft restoration, guarded deletion, pinned mobile names, compact hardware, readable helper text, viewport-positioned suggestions, and shaped skeletons throughout. Chart.js loads when the wide-screen hero enters the viewport or details open. Both charts update with selection; chart download failures offer reload while exact stats remain available.

## Selection, team slots and type coverage

Selecting a row or card updates the featured entry; View details opens the drawer explicitly. Loaded artwork fades in over 200 ms, a single scanner sweep marks selection, and stat bars/results use short transitions. All motion respects reduced motion. Images keep reserved dimensions, async decoding, lazy sprite loading, and bounded fallbacks.

Angular CDK 21.2.14 supplies connected drag lists and touch hold behavior. Drag a catalogue entry/card into team slots to copy it; drag a selected member's handle to reorder. Original catalogue arrays remain unchanged. Duplicate/full/busy drops are rejected. Move earlier/later buttons and Alt+ArrowUp/Down on a focused slot provide keyboard equivalents, keep focus after reordering, and announce the new position. Draft order persists and is sent to the server unchanged.

Coverage summaries appear for both the selected saved team and the draft. Offensive strengths count members whose native types can hit a target type super effectively; defensive weaknesses count members taking more than normal damage after multiplying both defensive types, including immunities. They use a bundled snapshot of [PokéAPI's type efficacy data](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/type_efficacy.csv), interpreted using the [official damage-relation documentation](https://pokeapi.co/docs/v2#types). This avoids extra runtime requests. These are standard type matchups, not a battle simulator: moves, abilities, held items, and Terastallization are excluded. Unknown/special types are explicitly excluded.

## Fetching and pagination tradeoff

The catalogue is fetched in **100-record API pages**, using the aggregate count and at most **two catalogue requests at once**. There is no generation or ID cutoff; alternate forms returned by the API are included. Only `front_default` is requested from the sprite JSON to reduce payload size; missing or failed sprites use a local fallback.

The table reserves space and shows progress until the catalogue is complete. Search, type filtering, all seven sortable stat columns, and page sizes 10/25/50 then operate on that full cached collection. This avoids misleading results based on only the visible page, at the cost of a longer first load. Completed pages survive failures in memory; Retry fetches missing pages. A browser reload clears this cache. PokéAPI documents a limit of 100 GraphQL requests per hour per IP; repeated reloads can exhaust that allowance, while searches within the completed cache make no extra requests.

Both name searches use `debounceTime(300) → distinctUntilChanged() → switchMap(...)`. Autocomplete shows at most ten matching, unselected Pokémon. Detail and search streams catch errors inside their switch, so errors do not terminate future searches or Retry. Team-name uniqueness validation normalizes whitespace, compares names case-insensitively across **all trainers' teams**, debounces for 300 ms, and completes. Unavailable team data blocks saving and exposes Retry.

## Mock data and persistence

`mock/db.cjs` contains all supplied trainers and teams. Ash (trainer ID `"1"`) is the default; his two seeded teams are shown. Misty's team remains in the mock and participates in name validation. Trainer management is outside scope. The clipped avatar URL is replaced with an empty value; the interface uses initials.

The working mock dependency is pinned to **json-graphql-server 2.4.0**. The CommonJS `.cjs` seed works explicitly with the project configuration. Live introspection verified:

```graphql
createTeam(trainer_id: ID!, name: String!, pokemon_ids: [Int]!, created_at: String!): Team
removeTeam(id: ID!): Team
```

Team queries use 100-record pages because the generated `allTeams` resolver defaults to 25. `npm run mock` runs the pinned json-graphql-server through a small disk-persistence launcher. Successful mutations write `mock/data.local.json` atomically before the response finishes. Creates and deletes survive app and server restarts. Failed disk writes restore the prior in-memory data and fail the request so the optimistic UI rolls back. The generated schema is inferred from the supplied seed before loading saved records, so deleting every team does not remove fields on restart. Local data and migration backups are ignored by Git. On first start the file is seeded from `mock/db.cjs`; to reset deliberately, stop the mock, remove the local data file, and restart. A malformed file fails startup instead of silently erasing data. `POKEDEX_DATA_FILE` and `POKEDEX_MOCK_PORT` allow isolated checks. The selected team ID and unfinished team name/member draft are stored in localStorage. The shared typed draft form is the single source of truth for picker and detail additions. Valid stored IDs hydrate independently; failures show Retry and block saving until members load. Successful saving clears the draft; failed saving preserves it. Delete uses explicit confirmation before its existing optimistic flow. Restoration waits for teams, ignores invalid IDs, handles deletion, and tolerates unavailable storage. Optimistic deletes do not overwrite the saved selection before their outcome is known.

## Manual recovery checklist

1. With both servers running, browse/search, try a nonsense search, filter by type, toggle each stat sort, and change pages/sizes. Confirm the result counts and page reset.
2. Select rows/cards quickly: the hero and its artwork update without forcing the drawer open. Open View details, then check latest abilities/radar, Escape and focus return. On phones expand all six stats and use the Sort Pokémon control.
3. Enter a duplicate team name with different case/spacing. Add/remove Pokémon using keyboard autocomplete; verify empty teams, duplicates, and more than six cannot be saved.
4. In browser DevTools, throttle and block the PokéAPI URL during a fresh load and when opening uncached details. To test autocomplete failure, reload with the catalogue unavailable before typing. Wait for bounded retries to finish; each affected view should show an error rather than “No results.” Unblock it and use Retry without changing the input/selection. A completed cache should remain searchable offline.
5. Stop the mock, reload teams, then restart it and use Retry. Enter a name before recovery; it should be revalidated when teams load.
6. After teams load, stop the mock and save/delete a team. Confirm immediate pending/removal, rollback, visible failure feedback, and retained form choices. Restart the mock and retry. Restarting preserves saved changes. Use DevTools request blocking to exercise several successful mutations followed by a failed one.
7. Select a team and reload the app. Delete the selected team successfully and check the fallback selection. Repeat with a failed delete; the original selection should remain. Disable localStorage and check that the app still works.

## Verification and limits

See [verification notes](docs/verification.md) for commands and observed results. The `v1beta2` endpoint was verified live without authentication: paginated catalogue data, types, six stats, sprites, all 12 default-trainer seed IDs, and English ability descriptions passed. All 53 unit/DOM tests use mocked network access, including migration response shapes, full form/create/delete recovery, and stale responses. The [UI/UX audit](docs/ui-audit/README.md) includes before/after screenshots and 40 passing Playwright checks across desktop and mobile Chromium. Axe found no AA-rule violations in the tested states. Real-device, screen-reader, cross-browser, and actual disconnected/throttled checks remain manual. The application does not substitute fixture data during an API outage.

With more time: extend the browser suite to Firefox/WebKit, test with assistive technologies and actual phones, measure low-end device performance, and, if catalogue size grows substantially, move global querying/pagination to the API. For a real multi-user backend, enforce uniqueness server-side and reconcile ambiguous mutation timeouts before resubmission. These requested interactions are kept within the existing feature structure.
