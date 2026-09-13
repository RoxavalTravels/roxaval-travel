# Website and admin audit — 13 September 2026

Provisional health rating: **7/10**. This is an engineering assessment of observed functionality and release readiness, not a Lighthouse score or a guarantee that every possible interaction works.

## Confirmed bugs fixed locally

- Dashboard request failures now show an error and working retry button instead of an endless loading screen.
- Dashboard catalog counters use authenticated all-record listings, including draft/inactive entries.
- New booking loads all customer and quotation pages instead of stopping at 200 customers/50 requests.
- Changing the booking customer clears the previous quotation selection. Late responses for the previous customer cannot replace the current list.
- Admin custom-tour creation loads complete customer, destination, activity and assignee choices.
- Failed package-option, custom-tour-option, settings and profile requests show errors instead of unhandled rejections or endless spinners.
- Account Settings opens the existing editable profile/preferences page instead of a Coming Soon screen.

## Evidence

| Area | Result and scope |
| --- | --- |
| Laravel integration suite | 14 tests / 288 assertions passed against isolated SQLite. Includes catalog create/read/update/delete, room identity preservation, transaction rollback, customer lifecycle, enquiries, quotations, PDF generation, bookings, vouchers, payments, reviews, settings, permissions and multilingual SEO. |
| Admin browser screens | 29 list/create screens rendered without JavaScript exceptions using mocked API responses. Includes catalogs, customers, enquiries, bookings, payments, reviews, contact, documents, notifications, settings, profile and birthdays. This does not claim every button on every populated detail screen was clicked. |
| Targeted admin browser cases | Dashboard failure/retry and all-record counters; customer 201 and quotation 101 selection; delayed previous-customer response protection passed. |
| Existing browser regression suite | Language selection/switching, direct advertising links, blocked storage, responsive popup, pagination, German enquiry submission with unchanged enum values and admin SEO save passed using mocked API data. |
| Build | Production Vite build and functional TypeScript check passed. Existing unused-variable checks remain disabled for the functional check. |
| Live API access control | Anonymous customer, booking, payment, reporting and admin hotel-list requests returned 401. The settings endpoint is public by existing design. |
| Live public health | Earlier checks in this session: all 438 public URLs passed HTTP/canonical/hreflang/sitemap checks. Public asset permissions were repaired. No production CRUD writes, payments, email sends or deletions were performed. |

## Limits affecting the score

- External image audit: 114 of 424 URLs could not be confirmed. Most were Wikimedia rate limits, with other hosts returning forbidden/missing images. These are still content/delivery risks.
- One published package has no hero/gallery photo; seven hotels had no images in the earlier database audit.
- SMTP delivery and real Cloudinary uploads are mocked in integration tests. Real email delivery, payment reconciliation and authenticated production admin workflows have not been end-to-end verified.
- SQLite integration tests cannot prove every MySQL-specific behavior. Attempts to compare production service hashes were interrupted by SSH connection closure, so exact production/tested source parity is not asserted.
- Tests establish the scenarios listed above, not exhaustive coverage of every button, data combination, browser, authorization role or external integration.

## Deployment status

**Deployed on 13 September 2026 after explicit user approval.** The exact tested build was `frontend-admin-health-20260913.zip`, including the empty-package-image placeholder. No backend files or database records were modified by the deployment.

Complete pre-deployment backup: `/home2/zlwoctte/roxaval-admin-health-20260913/frontend-before.tar.gz` (113 MB, private 0600 permissions). Gzip integrity, archive listing, and a full `tar --compare` against the still-current frontend passed before deployment. Backup SHA-256: `371b11ef24b456d03ab0df67f0f53c5f0e22f23a48a88cb8e4fe19772082c98d`.

Release SHA-256 verified on the server: `205cbf1f9aab23c093b03ad5cf1685a4ac9ab69eddd1a66c87b1fecdc8442858`. Extraction used `umask 022`, retained old hashed assets, and set the new public entry files and assets to 0644. The existing hosting rules were preserved. Rollback is restoration of the complete frontend backup; no database/backend rollback is needed.

The host temporarily refused SSH with “Not allowed at this time”; deployment succeeded after a cooldown. Backup download attempts also failed, so no local downloaded copy is claimed. Full readability and consistency of the server backup were verified before deployment.

Post-deployment checks passed: the exact tested JavaScript bundle is served; new JS/CSS, representative photos, placeholder SVG and sitemap return HTTP 200. EN/DE/FR home pages (including a 375px mobile viewport), the English tour listing and admin login rendered with no broken images or JavaScript runtime errors in the checks. Admin login required-field validation, password visibility toggle and forgot-password link worked; unauthenticated dashboard navigation redirected to admin login. No real credentials were submitted, so successful authenticated admin login is not asserted. Existing external-image and live-integration limitations above remain; no new issue was found in these post-deployment flows.

GitHub authentication was unresolved in the preceding tasks; local commits must not be mistaken for a completed push.
