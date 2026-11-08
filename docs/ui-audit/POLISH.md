# Flow and loading follow-up

Implemented on 8 November 2026 following the Impeccable critique and the requested typography, search-icon, and skeleton improvements. The red handheld Pokédex theme and full six-stat table remain intact.

## Changes

| Finding                                                            | Resolution                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inspecting a Pokémon required a second search to build a team      | Details and the scanner's plus control add directly to the same typed draft form used by the builder. Duplicate/full/pending additions are disabled. A live status links to the draft.                                                                                                                                |
| Successful deletion was too easy to trigger                        | Explicit Delete opens an inline confirmation. Cancel restores focus; confirmation enters the existing optimistic mutation and rollback flow.                                                                                                                                                                          |
| Refresh lost unfinished work                                       | The draft name and member IDs persist safely in localStorage. Restored members hydrate independently, with skeletons and Retry. Failed hydration blocks saving; successful saving clears the draft.                                                                                                                   |
| Horizontal comparison lost Pokémon identity                        | The name/number column stays pinned while all stat columns remain horizontally scrollable.                                                                                                                                                                                                                            |
| The mobile hardware pushed search too far down                     | A compact profile and horizontal controls make search visible in the initial 390×844 viewport. Measurements remain available in details.                                                                                                                                                                              |
| Tiny labels and redundant readouts made the interface noisy        | Removed repetitive subtitles, serial/marketing text, and internal-link arrows. Meaningful helper text is at least 14px. Search and navigation use clear 22px SVG icons within 44px controls.                                                                                                                          |
| Loading flashes and spinners did not resemble the incoming content | Shared shaped skeletons cover catalogue rows, profile/portrait, abilities, radar, teams, overview, restored members, and autocomplete. The table reserves its loaded height. Shimmer uses a CSS transform and becomes static with reduced motion. Errors retain actionable feedback instead of animated placeholders. |
| Initial autocomplete options could open outside the viewport       | A native popover positions above or below the input within available space. Keyboard selection scrolls options into view; Escape and Retry retain sensible focus.                                                                                                                                                     |

Chart.js is deferred until details request the radar. A failed library download offers Reload page while exact stats stay visible. This reduced the initial production bundle from approximately 489 kB to 353 kB; the chart is a separate approximately 160 kB chunk. No runtime dependency was added.

## Evidence

Actual Playwright captures use isolated catalogue, image, and team fixtures. They do not modify the running mock server. Reduced-motion screenshots establish appearance, not animation frame rate.

| State         | Desktop                                                                 | Mobile                                                                 |
| ------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Browse        | [Screenshot](screenshots/polish-desktop-chromium-home.png)              | [Screenshot](screenshots/polish-mobile-chromium-home.png)              |
| Loading       | [Screenshot](screenshots/polish-desktop-chromium-loading.png)           | [Screenshot](screenshots/polish-mobile-chromium-loading.png)           |
| Suggestions   | [Screenshot](screenshots/polish-desktop-chromium-autocomplete.png)      | [Screenshot](screenshots/polish-mobile-chromium-autocomplete.png)      |
| Details       | [Screenshot](screenshots/polish-desktop-chromium-details.png)           | [Screenshot](screenshots/polish-mobile-chromium-details.png)           |
| Abilities     | [Screenshot](screenshots/polish-desktop-chromium-details-abilities.png) | [Screenshot](screenshots/polish-mobile-chromium-details-abilities.png) |
| Empty search  | [Screenshot](screenshots/polish-desktop-chromium-empty.png)             | [Screenshot](screenshots/polish-mobile-chromium-empty.png)             |
| Error / Retry | [Screenshot](screenshots/polish-desktop-chromium-error.png)             | [Screenshot](screenshots/polish-mobile-chromium-error.png)             |

The [verification record](../verification.md) records executed checks. Focused coverage includes direct additions, persisted drafts, invalid/unavailable storage, failed member hydration, delete confirmation/cancellation, optimistic recovery, pinned names, initial suggestion visibility, reserved loading height, and static reduced-motion skeletons. Existing search/sort/pagination, accessibility scans, focus, 320px layout, and 200% text checks remain in the browser suite.

## Manual follow-up

Check real touch devices and screen readers, Firefox/WebKit, actual disconnected/throttled requests, and low-end hardware animation performance. Automated Chromium checks do not certify accessibility or measure frame rate. No new review score is assigned without repeating the full heuristic review.
