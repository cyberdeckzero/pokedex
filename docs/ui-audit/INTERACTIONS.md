# Interactive Pokédex follow-up

Completed on 8 November 2026 following the requested selection, team building, motion, mobile, and persistence improvements.

- Row/card selection updates the hero directly, with a subtle artwork fade and one scanner sweep. Details are opened explicitly. Selection is exposed as pressed state and announced politely.
- Angular CDK provides drag-to-copy from the catalogue and drag handles for draft reordering. Duplicate, full and busy drops are blocked. Keyboard move buttons and Alt+Arrow shortcuts provide equivalents; focus follows the moved slot. Ordered drafts persist and save in that order.
- Saved-team and draft summaries show offensive type coverage and defensive weaknesses, correctly combining dual types and immunities. Descriptions state that moves, abilities, items and Terastallization are not calculated.
- Mobile cards replace the desktop table below 600px, with expandable six-stat bars, all seven sorts in both directions, direct Details/Add actions, and dedicated card skeletons. Both layouts use the same selectors and full cached collection.
- Short result transitions, animated stat bars, async image decoding, lazy sprites, reserved image dimensions, reduced motion, and existing error/Retry states remain supported.
- The pinned json-graphql-server now saves atomic snapshots to an ignored local file and survives restarts. Schema generation remains stable with no saved teams; write failures roll back and surface errors. Four existing teams and two trainers were preserved during migration.

## Current captures

Actual Playwright captures use isolated catalogue/image/team fixtures.

| View                       | Evidence                                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Desktop hero/catalogue     | [Screenshot](screenshots/interactive-desktop-chromium-hero-charizard.png)                                                  |
| Mobile cards               | [Viewport screenshot](screenshots/interactive-mobile-chromium-mobile-cards.png)                                            |
| Ordered draft and coverage | [Desktop](screenshots/interactive-desktop-chromium-draft.png), [mobile](screenshots/interactive-mobile-chromium-draft.png) |
| Mobile complete page       | [Screenshot](screenshots/interactive-mobile-chromium-home.png)                                                             |
| Mobile card loading        | [Screenshot](screenshots/interactive-mobile-chromium-loading.png)                                                          |
| Error / Retry              | [Desktop](screenshots/interactive-desktop-chromium-error.png), [mobile](screenshots/interactive-mobile-chromium-error.png) |

## Verification

53 unit tests across 17 files; 40 full browser checks across desktop/mobile Chromium; production build, formatting, e2e TypeScript and whitespace checks passed. Focused final runs cover selection/accessibility, duplicate drag rejection, focus/order persistence, and screenshot refresh. The production initial bundle is approximately 431 kB / 109 kB estimated transfer, within unchanged budgets; CDK adds a purposeful interaction dependency, and Chart.js remains deferred.

`npm run check:mock-persistence` uses a temporary file and port to verify restart persistence, deletion, schema generation after deleting every team, and rollback on disk write failure. The running mock's actual GraphQL mutations and cleanup also passed. Current browser fixtures are automatic for every test.

Reproduce with `npm test`, `npm run test:e2e`, and `npm run check:mock-persistence`. The first browser run needs `npx playwright install chromium`. For screenshots, use `AUDIT_CAPTURE=interactive npm run test:e2e`.

Real-device touch dragging, screen readers, Firefox/WebKit, actual disconnected/throttled requests, and low-end animation frame rate remain unverified. Persistence is a local development file, not a multi-user production database; run one mock process per file. Coverage uses standard type matchups and explicitly excludes battle-specific effects. See the [README](../../README.md) for exact behavior, sources, startup and reset instructions.
