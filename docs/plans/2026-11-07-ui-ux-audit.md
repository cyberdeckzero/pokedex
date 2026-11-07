# UI/UX audit and recovery pass

Target: the existing Angular Pokédex at `http://127.0.0.1:4200/`.

1. Review current design conventions and authoritative accessibility/usability guidance.
2. Install and run a small Playwright/axe suite, using isolated GraphQL and image fixtures. Capture before screenshots at desktop and mobile sizes and reproduce issues before changing application code.
3. Fix confirmed accessibility, keyboard, responsive readability, and recovery issues while keeping the device theme and Angular architecture.
4. Capture after screenshots, rerun the browser suite, unit tests, build, formatting, and TypeScript checks. Record findings, evidence, standards, and remaining limits in `docs/ui-audit/README.md`.

Existing development/mock servers and user changes in `angular.json` are preserved. Browser tests must not mutate the running mock's teams or require live public API access.
