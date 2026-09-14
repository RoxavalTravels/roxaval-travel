# Package and admin fixes — 14 September 2026

## Changes

- **EUR pricing:** Admin → Settings → Euro exchange rates accepts EUR per one unit of USD, GBP or LKR. German/French package detail prices, discounted prices, structured-data offers and the booking modal use the converted price. The server computes new package bookings with the same conversion and rejects a submission if its displayed price/currency changed. English keeps the source currency. Existing bookings and package base prices remain unchanged. No exchange rate has been invented or entered; an unset rate retains the original currency.
- **Package translations:** Changing the language reloads package data. Meal labels now translate Breakfast/Lunch/Dinner; daily activities are displayed using the catalog translations. A read-only public catalog check found German/French names for the eight linked activity identities returned. Eleven returned published packages use USD.
- **Reviews:** Admin → Reviews → Add package review accepts genuine feedback for a selected package. Reviews start pending and require approval before public display. Existing reviews can be assigned to packages; reviews tied to a booking cannot be moved to a different package. Package rating/count are recalculated. No production reviews were invented or submitted.
- **SEO:** Settings now directs editors to the effective per-page Languages & SEO editor instead of presenting unused global meta fields. Select the page and language, edit Meta title/description, Save translation (or Save SEO changes), and open Preview saved page. Saved interface overrides apply immediately; returning to a public tab refreshes its metadata registry. Translation API responses are not cacheable. Search engines choose their own snippets and do not update immediately after editing the website.
- **Hotels:** Package hotel checkboxes, daily hotel dropdowns, the itinerary hotel picker and the custom-tour hotel lookup sort the complete returned catalog A–Z, ignoring case and using natural numeric order. Existing selection IDs and inactive labels remain intact.

## Verification

Local Laravel integration tests: **16 tests / 331 assertions passed**, using isolated SQLite and mocked external delivery services. Covers positive/invalid rates, EN versus DE/FR prices, discounted EUR booking totals, stale-price rejection, unchanged existing bookings/base prices, pending review privacy, approval, package assignment, rating recalculation, invalid ratings and anonymous creation rejection, plus the existing CRUD and multilingual SEO suite.

Production Vite build and functional TypeScript check passed (existing unused-variable checks disabled). Chromium tests with mocked API data passed for live language changes of meals/activities/prices, 181 naturally sorted hotel checkboxes, review entry, rate saving, SEO save/preview and returning-tab refresh, existing language/ad/enquiry flows, 29 admin screens and booking selectors. The enquiry test waits for animated step transitions. No browser runtime exceptions in these checks. These tests do not submit real production bookings, reviews or emails.

## Release artifacts

- `frontend-package-fixes-20260914.zip`: SHA-256 `28c6ad475fe9ca93816575e5716ffce26c76c3441db1ebe0fb50712b99134576`
- `backend-package-fixes-20260914.zip`: SHA-256 `b8f378b3f144df132eb46a3e8286dca16aca35153786c14b336c5ec953be8e36`

The backend patch adds nullable JSON `settings.euro_rates` via migration `2026_09_14_000001_add_euro_rates_to_settings.php`. Deploy the backend patch and that specific migration with PHP 8.3 before the frontend. Preserve `.env`, vendor, storage, uploads, existing frontend assets and hosting rules. Back up the complete frontend/backend and database outside document roots first, verify archive readability and compare the frontend backup before replacement. Extract public files with `umask 022`; keep backups private.

## Deployment status

**Not deployed: hosting connection blocked the release.** Read-only SSH connected initially, but repeated SSH/SFTP transfers then closed with `Connection closed by 50.6.35.211 port 2222`. A helper transfer over SSH reached the private release directory but stopped at base64 decoding before any backup or deployment script executed. The corrected transfer and the final guarded deployment attempt were also closed by the host. No new production backup completed, no source-parity result is asserted, and no live application files or database schema were changed.

The private staging directory is `/home2/zlwoctte/roxaval-package-fixes-20260914`; its presence alone does not mean a verified backup exists. Local `backups/package-release-backup.sh`, `package-release-backup.php` and `deploy-package-fixes.sh` contain the guarded workflow. Restore hosting SSH/SFTP access before retrying it, and verify backups before replacement.

Exchange-rate configuration remains pending the client's rate. All local browser rates (such as 0.9 EUR per USD) are test fixtures only, not proposed business rates. Local backend commit: `b8498d6`; frontend implementation commit: `d67f406`. No GitHub push is claimed.

Rollback restores the prior frontend and patched backend files. The unused additive settings column can remain, retaining any configured rates; no destructive database rollback is required.
