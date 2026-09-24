# Homepage translations — 24 September 2026

Prepared locally; not deployed in this task.

The activity cards, destination carousel descriptions/tags and eight service features rendered English constants directly. They now use the existing editable common/copy resources. Added German and French translations for all four activity cards, eight destination descriptions, region tags and feature labels. Long feature labels wrap instead of truncating. Place names and images are unchanged.

Added faithful German/French translations of the five publicly featured review texts and their titles. The original English reviews, names, ratings and database records are unchanged. These translations also render on the reviews page and matching package reviews. Translated the full-review link and airport-welcome heading/image alt text. Translation lookup is keyed to the original text, so edited or new review text falls back to its original until a matching translation is supplied; it cannot inherit an outdated translation based only on a reused review ID.

Existing translation entries can be edited in Admin → Languages & SEO → interface content → common → copy. Adding new source text to this dictionary remains a development task. No automatic translation service, schema changes or live review edits were used.

Production build and functional TypeScript check passed (existing unused-variable checks disabled). `frontend/scripts/test-home-translations.cjs` passed EN/DE/FR activity, destination, all eight service features and testimonial checks with mocked API data, including 375px French layout, unchanged reviewer name and no horizontal overflow/runtime errors. External images/API delivery are outside this local test. Build retains the existing large-chunk warning.
