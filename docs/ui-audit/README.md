# Pokédex UI/UX audit

See the [contemporary refresh](MODERN.md) for the latest visual system, screenshots, and verification.

The [8 November flow and loading follow-up](POLISH.md) records the subsequent critique fixes and current screenshots. This page preserves the initial audit.

Reviewed on **7 November 2026**. Scope: the complete single-page application, including the catalogue, scanner, details/abilities/radar, team roster and overview, team form, autocomplete, and recovery states.

## Verdict

**Good for the assessment after the fixes below.** The device theme is cohesive, the main actions work with keyboard and pointer input, and errors provide a way forward. This is an engineering and heuristic review, not a WCAG certification or a substitute for research with users.

The review used screenshot inspection, Playwright interaction checks, axe accessibility scans, source inspection, and current W3C/APG guidance. A separate live browser load also rendered the real **1,351-record** catalogue without an account. Repeatable tests and committed screenshots use isolated fixtures, so they neither consume the public API allowance nor modify the user's mock-server teams.

## Review score

Scores are reviewer judgments out of four; browser evidence and limitations matter more than the total.

| Dimension            |    Before |     After | Assessment                                                                                                                             |
| -------------------- | --------: | --------: | -------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility        |         2 |         3 | Confirmed contrast/ARIA failures fixed; keyboard checks pass. Manual assistive-technology coverage remains necessary.                  |
| Performance          |         3 |         3 | Production bundle stays within existing budgets; no added runtime library. Low-end device performance was not measured.                |
| Responsive behavior  |         2 |         3 | Tested down to 320px, with 200% text, long names, touch-sized controls, and adaptive details. Actual devices remain untested.          |
| Theme/conventions    |         3 |         3 | BEM, shared color/control tokens, native form controls, and consistent states. Decorative hardware/type colors retain explicit values. |
| Visual anti-patterns |         4 |         4 | The physical enclosure and controls follow the requested Pokédex identity; no unrelated dashboard decoration was introduced.           |
| **Total**            | **14/20** | **16/20** | **Good; manual validation still required.**                                                                                            |

The static design detector reported one warning about the header's thick bottom border with rounded corners. It is the requested enclosure seam, not an accidental accent on a content card; it was retained deliberately.

## Findings and fixes

**P0: 0. P1: 3. P2: 8. All eleven findings below were addressed.** P1 means a major accessibility/usability problem; P2 means friction with a workaround. The table distinguishes standards requirements from usability recommendations.

| Priority | Finding and user impact                                                                                                   | Location and resolution                                                                                                                                                                                                                                                                                                        | Evidence / guidance                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Selected-Pokémon container used an accessible name on a generic div without a suitable role.                              | [Team builder](../../src/app/teams/components/team-builder/team-builder.component.html): give the collection `role="group"`.                                                                                                                                                                                                   | axe `aria-prohibited-attr`; WCAG 4.1.2.                                                                                                                                                                                         |
| P1       | Selected-team metadata and empty-slot labels failed normal-text contrast.                                                 | [Theme tokens](../../src/styles.scss) and [builder styles](../../src/app/teams/components/team-builder/team-builder.component.scss): darken muted ink and remove faded text opacity.                                                                                                                                           | axe measured approximately 4.45:1 and 3.57:1 before. Selected-team metadata is now approximately 5.03:1; empty-slot text is 6.05:1. See [contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). |
| P1       | Arrow keys could select a suggestion below the visible dropdown area.                                                     | [Pokémon picker](../../src/app/teams/components/pokemon-picker/pokemon-picker.component.ts): scroll the active option into view while retaining input focus.                                                                                                                                                                   | Reproduced with ten suggestions on both viewports. [APG's combobox example](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/) explicitly discusses active-option visibility.              |
| P2       | Retry could remove the focused dropdown button and close the recovered suggestions.                                       | [Pokémon picker](../../src/app/teams/components/pokemon-picker/pokemon-picker.component.ts): focus the input before retrying; keep the popup open.                                                                                                                                                                             | Same-query failure/Retry tests now recover without changing the text.                                                                                                                                                           |
| P2       | Details lost the opener's focus context and could cover background controls.                                              | [App](../../src/app/app.component.ts) and [detail component](../../src/app/pokedex/components/pokemon-detail/pokemon-detail.component.ts): remember the opener, reserve drawer space on wide screens, use native modality below 1200px, close the native dialog before restoring focus, and clean up the media-query listener. | Keyboard checks, resize checks, and [dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Wide layouts retain selection without closing details.                                                           |
| P2       | Several mobile controls were 27–34px high and form text was cramped.                                                      | Shared controls plus scanner, table, roster, and builder styles: use 44px targets for the checked touch controls, 16px inputs/selects, wrapping navigation, and a consistent control-font token.                                                                                                                               | Measured in Playwright. **44px is a chosen usability target**; [WCAG 2.5.8's AA minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) is 24px with exceptions.                                         |
| P2       | A permitted, unbroken 30-character team name widened the page.                                                            | [Team panel styles](../../src/app/teams/components/team-panel/team-panel.component.scss): allow selection buttons and summary headings to shrink and wrap.                                                                                                                                                                     | A failing 320px case now passes at 320/390/768/1440px. [Reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) permits a scrolling data table, not unrelated page overflow.                                  |
| P2       | Team-name requirements were not visible before interaction.                                                               | [Team builder](../../src/app/teams/components/team-builder/team-builder.component.html): visibly mark the field required and expose length/required attributes alongside the typed form validators.                                                                                                                            | Form feedback remains conditional on interaction; invalid/pending submissions remain disabled.                                                                                                                                  |
| P2       | A portrait could look blank while loading; exhausting all image fallbacks could leave its loading indicator indefinitely. | [Portrait](../../src/app/pokedex/components/pokemon-portrait/pokemon-portrait.component.ts): reserve space, announce loading, retain the artwork/sprite/local fallbacks, and offer Retry image if every source fails.                                                                                                          | Unit tests cover load completion, selection reset, all fallback failures, and a fresh request after Retry.                                                                                                                      |
| P2       | Narrow-screen stat columns extended offscreen without an instruction.                                                     | [Catalogue](../../src/app/pokedex/components/pokemon-table/pokemon-table.component.html): add a visible sideways-scroll cue and describe the focusable table region.                                                                                                                                                           | The full six-stat table remains available without widening the page.                                                                                                                                                            |
| P2       | Mobile navigation hid Browse, forcing a long return scroll from teams.                                                    | [App header](../../src/app/app.component.html) and [styles](../../src/app/app.component.scss): keep both Browse and Your teams available; wrap the bar at enlarged text sizes.                                                                                                                                                 | The touch flow checks that Browse brings the catalogue search back into view.                                                                                                                                                   |

## Screenshots

These are actual Playwright captures, not design mockups or generated images. Home/catalogue captures are full-page; detail captures use the viewport so the fixed drawer is represented accurately. The additional abilities capture scrolls **inside** that drawer. Fixture catalogue size is 56; the production app remains uncapped.

| State                 | Desktop before                                                 | Desktop after                                                | Mobile before                                                 | Mobile after                                                |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------- |
| Catalogue / device    | [Before](screenshots/before-desktop-chromium-home.png)         | [After](screenshots/after-desktop-chromium-home.png)         | [Before](screenshots/before-mobile-chromium-home.png)         | [After](screenshots/after-mobile-chromium-home.png)         |
| Autocomplete          | [Before](screenshots/before-desktop-chromium-autocomplete.png) | [After](screenshots/after-desktop-chromium-autocomplete.png) | [Before](screenshots/before-mobile-chromium-autocomplete.png) | [After](screenshots/after-mobile-chromium-autocomplete.png) |
| Details / radar       | [Before](screenshots/before-desktop-chromium-details.png)      | [After](screenshots/after-desktop-chromium-details.png)      | [Before](screenshots/before-mobile-chromium-details.png)      | [After](screenshots/after-mobile-chromium-details.png)      |
| No matches            | [Before](screenshots/before-desktop-chromium-empty.png)        | [After](screenshots/after-desktop-chromium-empty.png)        | [Before](screenshots/before-mobile-chromium-empty.png)        | [After](screenshots/after-mobile-chromium-empty.png)        |
| Loading               | [Before](screenshots/before-desktop-chromium-loading.png)      | [After](screenshots/after-desktop-chromium-loading.png)      | [Before](screenshots/before-mobile-chromium-loading.png)      | [After](screenshots/after-mobile-chromium-loading.png)      |
| Network error / Retry | [Before](screenshots/before-desktop-chromium-error.png)        | [After](screenshots/after-desktop-chromium-error.png)        | [Before](screenshots/before-mobile-chromium-error.png)        | [After](screenshots/after-mobile-chromium-error.png)        |

Abilities: [desktop](screenshots/after-desktop-chromium-details-abilities.png), [mobile](screenshots/after-mobile-chromium-details-abilities.png).

## Verification and reproduction

```bash
npx playwright install chromium
npm run test:e2e
npx playwright show-report
```

The suite starts and stops its own Angular **production configuration** server on `127.0.0.1:4300`. Port 4300 must be free. Existing app/mock servers on 4200/4000 are not stopped or modified. GraphQL and remote image traffic are intercepted using committed fixtures; the mock server is not required for this suite. Screenshots and traces for failures are retained in ignored `test-results/`; the HTML report is in ignored `playwright-report/`.

Coverage includes search/no matches/reset, global filtering/sorting and page sizes, keyboard suggestions/removal, same-input Retry, team-name uniqueness, create/delete rollback and retry, pending temporary teams, selection persistence, independent team hydration recovery, modal/focus behavior, long team names, reduced-motion layout checks, real Chart.js canvas updates/reuse, and error-versus-empty states. Axe scans resting, empty-autocomplete, successful-autocomplete, and detail states on both projects. Runtime browser exceptions are checked throughout.

The fixtures contain real catalogue/stat records captured from public PokéAPI on the review date, 16 upstream Pokémon image files, and deliberately separate browser-test teams. Unsupported fixture images use the application's generic fallback. Ability text in the browser fixture is deterministic sample content. Fixtures are never imported into production application code.

The final executed command results are also recorded in [verification.md](../verification.md).

## What is working well

- The red enclosure, cyan lens, green displays, and physical controls form a consistent identity across the site.
- Native inputs/selects and clear labels keep the themed interface familiar.
- Loading, empty, error, pending, and successful states stay distinct; useful form values survive failures.
- The full catalogue is filtered/sorted before client pagination, while team hydration works independently.
- Keyboard users can operate search, suggestions, sorting, teams, and details. Reduced-motion preferences remain supported.

The review considered a keyboard-dependent visitor, a distracted phone user, and a returning user comparing stats. Their main risks were invisible options/focus, small controls and long return scrolls, and losing work during recovery. The fixes address those paths without adding a new framework or unrelated features.

## Remaining manual checks

- NVDA/VoiceOver, real touch devices, Firefox, Safari/WebKit, forced-colors mode, and operating-system text settings.
- Real disconnected/throttled connectivity and ambiguous mutation timeouts. Browser tests simulate transport and GraphQL failures; they do not disconnect the machine.
- Low-end-device timing, actual animation smoothness, and user evaluation of the dense device-style metadata. The tests establish chart reuse/pixel changes, not a frame-rate benchmark.
- The first complete catalogue load still costs multiple bounded requests. This assessment tradeoff is documented in the main README; repeated live reloads can reach the provider's allowance.

Recommended follow-up: run those manual checks, address confirmed findings, then repeat the Playwright suite. Automated scans alone cannot establish full accessibility, as the [Playwright accessibility documentation](https://playwright.dev/docs/accessibility-testing) explains.

## Research used

- [Nielsen Norman Group: usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) — feedback, control, consistency, visible choices, and recoverable errors informed the review.
- [W3C contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), and [unobscured focus](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
- [WAI-ARIA combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) and [modal-dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) patterns.
- [Playwright screenshot](https://playwright.dev/docs/screenshots) and [accessibility](https://playwright.dev/docs/accessibility-testing) documentation — screenshot capture and axe integration.
