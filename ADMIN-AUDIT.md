# Admin bug fixes — 7 September 2026

Implemented and verified locally against the Laravel backend. Nothing was deployed to HostGator and no production records were modified.

## Fixes

- Gallery uploads use PHP's `images[]` multipart array format. The API also accepts a single file from the older frontend. This addresses the client's “images field must be an array” error.
- Hotel edits preserve existing room-type IDs, keeping quotation room references intact. Invalid room references roll back the entire hotel update.
- Catalog and package updates save parent records and related data in a transaction. Deleting referenced catalog records produces a useful error instead of a database exception.
- Clearing a package discount, transfer vehicle, or activity map coordinates persists the cleared value.
- Package itinerary days have safe empty translated-text defaults.
- Quotations save the selected hotel option as the primary stay and reject room types belonging to another hotel. Clearing the itinerary hotel list removes old associations.
- Quotation PDF generation handles translated notes and includes the selected hotels, rooms, room counts, and meal plans.
- The quotation accommodation summary does not merge stays across missing nights or changes in room count.
- Vouchers honor the selected meal plan, separate stays when room details change, and calculate the nightly rate per room consistently. Editing notes preserves the original total rather than recalculating it from a rounded rate.
- Failed voucher regeneration rolls back database changes, keeping previous vouchers active. Each generated PDF receives a unique filename to preserve history.
- Voucher edits validate room counts, rates, and meal plans. Failed edits remain open in the frontend.
- Repeating booking confirmation does not increment customer totals twice. Finalized payments cannot be rejected or verified again; repeated verification is idempotent. Receipt replacement checks customer ownership and payment status.
- Reviews retain their booking reference, allowing duplicate-review prevention to work.
- Route registration supports repeated application initialization in tests. Search uses the database grammar for translated JSON fields. The travel-style migration supports SQLite tests while retaining its MySQL path.

## Verification

`backend-php`: 9 passing PHPUnit tests, 219 assertions, using an isolated SQLite in-memory database and test JWT secret. Email and Cloudinary are mocked; quotation and voucher PDFs are rendered by the actual PDF service.

Covered operations:

| Area | Exercised locally |
| --- | --- |
| Hotels, packages, vehicles, guides, transfers, activities, blogs | Create, fetch, full update, status update, admin list, delete, missing-record response |
| Destinations and attractions | Create, search, list, update, delete |
| Hotel gallery | Single and multiple image uploads; non-image rejection |
| Hotel rooms | ID preservation; invalid reference rollback; removal |
| Customers | Create, fetch, edit profile/notes, list, disable/enable, delete unused customer, block deletion with history |
| Inquiries | Create, list, assign admin, change priority, save/revise draft, send quotation, translated detail response |
| Quotations | Selected hotel persistence, room reference preservation, invalid selection rollback, actual PDF generation |
| Bookings and vouchers | Package and custom bookings; confirmation; repeat confirmation; voucher generation, update, list, regeneration, history, deletion; upload-failure rollback; room/meal/gap grouping |
| Payments and reviews | Payment submission and verification; repeat-verification protection; review submission, duplicate rejection, moderation, featuring, deletion |
| Other admin pages | Contact inquiry lifecycle; settings read/update; birthday configuration and lists; notifications list/mark-all-read; admin profile read/update; document/payment/review lists; dashboard and dated reports |
| Permissions | Customer denied admin catalog creation |

Frontend production build: passed. Output: `frontend/dist-admin-fixes/`, configured for `https://api.roxavaltravels.com/api/v1`.

Functional TypeScript check passed with `--noUnusedLocals false --noUnusedParameters false`. The default strict check still reports existing unused imports; these were not removed across unrelated files.

## Limits and deployment

This is local API integration testing and frontend compilation, not a claim that every possible input or browser interaction is verified. No automated browser tool was available. HostGator's PHP upload limits, deployed MySQL behavior, real Cloudinary uploads/downloads, SMTP delivery, and live browser flows remain unverified. Custom inquiries have no delete action in the existing UI/API; none was added.

The frontend build includes the workspace's pre-existing changes as well as these fixes. Preserve the deployed `.htaccess` and server configuration when releasing it. Backend application changes are in:

```text
app/Http/Controllers/Api/Concerns/CrudFactory.php
app/Http/Controllers/Api/HotelController.php
app/Http/Controllers/Api/HotelVoucherController.php
app/Http/Controllers/Api/PaymentController.php
app/Http/Controllers/Api/ReviewController.php
app/Http/Controllers/Api/TourPackageController.php
app/Http/Controllers/Api/UploadController.php
app/Services/BookingService.php
app/Services/CustomTourRequestService.php
app/Services/DocumentService.php
app/Services/HotelVoucherService.php
app/Services/PaymentService.php
app/Support/ApiFeatures.php
routes/api.php
```

No new production database migration is required for these fixes if the deployed database already has this workspace's existing migrations. The modified travel-style migration only adds SQLite compatibility; do not rerun old production migrations for this audit. Keep production credentials and uploaded files intact.
