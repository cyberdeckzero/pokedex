# Pokédex device UI overhaul

**Goal:** Replace the dashboard presentation with a cohesive, functional Pokédex device interface while preserving the assessment's Angular behavior.

1. Research concrete Behance/Dribbble references and React Bits interaction patterns. Record the chosen visual system and source links in DESIGN.md.
2. Add a tested Angular portrait display with pointer tilt, a selection-triggered pixel transition, and image fallbacks. Add tested device navigation using the existing Pokémon cache.
3. Rebuild the outer device shell and restyle every existing component: catalogue, pagination, badges, team list, builder, autocomplete, detail drawer, and radar chart. Preserve every async state and accessible control.
4. Verify production build, all unit/DOM tests, formatting, contrast, and source consistency. Use browser QA if the browser host is available. Update README/verification notes and commit only task files.

No framework migration, React runtime, new backend, authentication, or unrelated feature is planned. Existing changes in angular.json belong to the user and are preserved.
