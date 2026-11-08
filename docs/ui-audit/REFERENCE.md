# Reference dashboard implementation

Implemented on 8 November 2026 using the user's supplied premium Pokédex dashboard image as the composition reference.

## Changes

- A dark featured-entry hero gives artwork more space, groups height/weight/base total, and shows an animated teal radar with exact stat labels on wide screens.
- A compact toolbar under the hero places search and previous/next entry controls next to their context. View details and Add to draft are direct actions. The floating D-pad and decorative hinge are removed.
- The table uses larger rows, aligned numeric columns, clean abbreviated headers, and a soft red active-entry state that stays synchronized with the hero. Expanded state still reflects whether details are open.
- Saved squads have larger sprites, actual squad counts, and an explicit green Selected badge. Saved squads, overview, and the typed team form occupy separate panels.
- Red primary actions, mint surfaces, consistent spacing, typography, rounded controls, and thin dividers unify the page. Existing errors, skeletons, draft persistence, optimistic rollback, keyboard interaction, and complete catalogue remain available.

On phones, artwork and actions remain visible while measurements and the full radar are accessible in details. The hero radar is deferred until its wide-screen viewport is visible. Both radar locations reuse the existing Chart.js component and its update/cleanup behavior; no runtime dependency was added.

The real app starts with its first available Pokémon and displays actual teams. Charizard screenshots demonstrate navigating to entry #0006; mock squads are not changed to match the illustration. Search and every stat sort still operate on the complete cached catalogue before pagination.

## Screenshots

Actual Chromium captures use isolated fixtures. Charizard artwork is an upstream PokéAPI asset added only to the browser fixture set; no screenshot data is imported into production.

| State          | Desktop                                                                    | Mobile                                                                    |
| -------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Charizard hero | [Screenshot](screenshots/reference-desktop-chromium-hero-charizard.png)    | [Screenshot](screenshots/reference-mobile-chromium-hero-charizard.png)    |
| Initial browse | [Screenshot](screenshots/reference-desktop-chromium-home.png)              | [Screenshot](screenshots/reference-mobile-chromium-home.png)              |
| Suggestions    | [Screenshot](screenshots/reference-desktop-chromium-autocomplete.png)      | [Screenshot](screenshots/reference-mobile-chromium-autocomplete.png)      |
| Details        | [Screenshot](screenshots/reference-desktop-chromium-details.png)           | [Screenshot](screenshots/reference-mobile-chromium-details.png)           |
| Abilities      | [Screenshot](screenshots/reference-desktop-chromium-details-abilities.png) | [Screenshot](screenshots/reference-mobile-chromium-details-abilities.png) |
| Loading        | [Screenshot](screenshots/reference-desktop-chromium-loading.png)           | [Screenshot](screenshots/reference-mobile-chromium-loading.png)           |
| Empty          | [Screenshot](screenshots/reference-desktop-chromium-empty.png)             | [Screenshot](screenshots/reference-mobile-chromium-empty.png)             |
| Error / Retry  | [Screenshot](screenshots/reference-desktop-chromium-error.png)             | [Screenshot](screenshots/reference-mobile-chromium-error.png)             |

## Verification

`npm test`: 50 tests passed across 16 files, including the shared radar's value labels, animation, instance reuse, and cleanup. `AUDIT_CAPTURE=reference npm run test:e2e`: 34 desktop/mobile Chromium checks passed, including accessibility scans, layout at 320px/200% text, hero selection, pinned identity, visible suggestions, create/delete rollback, draft persistence, skeletons, and unchanged-input Retry. `npm run build`, `npm run format:check`, `npx tsc --project e2e/tsconfig.json`, and `git diff --check` passed. Production output stays within the existing budgets at approximately 348 kB initial / 91 kB estimated transfer; the shared chart remains a deferred chunk.

Real touch devices, screen readers, Firefox/WebKit, and low-end frame rate remain unverified. The source image guides visual hierarchy; it is not embedded as page content.
