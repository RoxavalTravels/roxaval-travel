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

**This audit's code fixes are not live.** The reviewable build is `frontend-admin-health-20260913.zip`; it also includes the previously prepared empty-package-image placeholder. No backend source changes or database migration are needed for this batch.

The earlier automatic approval review rejected full frontend replacement under the health-check scope. Explicit deployment approval is pending. After approval, preserve the current live frontend outside the document root, extract with `umask 022`, retain old hashed assets, verify static files are readable (0644), and retest public images and admin login. Do not change private backup or credential permissions.

GitHub authentication was unresolved in the preceding tasks; local commits must not be mistaken for a completed push.
