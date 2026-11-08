# Pokédex flow and loading improvements

Apply all priorities and minor findings from the persisted critique, plus the user's requested typography, D-pad icon, and skeleton work. Preserve Angular/RxJS architecture and the required complete stats table.

1. Connect inspection to a shared typed team draft; restore unfinished drafts safely; confirm explicit deletion while retaining optimistic mutation/rollback.
2. Add a small shared, reduced-motion-aware skeleton component and shape loading placeholders to each view: catalogue, profile/image, abilities, team roster/overview, and suggestions. Remove jarring pixel loading animation and redundant small readouts.
3. Prioritize search/results on mobile with a compact scanner, make hardware icons clear, pin row names during horizontal comparison, expand stat labels accessibly, improve actual helper text size, and position suggestions within the viewport.
4. Add regression tests for changed behavior, then run unit/browser checks, production build, formatting, and TypeScript checks. Inspect fresh screenshots, update documentation, and commit task files only. Preserve angular.json and prior critique artifacts.
