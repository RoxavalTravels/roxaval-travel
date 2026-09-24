# Homepage translations — 24 September 2026

Deployed to cPanel on 24 September 2026 after explicit user authorization. Implementation pushed to client GitHub main as `1172240`.

The activity cards, destination carousel descriptions/tags and eight service features rendered English constants directly. They now use the existing editable common/copy resources. Added German and French translations for all four activity cards, eight destination descriptions, region tags and feature labels. Long feature labels wrap instead of truncating. Place names and images are unchanged.

Added faithful German/French translations of the five publicly featured review texts and their titles. The original English reviews, names, ratings and database records are unchanged. These translations also render on the reviews page and matching package reviews. Translated the full-review link and airport-welcome heading/image alt text. Translation lookup is keyed to the original text, so edited or new review text falls back to its original until a matching translation is supplied; it cannot inherit an outdated translation based only on a reused review ID.

Existing translation entries can be edited in Admin → Languages & SEO → interface content → common → copy. Adding new source text to this dictionary remains a development task. No automatic translation service, schema changes or live review edits were used.

Production build and functional TypeScript check passed (existing unused-variable checks disabled). `frontend/scripts/test-home-translations.cjs` passed EN/DE/FR activity, destination, all eight service features and testimonial checks with mocked API data, including 375px French layout, unchanged reviewer name and no horizontal overflow/runtime errors. External images/API delivery are outside this local test. Build retains the existing large-chunk warning.

Deployment: private complete frontend backup `/home2/zlwoctte/roxaval-translations-20260924/frontend-before.tar.gz`, SHA-256 `fe02356829a7f9ede22f8f773640f009f95b7bfaac8416f53c3eae7456d25efa`. Gzip integrity and full tar comparison passed before replacement. Release archive `frontend-translations-20260924.tar.gz`, SHA-256 `546d000e493620223adcf83ed1418d313efea60e67d18482db23b3593e9e3f74`, verified on server. Only assets and index.html replaced; old hashed assets retained, public permissions corrected, hosting rules/images/backend/database untouched. Active entry `index-BVEQPP_q.js`. Rollback restores the frontend backup; no schema rollback needed.

Live Chromium checks passed: EN/DE/FR home pages, German/French activity/feature/destination/testimonial translations, English tour listing, admin login controls and unauthenticated dashboard redirect. German checked at 375px. No broken rendered images or runtime errors in those flows; entry JS/CSS, representative photos, placeholder and sitemap returned HTTP 200. No production form submissions or authenticated admin edits.
