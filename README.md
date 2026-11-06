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

The app uses `https://beta.pokeapi.co/graphql/v1beta` directly. No credentials, environment file, proxy, or API key is required. `npm run ng -- serve` also works with Angular's default port 4200.

## Checks

```bash
npm run build          # production output: dist/mini-pokedex/browser/
npm test               # Angular CLI + Vitest, one deterministic run; no live network
npm run format:check   # Prettier; no separate ESLint setup
npm run check:mock     # live schema introspection + create/read/delete; cleans its test team
npm run check:poke     # independently probes catalogue fields, sprites, count, and abilities
```

`npm run format` formats the source. Installation configures a small Git `commit-msg` hook using commitlint; messages follow `type(scope): lowercase imperative subject`, maximum 100 characters. No remote is configured.

## Structure and state

- `pokedex/services/pokemon-api.service.ts` uses typed HttpClient GraphQL operations and variables, maps API shapes to domain models, and treats HTTP-200 GraphQL errors as failures. PokéAPI requests time out after 12 seconds and retry at most twice, 500 ms apart.
- `pokedex/state/pokemon.store.ts` owns a private BehaviorSubject catalogue/cache, deduplicates in-flight requests, caches successful detail responses, and hydrates uncached team IDs independently of browse loading. Failed requests remain retryable.
- `pokedex/state/pokemon.selectors.ts` combines collection, search, type, sort, and page options. Filtering and immutable sorting happen before pagination. Shared derived streams use `shareReplay({bufferSize: 1, refCount: true})`.
- `teams/state/team.store.ts` owns teams and explicit load/mutation status. Creates add a temporary pending team; successful responses replace it. Failed creates remove that item, and failed deletes restore only the affected team. Mutations are serialized, reloads are blocked during mutations, and creates are never retried automatically.
- Standalone OnPush components use `inject()`, `input()`/`output()`, typed Reactive Forms, and modern template control flow. `toSignal()` subscriptions are created once per component and cleaned up with it. RxJS handles requests and cancellation; Signals handle local interaction, submission state, computed team totals/type counts, and selection persistence.
- `common/` holds only shared request models and GraphQL error handling. SCSS uses BEM names and CSS custom properties. Chart.js provides a six-axis radar chart, updates the existing instance with a 600 ms animation, respects reduced motion, and destroys the instance on close.

The detail panel is a **non-modal** drawer, so another table row can be selected while it stays open. It focuses its close button on opening, closes on Escape, and returns focus to the selected row (or search if that row is no longer visible). The autocomplete supports arrows, Enter, Escape, and Tab.

## Fetching and pagination tradeoff

The catalogue is fetched in **100-record API pages**, using the aggregate count and at most **two catalogue requests at once**. There is no generation or ID cutoff; alternate forms returned by the API are included. Only `front_default` is requested from the sprite JSON to reduce payload size; missing or failed sprites use a local fallback.

The table reserves space and shows progress until the catalogue is complete. Search, type filtering, all seven sortable stat columns, and page sizes 10/25/50 then operate on that full cached collection. This avoids misleading results based on only the visible page, at the cost of a longer first load. Completed pages survive failures in memory; Retry fetches missing pages. A browser reload clears this cache.

Both name searches use `debounceTime(300) → distinctUntilChanged() → switchMap(...)`. Autocomplete shows at most ten matching, unselected Pokémon. Detail and search streams catch errors inside their switch, so errors do not terminate future searches or Retry. Team-name uniqueness validation normalizes whitespace, compares names case-insensitively across **all trainers' teams**, debounces for 300 ms, and completes. Unavailable team data blocks saving and exposes Retry.

## Mock data and persistence

`mock/db.cjs` contains all supplied trainers and teams. Ash (trainer ID `"1"`) is the default; his two seeded teams are shown. Misty's team remains in the mock and participates in name validation. Trainer management is outside scope. The clipped avatar URL is replaced with an empty value; the interface uses initials.

The working mock dependency is pinned to **json-graphql-server 2.4.0**. The CommonJS `.cjs` seed works explicitly with the project configuration. Live introspection verified:

```graphql
createTeam(trainer_id: ID!, name: String!, pokemon_ids: [Int]!, created_at: String!): Team
removeTeam(id: ID!): Team
```

Team queries use 100-record pages because the generated `allTeams` resolver defaults to 25. The mock stores changes **in memory only**: app reloads retain them while the server runs; restarting the mock restores the seed. The selected team ID alone is stored in localStorage. Restoration waits for teams, ignores invalid IDs, handles deletion, and tolerates unavailable storage. Optimistic deletes do not overwrite the saved selection before their outcome is known.

## Manual recovery checklist

1. With both servers running, browse/search, try a nonsense search, filter by type, toggle each stat sort, and change pages/sizes. Confirm the result counts and page reset.
2. Select rows quickly with details open; check that the name, abilities, and animated radar reflect the latest selection. Test keyboard opening, Escape, focus return, and horizontal table scrolling on a narrow screen.
3. Enter a duplicate team name with different case/spacing. Add/remove Pokémon using keyboard autocomplete; verify empty teams, duplicates, and more than six cannot be saved.
4. In browser DevTools, throttle and block the PokéAPI URL during a fresh load and when opening uncached details. To test autocomplete failure, reload with the catalogue unavailable before typing. Wait for bounded retries to finish; each affected view should show an error rather than “No results.” Unblock it and use Retry without changing the input/selection. A completed cache should remain searchable offline.
5. Stop the mock, reload teams, then restart it and use Retry. Enter a name before recovery; it should be revalidated when teams load.
6. After teams load, stop the mock and save/delete a team. Confirm immediate pending/removal, rollback, visible failure feedback, and retained form choices. Restart the mock and retry. Restarting resets all mock changes, so use DevTools request blocking instead when testing several successful mutations followed by a failed one.
7. Select a team and reload the app. Delete the selected team successfully and check the fallback selection. Repeat with a failed delete; the original selection should remain. Disable localStorage and check that the app still works.

## Verification and limits

See [verification notes](docs/verification.md) for commands and observed results. The required public endpoint returned **HTTP 522** during verification. Its live successful responses and browser visual/offline checks could not be verified here; the browser automation host was unavailable. Network access in all unit/DOM tests is mocked, including full form/create/delete recovery and stale-response tests. The application does not substitute fixture data during a live API outage.

With more time: run browser accessibility/responsive checks against a healthy API; add a small browser regression suite; and, if catalogue size grows substantially, move global querying/pagination to the API. For a real multi-user backend, enforce uniqueness server-side and reconcile ambiguous mutation timeouts before resubmission. No optional bonus or unrelated feature is included.
