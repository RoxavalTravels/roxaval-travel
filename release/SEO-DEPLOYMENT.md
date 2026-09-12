# Roxaval SEO release — 12 September 2026

Deployed across 438 public language URLs: 146 page identities in English, German and French. No slugs, catalog content records or administrator-written SEO were replaced.

## Changes

- Rewrote all 27 static-page default descriptions around the page's actual purpose, covering home, tours, destinations, activities, about, contact, blog, reviews and terms in all three languages.
- Catalog defaults strip HTML, normalize whitespace and shorten descriptions at word boundaries. Very short descriptions receive a relevant destination/travel fallback. Activity snippets identify the experience when source copy repeats a destination description.
- Every public page emits WebSite and WebPage/AboutPage/ContactPage JSON-LD in initial HTML. Client-side language changes use the same metadata. Existing detailed tour, destination and article schemas remain available after rendering.
- Public pages allow large image previews. Existing canonicals, reciprocal hreflang, legacy redirects and private-page noindex behavior remain in place.
- The live sitemap is available at `https://www.roxavaltravels.com/sitemap.xml`; frontend robots.txt now references it. The API-host sitemap remains available. Catalog and editorial modification timestamps populate lastmod; no artificial daily modification dates were added.
- Empty optional SEO editor values consistently fall back to defaults in server HTML and React.

## Verification

- All 438 public URLs returned HTTP 200, one self-canonical, four language alternates, matching structured data and sitemap inclusion. Sitemap contains 438 URLs, 411 with catalog modification dates.
- Final public registry: zero missing titles/descriptions/structured-data entries; zero duplicate titles or descriptions within a language.
- Live browser language switching retained one canonical and description and updated WebPage language correctly, without runtime errors.
- Production build and TypeScript check passed. Laravel: 14 tests, 288 assertions, including JSON-LD escaping and canonical/language agreement. Existing multilingual, enquiry and admin browser regression checks passed.
- Verification confirms technical coverage, not Google indexing, rankings, Rich Results eligibility or factual completeness of every catalog record. Main page content still uses React rendering; initial HTML provides metadata and structured data, not a full server-rendered article.

## Release and rollback

Use `backend-seo-20260912.zip` and `frontend-seo-20260912.zip`. Deploy backend first, then frontend, preserving existing hashed assets. No database migration is needed for this SEO release. The previous custom-tour travel-style migration remains required for the full current application.

Private server backups: `/home2/zlwoctte/roxaval-release-20260912/frontend-before-seo.tar.gz` and `backend-before-seo.tar.gz`. Restore those files to roll back this SEO release. No database restore is required.

## Owner follow-up

1. In the verified Google Search Console property, submit `https://www.roxavaltravels.com/sitemap.xml` and inspect representative EN/DE/FR URLs. Search Console access was not available in this session; submission has not been performed.
2. Review localized tour and destination content for accuracy and missing translations. Prioritize the actual tours advertised; configure their editorial landing-page slugs in Admin → Content → Languages & SEO.
3. Use Search Console impressions, queries and clicks to identify pages that need better travel information. Add original itineraries, destination advice and accurate business details; avoid invented reviews, keyword stuffing and duplicate articles.

Google does not guarantee first-place rankings. These changes improve technical clarity and metadata coverage; rankings also depend on content relevance, competition and external signals. References: [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Writing descriptions](https://developers.google.com/search/docs/appearance/snippet).
