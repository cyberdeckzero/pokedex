# Pokédex visual system

## Direction

A contemporary handheld Pokédex resting on a dark field desk. A compact red header, cyan optical lens, indicator lights, central hinge, and pale mint displays establish the Pokémon identity. Data remains the main interface; decorative hardware never impersonates a working button.

The scene is a Pokémon fan comparing entries on a laptop or phone, in normal indoor light. Pale mint screens provide readable data surfaces, while the red header and dark directional controls carry the physical character.

## References

- [Behance — Pokédex Electronic Device & UI Concept, Ilia Lushnikov](https://www.behance.net/gallery/196406557/Pokdex-Electronic-Device-UI-Concept): device-oriented reference discovered in research; the full case study was access-restricted.
- [Behance — Pokedex UI Study](https://www.behance.net/gallery/146710797/Pokedex-Ui-Study): inspected project preview; prominent Pokémon illustrations, compact entry information, and type-specific color.
- [Dribbble — Pokémon / Pokédex Website Redesign Concept, AC1design](https://dribbble.com/shots/15128634-Pokemon-Pokedex-Website-Redesign-Concept): desktop Pokédex information layout and muted display colors.
- [Dribbble — Mobile Pokédex App Design Exploration, Sulis Triyono](https://dribbble.com/shots/16833947-Mobile-Pokedex-App-Design-Exploration): compact entry hierarchy and readable mobile presentation.
- [React Bits — Tilted Card](https://reactbits.dev/components/tilted-card): bounded pointer tilt and layered portrait depth.
- React Bits Pixel Transition was explored in the initial design; the pixel overlay was subsequently removed to avoid distracting loading flashes.

The portrait interactions are original Angular implementations of these patterns. No React runtime, copied commercial asset, or animation dependency is required. Reference artwork is not redistributed in the application.

## Tokens

- Enclosure: `#cf304b`; enclosure outline: `#8c2339`.
- Display: `#f7faf7`; secondary display: `#eaf1eb`; display ink: `#183b32`.
- Bezel: `#202a2b`; desk: `#142822`.
- Lens: `#45c8ed`; indicator amber: `#f2cb54`; primary action: `#22563d`.
- Shared variables live in `src/styles.scss`; semantic status colors remain distinct from type colors.

## Typography

- Chakra Petch 600 for device branding.
- IBM Plex Sans 400/600 for section headings, controls, labels, descriptions, and feedback.
- IBM Plex Mono 400 for catalogue numbers, stats, and small device readouts.
- Fonts are served locally under `public/assets/fonts/` with their OFL licenses. System fallbacks keep the app readable if font loading fails.

## Components

- The device shell uses a slim outline and a compact red header. The removed navigation, connection readout, and attribution footer stay absent.
- Screens use a single subtle border, 12px corners, and pale mint content surfaces. Dark material is reserved for directional controls.
- Flat buttons use restrained hover/press feedback, visible focus, and sufficiently large hit areas. Primary actions use dark green with white text.
- Type badges retain their recognizable colors with dark, contrasting text.
- The catalogue retains the complete stat table, accessible sort buttons, and client pagination. Its screen scrolls horizontally on narrow displays.
- Team entries are roster rows; the builder and autocomplete share the display/control vocabulary.
- The detail drawer repeats the enclosure, screen, portrait, and radar materials. It reserves space on wide screens and becomes a native modal below 1200px.
- Form controls share a font-size token; touch controls target 44px, with 16px input/select text. The device search control focuses the catalogue search on every viewport.
- Muted display ink is `#4b6255`; opacity is not used to fade informative text.

## Motion and accessibility

Portrait tilt is limited to five degrees and is enabled only for a mouse pointer without reduced-motion preference. Content-shaped skeletons replace spinner-only and pixel-flash states. Shimmer uses a 1.6-second CSS transform loop with a static reduced-motion alternative. Loading, empty, and error remain distinct. Buttons respond in 120–180 ms. The chart retains its 600 ms data animation and respects reduced motion.

All original loading/empty/error/Retry/success states, keyboard interaction, form feedback, drawer Escape handling, and focus return remain required. Every focusable control performs a real action. Decorative lenses, screws, vents, and hinges are hidden from assistive technology.

The mobile scanner is compact so search and initial rows are visible sooner. Its 22px SVG icons retain 44px controls; plus adds the current entry to the team draft. Meaningful helper text uses at least 14px. Horizontal table scrolling pins the name/number column, and autocomplete uses a positioned native popover that can open above the input.
