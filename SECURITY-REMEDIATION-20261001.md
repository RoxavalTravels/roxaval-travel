# Security remediation — 1 October 2026

Work is local on `security/issue-1-itinerary-ownership` in both the root and separate Laravel repositories. **Nothing was deployed or pushed. No production database, credentials, permissions, DNS or files were changed.** Prior unrelated working-tree changes were preserved. This report supersedes the audit's "proposed only" status for the local changes below, not for production.

## Findings addressed locally

| Audit issue | Change and remaining boundary |
|---|---|
| #1 Customer itinerary IDOR | Validated customer preference allowlist; internal itinerary aliases rejected; customer reads and all three decisions check both customer and request ownership. Two-customer regression tests. No historical records repaired. |
| #2 Private documents | New PDFs/vouchers/receipts use private disk references; JSON exposes authorized download routes; ownership and staff permissions enforced. Legacy same-tenant Cloudinary reader remains temporarily. Existing public assets still require the separately approved migration/invalidation in `SECURITY-PRIVATE-FILE-MIGRATION.md`. |
| #4 Session revocation | 15-minute access tokens, durable hashed refresh sessions, atomic refresh rotation, replay revocation, password/reset/logout/account-status revocation. Logout and replay invalidate all devices. New schema migration is tested only in isolated test databases. Existing pre-release tokens will expire immediately on rollout because they lack the version claim. |
| #5 Abuse protection | Login account/IP limits, public-mail and session-action limits, per-customer AI limits, message/upload/request limits; AI preference validation and maximum 31-day draft. Authentication is ordered before customer-keyed throttling. Production must use a persistent cache and correct trusted-proxy/IP settings. |
| #6 JSON minimization | Explicit public review/comment and customer request/itinerary/booking projections. No full Customer graphs, moderation metadata, base costs, markup or internal itinerary versions. Customer-facing messages and agreed totals remain. Two customers are tested independently, including cross-account denial. |
| #7 Staff authority | Role/profile synchronization, session revocation, last-active-superadmin protection and server-side permission enforcement. Empty permission lists deny staff access to protected areas; see rollout prerequisite below. No existing staff records were changed. |
| #3 CSRF | Every unsafe API request requires an exact allowed Origin and `X-Roxaval-Request: 1`; JWT cookies use SameSite=Lax. Shared frontend JSON, multipart, refresh and retry paths updated. Full call-site inventory: `SECURITY-CSRF-CALLS.md`. No blanket bearer/missing-Origin exemption. |
| #8 Dependencies | Updated npm dependencies in all three projects and PHP dependencies. Zero reported advisories at verification. Vite 8/React Router 7 required major upgrades; build, TypeScript and browser regressions passed. Node 24.14.0 used for verification. |
| #10 Local secret hygiene | Laravel ignores `.env.*` except `.env.example`; legacy seeded password now comes from `SEED_ADMIN_PASSWORD` and is not logged. Existing Git history and production secrets/permissions were not changed. |
| #11 Public catalog access | Numeric public lookups enforce publication/active status. Authenticated staff previews require permissions. Public projections remove operational contacts/cost fields and exclude unpublished nested catalog records. |
| #12 Query/input hardening | No arbitrary model-method discovery; allowed relations/columns/operators, bounded query values, maximum 100 records per page. Catalog/settings field validation and bounded arrays/text, package nested relations, receipt and public-contact validation tightened. This is not a claim that every possible business-rule combination has been exhaustively validated. |
| #13 Receipts | Server-side detected file-type allowlist (PDF/JPEG/PNG), size limit and private storage. HTML receipt rejection tested. Malware scanning remains a hosting/integration decision. |
| #14 Payments | Transactions with booking-before-payment row locks for creation, verification and receipt replacement; finalized state rechecked while locked; totals recalculated from verified payments; notifications deferred until commit. Sequential/idempotent behavior tested. True parallel MySQL verification still required in staging. |
| #15 Headers/cookies | Application security headers cover successful and error responses; secure session-cookie production default; HTTPS HSTS. Apache merge template: `release/security-headers.htaccess.example`. CSP is a baseline framing/base/object policy, not a complete script allowlist. |
| #9, #16 Hosting controls | Read-only preflight and manual rollout instructions prepared. External MySQL restrictions, least-privilege runtime grants, scheduled/offsite backups and restore testing cannot be applied while production changes are prohibited. |

## Validation

- Full Laravel suite: **54 tests / 1,104 assertions passed**, isolated SQLite with synthetic customers. Mail/storage/AI mocked or faked where appropriate; no real messages sent.
- Production frontend build passed with Vite 8.3.1.
- Functional TypeScript check passed (`--noUnusedLocals false --noUnusedParameters false`).
- ESLint on changed frontend application files passed. Repository-wide lint **does not pass**: 384 errors, including 31 in source and the rest in other files/generated releases. These unrelated errors were not hidden by disabling lint rules. Details: local `backups/security-lint.json`.
- Mocked Chromium multilingual regression passed: language selection/switching, EUR display, meals/activities, hotel ordering, reviews and SEO persistence; no runtime exceptions.
- Real Chromium + local Laravel + isolated SQLite integration passed: admin cookie login/dashboard, settings save/reload, EN/DE/FR metadata source/Helmet and prices, full review create/approve/edit/reassign lifecycle, 201-hotel pagination/order/selection, customer email-code sign-in, EUR booking and notifications. Artifacts: `backups/package-e2e-b7KEij/result.json`. External network was blocked; email codes were captured only in a local test mailbox.
- Browser testing found an aborted-response backpressure problem in the local test proxy and an ambiguous populated review textarea label. Both were corrected. Neither involved a production change.
- Composer audit: zero advisories/abandoned packages. npm: zero vulnerabilities in frontend/root/legacy backend after upgrades. Legacy Nodemailer JSON transport and UUID CommonJS smoke checks passed without sending mail. Legacy Node's full runtime is not the production backend and has no automated integration suite here.
- Git whitespace checks passed. No claim of a production penetration test, complete browser/device coverage, or a successful MySQL concurrency/restore drill.

## Main files changed for this remediation

Laravel application:
- `app/Services/{CustomTourRequestService,PrivateFileService,DocumentService,HotelVoucherService,TokenService,AuthService,PaymentService,AiService}.php`
- `app/Support/{CustomerData,PublicCatalog,CatalogInput,StaffPermissions,ApiFeatures}.php`
- `app/Http/Middleware/{RestrictTo,VerifyBrowserRequest,SecurityHeaders}.php`
- `app/Http/Controllers/Api/{AdminController,AuthController,CustomerController,CustomTourRequestController,ReviewController,BlogCommentController,BookingController,DocumentController,PaymentController,HotelController,TourPackageController,BlogController,SettingsController,ContactController}.php` and `Concerns/CrudFactory.php`
- `app/Models/{User,CustomTourRequest,Document,Payment}.php`, `app/Providers/AppServiceProvider.php`, `bootstrap/app.php`, `routes/api.php`, `config/{filesystems,session}.php`
- `database/migrations/2026_10_01_000001_add_revocable_auth_sessions.php`, `.gitignore`, `composer.lock`, `phpunit.xml`
- New security Feature tests: ItineraryOwnership, PrivateDocument, SessionSecurity, AbuseProtection, CustomerPrivacy, StaffPermission, CsrfSecurity, CatalogSecurity, PaymentSecurity; existing fixture/test bootstrap updates.

Frontend/legacy/tooling:
- `frontend/src/lib/api.ts`, `frontend/src/components/quotation/QuotationView.tsx`, `frontend/src/admin/pages/reviews/AddReview.tsx`
- `frontend/scripts/test-package-e2e.cjs`, Laravel `tests/Browser/bootstrap.php`
- Root/frontend/backend npm manifests and lockfiles; `backend/src/utils/seed.js`
- This report, issue #1 report, private-file migration plan, CSRF inventory, Apache header example and read-only SQL preflight.

The working tree also contains pre-existing changes listed by Git; they are not all security-remediation changes and must not be blindly staged together with backups or credentials.

## Before any deployment

1. Obtain deployment approval separately. This branch is ready for review/staging, **not an unconditional production replacement**.
2. Run `release/security-readonly-preflight.sql` against a staging copy first, then report the approved read-only production results before proposing repairs. It checks itinerary associations, role/profile mismatches, empty staff permissions, legacy files and payment totals. It has **not** been run on production; no zero-count production claim is made.
3. Approve the staff permission matrix and explicitly assign existing staff their required permissions. Available values are in `StaffPermissions::ALL`; `*` grants full staff-area access but does not grant superadmin account-management privileges. Department labels alone grant nothing. Own profile remains accessible. Check dashboard/catalog dependencies for each restricted staff role in staging.
4. Configure `PRIVATE_DOCUMENT_ROOT` outside all public roots, for example `/home2/zlwoctte/roxaval-private-documents`; verify ownership/private permissions, disk space and backup coverage. New private-file operations fail closed if this production setting is absent. Follow the separate migration plan; do not delete old Cloudinary files now.
5. Back up and verify the current release/database. Apply only the new auth-session migration after checking migration status; avoid inadvertently running older pending data-cleanup migrations. Deploy matching frontend, PHP source and Composer vendor artifacts together. Expect all existing sessions to sign in again. Machine API clients must send the approved Origin/header or receive a separately reviewed authentication design.
6. Verify real MySQL concurrent payment submissions/verification and session rotation in isolated staging. Review any preflight payment-total discrepancies before using the recomputation behavior on historical records. No financial repair is included.
7. Have the host restrict remote MySQL, create/test a least-privilege runtime DB account, restrict the production `.env` after confirming PHP ownership, and configure monitored encrypted offsite backups with a restore drill. These are outstanding provider/owner actions.
8. Review/rotate the historical seeded password if used; rotate any other credentials with confirmed/suspected exposure. No history rewrite or credential rotation was performed.
9. Merge Apache headers without replacing hosting rewrites; verify HTTPS and error responses. Inventory third-party scripts and test a full CSP in report-only mode before enforcing it. Confirm persistent throttling cache and trusted proxies. Add challenge-based bot controls or document malware scanning if needed by operational risk.
10. Recheck production login, refresh/logout, all three languages, staff permissions, customer privacy, uploads/downloads, PDFs/mail and payment flows after an approved rollout. Include private files in any rollback/recovery plan; the old application cannot read `private://` references.

**Production security score is not raised:** the prior provisional 4/10 describes the still-unmodified deployment. Local test results do not establish that the deployed site is now secure.
