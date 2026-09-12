# Roxaval multilingual release

This release targets the existing React frontend and **Laravel backend-php** installation. The older Node backend is not used by this release. No live server or live database has been changed from this workspace.

## Preserve and deploy

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

- First unprefixed home visit shows the branded, keyboard-accessible language dialog. Preference uses local storage with a safe fallback when storage is blocked.
- Only `/` redirects according to saved preference. A direct language URL always wins, including Google Ads links. Language changes preserve query parameters and fragments.
- Existing unprefixed English page URLs return 301 to the equivalent `/en/` URL through the PHP gateway. The original English static meta titles/descriptions were retained.
- Changing an editorial slug saves its previous URL as a permanent redirect. Catalog title edits no longer regenerate catalog slugs. Do not rename internal catalog slugs directly in the database, as translation identities reference them.
- Each language page has a self-canonical and reciprocal EN/DE/FR alternates, with English as `x-default`. The sitemap excludes private and unpublished catalog records. Unknown pages receive HTTP 404 through the gateway. Account/admin pages remain non-indexable.
- Google guidance followed: [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions) and [multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).

## Validation and rollback

Local validation passed: production Vite build; TypeScript functional check with existing unused-variable warnings disabled; 11 Laravel scenarios / 262 assertions covering permissions, separate language fields, URL collisions, redirect history, metadata escaping, sitemap entries, draft exclusion, stable catalog identity and existing admin CRUD; Chromium checks with mocked API data for language preference, blocked storage, direct ads links, equivalent package slugs, H1/alt/SEO fields, navigation, desktop/mobile switching and 375/768/1440px modal layouts. A German enquiry was submitted with unchanged API enum values, and an admin SEO edit was saved. Live Apache/cPanel configuration and real catalog data still need the deployment checks above.

Rollback: restore the previous frontend files and `.htaccess`, then the previous Laravel source. Leave the additive translation tables in place to retain editorial work; they do not affect the old application. Restore the database backup only if a separate data rollback is actually needed. Never run `migrate:fresh` on production.
