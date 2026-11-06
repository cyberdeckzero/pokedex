# Mini Pokédex implementation plan

**Goal:** Deliver the complete Angular assessment with recoverable async states and a small, explainable architecture.
**Architecture:** HttpClient services map GraphQL responses; feature BehaviorSubject stores hold shared collections and request state. RxJS selectors drive the table; component Signals handle local interaction and computed team summaries.
**Stack:** Angular 21, TypeScript 5.9, RxJS 7, Reactive Forms, SCSS, Chart.js, Angular CLI Vitest, pinned json-graphql-server.

1. Initialize Angular and conventional commit enforcement. Verify seed module and inspect the generated GraphQL schema with live introspection. Commit tooling and seed data.
2. Write focused failing service/store/selector/validator tests. Implement typed GraphQL transport, paginated catalogue cache, detail lookup and hydration, selectors, optimistic team operations, and completing async uniqueness validation. Run tests and commit the data layer.
3. Build the table and sliding detail panel with all four async states, current-parameter Retry, accessible sorting, pagination, and animated radar chart. Build the typed team form, keyboard autocomplete, team summaries, and restored/persisted selection. Run build/tests and commit the interface.
4. Exercise both live endpoints independently and main browser flows, including failure/recovery. Fix observed defects with regression tests where meaningful. Document exact commands, cache tradeoffs, persistence, and remaining limits in README. Run final production build/tests and commit verified documentation/fixes.

## Decisions

- Load the entire catalogue in pages of 100, with at most two catalogue requests in flight. Publish cached progress but keep table results in loading state until complete, so global filtering and sorting are honest. Retry resumes missing pages.
- Fetch uncached team members in a separate ID batch, without waiting for catalogue completion.
- Default trainer: Ash (ID 1); display his teams and validate against all existing team names.
- Serialize mutations and block reload during a mutation; roll back only the affected entity. Never retry creates automatically.
- Keep the submission local; no remote creation or push is authorized.
