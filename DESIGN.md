# Pokédex visual system

## Direction

A contemporary Pokédex workspace inspired by the supplied premium dashboard reference. A compact red header, cyan optical lens, dark featured-entry display, and pale mint workspace establish the Pokémon identity. Data remains the main interface; decorative hardware never impersonates a working button.

The scene is a Pokémon fan comparing entries on a laptop or phone, in normal indoor light. The dark green hero gives the selected Pokémon the strongest visual weight. Light catalogue and team panels keep dense comparisons readable. A compact toolbar places search and previous/next entry controls directly beneath the hero.

## References

The user-supplied “Premium Pokédex team builder dashboard.png” is the current composition reference: dark artwork hero, red actions, spacious stats table, and a distinct squad sidebar. UI data always comes from the actual selected Pokémon and loaded teams.

- [Behance — Pokédex Electronic Device & UI Concept, Ilia Lushnikov](https://www.behance.net/gallery/196406557/Pokdex-Electronic-Device-UI-Concept): device-oriented reference discovered in research; the full case study was access-restricted.
- [Behance — Pokedex UI Study](https://www.behance.net/gallery/146710797/Pokedex-Ui-Study): inspected project preview; prominent Pokémon illustrations, compact entry information, and type-specific color.
- [Dribbble — Pokémon / Pokédex Website Redesign Concept, AC1design](https://dribbble.com/shots/15128634-Pokemon-Pokedex-Website-Redesign-Concept): desktop Pokédex information layout and muted display colors.
- [Dribbble — Mobile Pokédex App Design Exploration, Sulis Triyono](https://dribbble.com/shots/16833947-Mobile-Pokedex-App-Design-Exploration): compact entry hierarchy and readable mobile presentation.
- [React Bits — Tilted Card](https://reactbits.dev/components/tilted-card): bounded pointer tilt and layered portrait depth.
- React Bits Pixel Transition was explored in the initial design; the pixel overlay was subsequently removed to avoid distracting loading flashes.

The portrait interactions are original Angular implementations of these patterns. No React runtime, copied commercial asset, or animation dependency is required. Reference artwork is not redistributed in the application.

## Tokens

- Enclosure: `#c51f3e`; enclosure outline: `#9f1833`.
- Display: `#fcfdfb`; secondary display: `#f0f4f1`; display ink: `#183b32`.
- Bezel: `#202a2b`; desk: `#142822`.
- Lens: `#45c8ed`; indicator amber: `#f2cb54`; primary action: `#b91d3c`.
- Shared variables live in `src/styles.scss`; semantic status colors remain distinct from type colors.

## Typography

- Chakra Petch 600 for device branding.
- IBM Plex Sans 400/600 for section headings, controls, labels, descriptions, and feedback.
- IBM Plex Mono 400 for catalogue numbers, stats, and small device readouts.
- Fonts are served locally under `public/assets/fonts/` with their OFL licenses. System fallbacks keep the app readable if font loading fails.

## Components

- The device shell uses a slim outline and a compact red header. The removed navigation, connection readout, and attribution footer stay absent.
- Screens use a single subtle border, 12px corners, and pale mint content surfaces. The featured-entry hero uses `#0c3028`, with pale technical labels and a teal radar chart.
- Flat buttons use restrained hover/press feedback, visible focus, and sufficiently large hit areas. Primary actions use Pokédex red with white text; active squads use a green outline, mint fill, and explicit Selected badge.
- Type badges retain their recognizable colors with dark, contrasting text.
- The desktop catalogue retains its complete stat table, accessible sort buttons, and client pagination. Below 600px, compact cards expose all six stats in an expandable section, with a separate sort select. Selecting the name opens details and updates the hero.
- Row selection opens the detail panel and updates the featured entry. Hero previous/next controls preview entries without opening it.
- Saved squads, the active-team overview, and the builder occupy three distinct panels. Saved-team and overview regions reserve height during reloads and scroll for overflow, keeping the builder stable. Larger sprites strengthen squad identity; the builder and autocomplete share the control vocabulary.
- The detail drawer repeats the enclosure, screen, portrait, and radar materials. It reserves space on wide screens and becomes a native modal below 1200px.
- Form controls share a font-size token; touch controls target 44px, with 16px input/select text. The device search control focuses the catalogue search on every viewport.
- Muted display ink is `#4b6255`; opacity is not used to fade informative text.

## Motion and accessibility

A keyed artwork area gives each selection a single 450 ms scanner sweep. Loaded images fade/settle over 200 ms. New catalogue entries fade in over 150 ms and stat bars animate for 300 ms; no transition delays input. Portrait tilt is limited to five degrees and is enabled only for a mouse pointer without reduced-motion preference. Content-shaped skeletons replace spinner-only and pixel-flash states. Shimmer uses a 1.6-second CSS transform loop with a static reduced-motion alternative. Loading, empty, and error remain distinct. Buttons respond in 120–180 ms. The chart retains its 600 ms data animation and respects reduced motion.

All original loading/empty/error/Retry/success states, keyboard interaction, form feedback, drawer Escape handling, and focus return remain required. Every focusable control performs a real action. Decorative lenses, screws, vents, and hinges are hidden from assistive technology.

The mobile hero keeps artwork, identity, and primary actions visible, with 44px search and previous/next controls below. Measurements and the second radar remain available in details. On wide screens the hero shows all three measurements and a radar with exact values. Plus adds the current entry to the shared draft. Meaningful helper text uses at least 14px. Horizontal table scrolling pins the name/number column, and autocomplete uses a positioned native popover that can open above the input.

## Team interactions

Drag-to-copy entries into the draft and drag handles to reorder members use Angular CDK. Every reorder has labeled keyboard buttons and a focused-slot Alt+Arrow alternative, with focus restored after DOM movement. Drop targets reject duplicates, full drafts, and busy mutations. Offensive/defensive summaries use counted type chips with explanatory labels and explicit calculation limits. Saved teams persist through the existing mock server's disk-backed launcher.
