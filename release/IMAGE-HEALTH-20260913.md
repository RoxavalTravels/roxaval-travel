# Image delivery and website health — 13 September 2026

The recent deployment left 82 public assets with restrictive permissions. Apache returned HTTP 403 for those images. Their permissions were corrected to 0644 on the live frontend; no database photos were replaced and no private files were changed.

The published “Sri Lanka Discovery Tour - 15 Days” record (ID 30) has an empty hero image and gallery. A neutral branded placeholder for package cards and detail pages is implemented and built locally but is NOT deployed: automatic approval review rejected the full frontend deployment as broader than the health-check request. The real package photo must still be uploaded in the admin editor. Live changes in this task are limited to the successful public-asset permission repair.

Checks:

- All 438 public language URLs passed HTTP 200, canonical, hreflang, structured-data and sitemap checks.
- 424 distinct image URLs were checked from frontend assets and live public catalog responses. All failed HTTP checks were on external hosts; none were on the Roxaval frontend.
- 114 external URLs could not be confirmed: 83 Wikimedia URLs returned rate-limit responses (429), 27 Google-hosted URLs returned 403, three Booking.com image URLs returned 404, and one JoinUp image request failed at the network level. A rate-limit response does not prove an image has been deleted.
- Browser checks found no JavaScript runtime errors on the EN/DE/FR home pages, English tour listing, about and contact pages. This is a public-site health check, not a payment or authenticated-admin transaction test.

See `IMAGE-REVIEW-20260913.csv` for catalog records referencing the external URLs. For durable fixes, upload the original authorized photos to the site's image storage using the admin editors. Do not replace hotel or destination photos with unrelated images merely to remove a broken-image indicator.

Future deployment: keep backup permissions private, reset `umask 022` before extracting public frontend files, and verify image responses as well as HTML and JavaScript.
