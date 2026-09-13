# Roxaval multilingual release

This release targets the existing React frontend and **Laravel backend-php** installation. The older Node backend is not used by this release. Deployed to production on 12 September 2026.

The later SEO release supersedes the frontend/backend patch files where they overlap. See [SEO-DEPLOYMENT.md](SEO-DEPLOYMENT.md) for current archives, the main-host sitemap, metadata improvements and the 438-page live audit.

## Production deployment record

- Frontend: `/home2/zlwoctte/www.roxavaltravels.com` (the domain's verified document root).
- Laravel: `/home2/zlwoctte/public_html/website_91fe39e6/roxaval-backend-php`.
- Full pre-deployment frontend and backend archives and MySQL dump are preserved outside the public roots in `/home2/zlwoctte/roxaval-release-20260912`, with restricted permissions. Existing frontend assets, uploads, vendor and server credentials were preserved.
- Live database authentication passed; the earlier MySQL 1045 log entry was no longer reproducible. No credential changes were needed. The additive translation migration and `optimize:clear` completed using `/opt/cpanel/ea-php83/root/usr/bin/php`.
- Merged the PHP gateway routing into the existing frontend `.htaccess`, retaining its cache rules and setting the verified Laravel path.
- Live HTTP checks passed for EN/DE/FR home pages, the German tours listing, admin login, translations API and sitemap. Legacy `/packages` returns 301 to `/en/sri-lanka-tours/`; an unknown page returns 404. Initial HTML contains translated metadata, one self-canonical and four language alternates; admin login is noindex.
- Live Chromium checks passed for first-visit popup, saved preference, a French direct advertising URL overriding a stored German preference, switching to the equivalent German listing with the query string retained, and the 375px mobile popup. No browser runtime errors occurred in these flows.
- Live testing found and corrected metadata replacement matching an example `<title>` inside an HTML comment, which had hidden the entry script from the browser. The controller now removes comments before replacing metadata; a DOM regression check verifies that the module script and application root remain actual elements. The local Laravel suite passed with 14 tests / 274 assertions after this correction.
- Existing production catalog translations are retained. Client review of German/French copy and configuration of the actual 14-day package's editorial slugs remain content-management tasks before launching ads to those example URLs. Authenticated admin edits and real enquiry submissions were tested locally, not submitted against production.

## Preserve and deploy

**Public asset permissions:** use `umask 077` only while creating private backups. Set `umask 022` before extracting into the public frontend root. Public image/CSS/JS/font files must be readable by Apache (0644), and their directories traversable (0755). On 13 September, 82 public assets were repaired after restrictive permissions caused image HTTP 403 responses. Do not apply public permissions to `.env`, private backups or other credential files. After each deployment, check image HTTP responses and fully rendered home/tour pages, not only page HTML.

Follow-up release on 12 September: `frontend-followup-20260912.zip` supersedes the original frontend archive. Deploy migration `2026_09_12_000002_expand_custom_tour_travel_styles.php` before that frontend. This expands the existing travel-style enum without replacing saved requests. Pre-follow-up backups are `frontend-before-followup.tar.gz` and `database-before-followup.sql` in the same private server release directory.

The follow-up prompts first-time visitors on public landing pages, including language-prefixed ad URLs. Selecting a language retains the equivalent page, query parameters and fragment. Only an explicit choice stores a preference; visiting a language URL no longer overwrites it. Visitors with an existing preference see no prompt, and explicit language URLs continue to take priority. When storage is blocked, an in-memory preference supports navigation during the current page session.

Package hotel selectors and the custom-itinerary hotel picker follow every API page using the authenticated admin catalog. Package selectors mark inactive hotels. Hotel-picker filters still apply; hotels without room types are shown with an instruction to configure rooms. Custom-tour travel styles now include Romantic, Wildlife, Nature, Wellness and Scenic alongside existing Solo, Discovery and other choices.

Live hotel audit: 181 hotels (180 active, 1 inactive), 682 room types. Every hotel has an English name, destination and room types. Seven hotels have no images. This verifies record completeness for those fields, not the accuracy of rates, contact details or actual room availability. No hotel records were modified.

Follow-up local checks: production build and TypeScript check passed; Laravel 14 tests / 284 assertions passed, including saving the new styles. Chromium regression checks include first-time ad arrivals preserving the package and tracking parameters, all 181 paginated hotel options, new travel-style options, blocked storage and the existing multilingual flows.

Follow-up production verification passed on an actual catalog package: first-time German ad arrival displayed the prompt over the package, choosing English retained the equivalent package plus `gclid` and fragment, returning home used the saved English preference, and a direct French URL displayed French without a prompt or changing that saved preference. No browser runtime errors occurred. The live enum contains all 16 styles; hotel counts and room counts remain unchanged.

1. Back up the live frontend, Laravel files, existing `.htaccess`, uploads and MySQL database in cPanel, outside the public document root. Local Git source snapshots are in `backups/before-multilingual-20260912.zip` and `backups/backend-before-multilingual-20260912.zip`; these are not backups of production data or credentials.
2. Resolve the existing MySQL `1045 Access denied` error before rollout. Verify the database name, full cPanel database username, password and user assignment against the hosting control panel. Update the **server's** Laravel `.env`, then run `php artisan config:clear`. A local frontend change cannot repair those hosting credentials.
3. Extract `backend-multilingual-20260912.zip` into the Laravel application root containing `artisan`, preserving `.env`, `vendor`, storage and uploads. Run `php artisan migrate --force` and `php artisan optimize:clear` with the host's PHP 8.3+ executable. The migration only adds three translation tables; it does not alter existing catalog data.
4. Extract `frontend-multilingual-20260912.zip` into the frontend document root. Preserve existing hashed assets for visitors with cached HTML. The archive includes `multilingual.php`, which serves the compiled frontend through Laravel with localized metadata in the initial HTML.
5. Merge `multilingual.htaccess.example` into the frontend `.htaccess` **before its old SPA fallback**. Keep the host's PHP handler, HTTPS/www redirects and any API/backend exclusions. Set `ROXAVAL_BACKEND_PATH` to the real Laravel application root. The example uses the path shown in the supplied production log. The frontend document root must support PHP and have filesystem access to that Laravel installation. Do not replace unrelated hosting rules.
6. Open `/en/`, `/de/`, `/fr/`, `/admin/login` and `/api/v1/translations/pages` on the API host. Test a fresh browser at `/`, then a returning visit. Inspect **View Source** on a language page for a single canonical, translated title/description, hreflang links and Open Graph metadata. A Vite-only static host supplies client-side metadata; production must use the PHP gateway for initial HTML and HTTP 301/404 behavior.
7. Check the API host's `/sitemap.xml`; `robots.txt` already references it. Submit/recheck the sitemap in Search Console after deployment. Keep the existing canonical hostname `https://www.roxavaltravels.com`.

## Editing content

Open **Admin → Content → Languages & SEO**, also linked from Settings, at `/admin/translations`.

- Choose the page and English, Deutsch or Français. Each has independent meta title, description, slug, H1, main image alt text and social title/description. Save before changing the page/language selector, then use the preview link.
- Slugs omit the language prefix and surrounding slashes. The home slug remains empty. Duplicate/reserved slugs are rejected. Published catalog pages and drafts appear in the admin editor; only published records are exposed in public routes and the sitemap.
- Static pages, navigation, footer, buttons, forms and FAQs are editable through the interface content groups. Enquiry-wizard labels and catalog controls are under `common`, in its `copy` entries; search by the displayed text. These text edits apply throughout the selected language. Preserve interpolation tokens such as `{{days}}`, `{{name}}` and `{{count}}` when editing.
- Tour descriptions, itinerary days, destinations, activities and blog content use their existing EN/DE/FR fields in the catalog editors. Existing translations have been retained. Review live catalog records for missing translations and have the client approve German/French copy before launching ads; this workspace cannot verify or translate unseen production records. The existing English fallback remains for missing catalog translations.
- The interface editor changes existing text fields. Adding new page layouts, languages or new content sections remains a development task. Languages are centralized in frontend `i18n/routing.ts` and backend `MultilingualPages::LANGUAGES`; add resource bundles, validation options, labels and default page mappings together.

For an existing 14-day package, select its current `/packages/<slug>` identity and save these per-language slugs:

| Language | Slug |
| --- | --- |
| English | `sri-lanka-tour-14-days` |
| German | `sri-lanka-rundreise-14-tage` |
| French | `circuit-sri-lanka-14-jours` |

The language switcher then connects those exact pages. No fictitious tour or production package mapping has been created. Enter the supplied German meta title and description on the actual 14-day package.

## URL behavior

- First public-page visit shows the branded, keyboard-accessible language dialog, including direct ad landing pages. Preference uses local storage with an in-memory fallback when storage is blocked.
- Only `/` redirects according to saved preference. A direct language URL always wins, including Google Ads links. Language changes preserve query parameters and fragments.
- Existing unprefixed English page URLs return 301 to the equivalent `/en/` URL through the PHP gateway. The original English static meta titles/descriptions were retained.
- Changing an editorial slug saves its previous URL as a permanent redirect. Catalog title edits no longer regenerate catalog slugs. Do not rename internal catalog slugs directly in the database, as translation identities reference them.
- Each language page has a self-canonical and reciprocal EN/DE/FR alternates, with English as `x-default`. The sitemap excludes private and unpublished catalog records. Unknown pages receive HTTP 404 through the gateway. Account/admin pages remain non-indexable.
- Google guidance followed: [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions) and [multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).

## Validation and rollback

Local validation passed: production Vite build; TypeScript functional check with existing unused-variable warnings disabled; 11 Laravel scenarios / 262 assertions covering permissions, separate language fields, URL collisions, redirect history, metadata escaping, sitemap entries, draft exclusion, stable catalog identity and existing admin CRUD; Chromium checks with mocked API data for language preference, blocked storage, direct ads links, equivalent package slugs, H1/alt/SEO fields, navigation, desktop/mobile switching and 375/768/1440px modal layouts. A German enquiry was submitted with unchanged API enum values, and an admin SEO edit was saved. Live Apache/cPanel configuration and real catalog data still need the deployment checks above.

Rollback: restore the previous frontend files and `.htaccess`, then the previous Laravel source. Leave the additive translation tables in place to retain editorial work; they do not affect the old application. Restore the database backup only if a separate data rollback is actually needed. Never run `migrate:fresh` on production.
