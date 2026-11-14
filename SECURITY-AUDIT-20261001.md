# Roxaval Travels security audit — 1 October 2026

**Overall security assessment: 4/10, provisional. Remediation is needed before calling this application secure.** This is an engineering judgment, not a certification or evidence that an intrusion has occurred. No Critical-severity remote takeover was established. Several High-severity authorization and confidentiality defects were established.

**Review/report only.** No application code, database records, credentials, dependencies, DNS, server permissions or deployment configuration were changed. Proposed code below has NOT been applied. No passwords were guessed, no customer emails sent, and no destructive production exploits attempted.

## Scope and evidence

- Production is React/Vite plus **Laravel `backend-php` and MySQL**. The Node/MongoDB backend is legacy; its dependencies and security-related source were also inspected, but it is not the backend serving the checked production API.
- Reviewed routes, authentication, ownership checks, model serialization, uploads, SQL/query building, rendering, configuration and relevant legacy code.
- Pattern-scanned 2,302 local text files, including ignored environment files and backup text files. Scanned 1,201 root-repository historical text blobs and 329 Laravel-repository historical text blobs reachable through local Git refs. `.env` path history was checked separately. No remote fetch or history rewrite was performed.
- This is not an exhaustive binary/archive forensic scan: compressed archives, vendor/dependency source trees, binary files, files over 3 MB and generated build directories were excluded from the signature scan. Orphaned Git objects, unavailable remote refs, hosted CI secrets and cloud-console settings were not inspected. Unrecognized secret formats can evade pattern matching.
- Read-only checks of production HTTP responses, redacted Laravel configuration, database grant scope, backup file metadata, one Cloudinary document HEAD request and one TCP connection to hosting port 3306.
- SHA-256 comparison confirmed that **14 security-critical production files match the reviewed local versions**, including routes, bootstrap middleware, custom-tour services/controllers, auth/token services, Cloudinary uploads, payment services, public reviews/comments, admin updates, query helper and CRUD factory.
- Ran `npm audit --json --ignore-scripts` for root/frontend/legacy backend and `composer audit --locked --format=json --no-plugins --no-scripts`. No dependency changes.
- No authenticated live exploit testing, high-volume rate-limit probing, external database login, restore drill or full infrastructure penetration test was performed.

## Summary, ordered by remediation priority

Locations refer to current local source. Production-only findings have no meaningful source line; their nearest configuration location is supplied without inventing a line number for the server setting.

| Issue | Severity | File and line | Why it is dangerous |
|---|---|---|---|
| 1. Customer-controlled itinerary association enables cross-customer access/modification | High | `backend-php/app/Services/CustomTourRequestService.php:63`, `:451`; `app/Http/Controllers/Api/CustomTourRequestController.php:69` | Customer input can attach another customer's itinerary; subsequent reads and approval/rejection trust that association. |
| 2. Private documents have unauthenticated storage URLs | High | `backend-php/app/Services/CloudinaryService.php:35`; `app/Services/DocumentService.php:49` | Application authorization does not protect direct Cloudinary downloads. A sampled production document returned anonymous HTTP 200. |
| 3. Cookie-authenticated API lacks CSRF protection | High | `backend-php/bootstrap/app.php:26`; `app/Http/Controllers/Api/AuthController.php:28` | `SameSite=None` cookies can accompany cross-site requests; CORS does not stop HTML-form submissions. |
| 4. Refresh-token replay survives password change and logout | High | `backend-php/app/Services/AuthService.php:73`; `app/Services/TokenService.php:28`; `app/Http/Controllers/Api/AuthController.php:90` | A stolen refresh token can continue minting sessions. Logout only clears browser cookies. |
| 5. Password authentication, email forms and AI endpoint lack application throttles | High | `backend-php/routes/api.php:54`, `:58`, `:95`; `app/Http/Controllers/Api/ContactController.php:34` | Enables credential guessing, email spam, storage abuse and paid AI usage abuse. Host-level limits were not established. |
| 6. Excessive customer/internal data serialization | High | `backend-php/app/Http/Controllers/Api/ReviewController.php:144`; `BlogCommentController.php:17`; `CustomTourRequestController.php:38` | Public customer-linked reviews/comments serialize the entire Customer model; customer itinerary responses also include internal notes/costs/history. |
| 7. Admin demotion and permission flags do not govern effective authority consistently | High | `backend-php/app/Http/Controllers/Api/AdminController.php:55`; `app/Http/Middleware/RestrictTo.php:16` | Changing `is_super_admin` does not change `User.role`; a demoted superadmin can remain privileged. Stored permission lists are not enforced. |
| 8. Dependencies have known vulnerabilities | High* | `backend-php/composer.lock:2070`; `frontend/package-lock.json:4974`; other lock locations below | Includes production PHP advisories and development/legacy advisories. Applicability varies; not every advisory is remotely exploitable here. |
| 9. MySQL is externally reachable; application DB user has broad privileges | Medium | Hosting network; `backend-php/config/database.php:47` | Port 3306 accepted a connection. Database-scoped ALL PRIVILEGES increases impact of stolen app credentials. |
| 10. Production `.env` permissions and secret hygiene need hardening | Medium | Production Laravel `.env` filesystem mode; `backend/src/utils/seed.js:748`, `:752`; `backend-php/.gitignore:3` | `.env` is 0644; legacy seed contains/logs a fixed superadmin password in Git history; not all Laravel `.env.*` names are ignored. |
| 11. Public numeric catalog endpoints disclose unpublished/internal fields | Medium | `backend-php/app/Http/Controllers/Api/Concerns/CrudFactory.php:110`; `routes/api.php:39` | Numeric-ID lookups omit publication filters and return full models, including partner contact details. |
| 12. Incomplete server validation and unsafe generic query behavior | Medium | `backend-php/app/Support/ApiFeatures.php:49`, `:204`; `app/Http/Controllers/Api/Concerns/CrudFactory.php:59` | Query keys invoke model methods, pagination is uncapped, and several CRUD bodies are mass-assigned without validation. |
| 13. Receipt uploads lack a file-type allowlist | Medium | `backend-php/app/Http/Controllers/Api/PaymentController.php:48` | Any file type within the size limit can be uploaded to storage and shown to staff. |
| 14. Payment state changes lack transactions and row locking | Medium | `backend-php/app/Services/PaymentService.php:23`, `:128`; `PaymentController.php:39` | Concurrent submissions/verifications or receipt replacement can bypass intended sequential state checks. |
| 15. Missing browser security headers and explicit session-cookie hardening | Medium | `backend-php/public/.htaccess:1`; `bootstrap/app.php:26`; `config/session.php:172`; live frontend `.htaccess` | No checked CSP, anti-framing, HSTS, nosniff, referrer or permissions policy. Session Secure is unset. |
| 16. Automated offsite backups/restoration are not verified | Low | `release/COMBINED-DEPLOYMENT-20260929.md:9`; hosting backup configuration | Private deployment backups exist, but recovery from server/account compromise and ongoing data loss is not established. |

*Dependency severity is the highest reported advisory severity, not a claim of confirmed production exploitation.

## 1. Customer itinerary association — High

`submitRequest()` passes all customer input into `createRequestForCustomer()`. CamelCase conversion accepts `itineraryId`; `CustomTourRequest::$fillable` includes `itinerary_id`. Only `customer_id` and request status are overwritten. A malicious customer could associate their own request with somebody else's itinerary. `getMyRequests()` loads that linked itinerary, and accept/reject/change-request operations verify request ownership but not itinerary ownership. This is a concrete mass-assignment/IDOR path in matching production code. It was **not exercised against live records**.

**Fix:** use a dedicated customer FormRequest and allowlist only customer preference fields. Reject internal fields, including snake_case aliases. Admin creation must have its own validated schema. Never accept an itinerary association during customer request creation. Example boundary:

```php
// Add complete nested validation for the customer preference fields below.
$data = $request->validate([
    'travelDates' => 'required|array:startDate,endDate,isFlexible',
    'travelDates.startDate' => 'required|date',
    'travelDates.endDate' => 'required|date|after_or_equal:travelDates.startDate',
    'travelDates.isFlexible' => 'sometimes|boolean',
    'travelers' => 'required|array:adults,children,infants',
    'travelers.adults' => 'required|integer|min:1|max:50',
    'travelers.children' => 'sometimes|integer|min:0|max:50',
    'travelers.infants' => 'sometimes|integer|min:0|max:50',
    'preferredDestinations' => 'sometimes|array|max:50',
    'preferredDestinations.*' => 'integer|exists:destinations,id',
    'preferredActivities' => 'sometimes|array|max:50',
    'preferredActivities.*' => 'integer|exists:activities,id',
    'specialRequests' => 'sometimes|nullable|string|max:5000',
    'itineraryId' => 'prohibited', 'itinerary_id' => 'prohibited',
]);
// Expand this schema for existing legitimate form fields before rollout;
// pass validated data, never $request->all().
$result = $this->service->submitRequest($request->user()->id, $data);
```

Defense in depth: after conversion, apply a second allowlist in the service; set `itinerary_id` to null server-side on creation. Enforce **both** links before reading or modifying an itinerary:

```php
$itinerary = Itinerary::query()
    ->whereKey($tourRequest->itinerary_id)
    ->where('customer_id', $customer->id)
    ->where('custom_tour_request_id', $tourRequest->id)
    ->firstOrFail();
```

Apply this to all three customer decisions and customer response loading. Audit existing associations with a read-only consistency query before correcting any records. Add isolated two-customer tests for reading, acceptance, rejection and modification requests. [OWASP mass-assignment guidance](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html) supports explicit input allowlists.

## 2. Private document storage — High

Uploads use Cloudinary's ordinary `upload` delivery type. Document URLs are returned/stored directly and sometimes emailed. The authenticated streaming endpoint checks ownership, but the underlying URL bypasses it. One production document HEAD request, without cookies or authorization, returned **200**. No document body or customer information was displayed. Receipt exposure follows the same storage design but was not separately sampled.

**Fix:** store receipts, invoices, vouchers and quotations on a private Laravel filesystem outside the web root. Keep ordinary website photographs public. Return only authorized application download URLs. For example:

```php
// config/filesystems.php
'private_documents' => [
    'driver' => 'local',
    'root' => storage_path('app/private/documents'),
    'visibility' => 'private',
    'throw' => true,
],

// Save generated documents; add a storage_path column to the document record.
$path = (string) Str::uuid().'.pdf';
Storage::disk('private_documents')->put($path, $pdfBuffer);

// Only after the existing ownership/role checks:
return Storage::disk('private_documents')->response(
    $doc->storage_path, $doc->file_name,
    ['Content-Type' => 'application/pdf', 'Cache-Control' => 'private, no-store']
);
```

Equivalent Cloudinary **authenticated** delivery is possible, but it requires the correct protected delivery mode and signed access, not merely a random URL. See [Cloudinary access controls](https://cloudinary.com/documentation/control_access_to_media). Migrate existing assets, update references/email attachments, verify private downloads, then invalidate/delete the old public copies. Changing only future uploads leaves historical files exposed.

## 3. CSRF — High

The API accepts JWT cookies but has no CSRF middleware. Production JWT cookies are HttpOnly and Secure, which is good, but explicitly SameSite=None. An attacker can submit a cross-site form using a logged-in browser's privileges. CORS prevents unauthorized response reading; it does not generally prevent a simple form request from executing. Browser third-party-cookie restrictions can limit some attacks but are not an application defense.

**Fix:** for this same-site SPA/API deployment, change JWT SameSite to `lax`, and enforce CSRF protection on every unsafe browser API request, including login/logout/refresh. A concrete custom-header + strict-Origin middleware option is:

```php
public function handle(Request $request, Closure $next)
{
    if (!in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
        $allowed = config('cors.allowed_origins', []);
        abort_unless(
            in_array($request->header('Origin'), $allowed, true)
            && $request->header('X-Roxaval-Request') === '1',
            403, 'Request origin could not be verified.'
        );
    }
    return $next($request);
}
```

Register after CORS; make every frontend mutation/refresh/upload set `X-Roxaval-Request: 1`. This header is deliberately not a secret: a hostile browser origin cannot send it without an approved preflight. Retain exact CORS origins. Inventory any machine clients before enabling this rule; use narrowly scoped bearer-only exceptions, not a blanket missing-Origin exemption. Alternatively adopt Laravel session/Sanctum CSRF-token protection consistently. Do not just add CSRF middleware to a stateless API without supplying the corresponding token/session flow. [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

## 4. Refresh/logout invalidation — High

Access-token middleware checks `changedPasswordAfter()`. Refresh does not. Production lifetimes are seven days for access tokens and thirty days for refresh tokens. Refresh tokens are not stored/revoked; issuing another does not invalidate the old one. A stolen refresh token can survive a password reset and potentially maintain access by repeated refresh. Logout deletes browser cookies only.

**Immediate proposed check** in `AuthService::refresh()`, after loading the user:

```php
if (!$user || !$user->active || $user->changedPasswordAfter((int) $decoded->iat)) {
    throw ApiException::unauthorized('Session expired. Please sign in again.');
}
```

**Complete fix:** implement server-tracked refresh sessions with a hashed random refresh token, expiry and revoked_at; rotate atomically and revoke the family on replay. Revoke sessions on logout/password reset/account disable. Alternatively an integer `auth_version` on User can invalidate all sessions: embed it in both JWTs, check equality in both access/refresh verification and increment on logout/reset. That simpler approach logs out all devices. Use 15-minute access tokens rather than seven-day tokens. Add replay/reset/logout tests. Do not rotate JWT signing secrets casually without planning the resulting mass logout.

## 5. Abuse limits — High

Customer email-code requests and guest reviews have explicit throttles. Email-code verification also has an attempt limit, expiry, hashed code and row lock. Password login/reset, contact/newsletter and AI generation do not have corresponding application limits. CAPTCHA/honeypots are not universal; a honeypot is not a rate limit.

**Fix:** named limiters in a provider, applied to the actual routes. Example:

```php
RateLimiter::for('password-login', fn (Request $r) => [
    Limit::perMinute(10)->by('login-ip:'.$r->ip()),
    Limit::perMinute(5)->by('login-account:'.hash('sha256',
        mb_strtolower(trim((string) $r->input('email'))))),
]);
RateLimiter::for('public-mail', fn (Request $r) =>
    Limit::perHour(5)->by('mail:'.$r->ip()));
RateLimiter::for('ai-draft', fn (Request $r) =>
    Limit::perDay(10)->by('ai:'.$r->user()->id));
// Route additions:
// login -> middleware('throttle:password-login')
// forgot-password/contact/newsletter -> middleware('throttle:public-mail')
// authenticated generate-itinerary -> middleware('throttle:ai-draft')
```

Use separate appropriate limits for reset verification, uploads, messages and bookings. Set maximum input sizes/trip length and AI account spend limits. Add server-verified bot challenges to public email forms if abuse persists. Configure trusted proxies correctly so client-IP limits cannot be bypassed or collapse every visitor into one IP. Do not prove limits by flooding production.

## 6. Response data minimization — High

`customer.user:id,...` restricts the nested User fields, **not the parent Customer fields**. Customer has no hidden-field policy and includes passport number, birthday, address, staff notes and spending fields. Public approved reviews and comments therefore expose those fields when linked to a customer. Production currently has **zero approved customer-linked reviews and zero blog comments**, so this specific PII leak is latent; the code defect is confirmed, but existing PII exposure through these two endpoints was not observed.

Customer itinerary responses separately serialize internal admin notes, cost/markup data and version history. Hiding fields in React does not protect them. Public reviews also return moderation metadata.

**Fix:** explicit public/customer/admin API Resources. A public review projection can be:

```php
return [
    '_id' => (string) $review->id,
    'reviewerName' => $review->reviewer_name ?: $review->customer?->user?->full_name,
    'rating' => $review->rating,
    'title' => $review->title,
    'text' => $review->text,
    'country' => $review->country,
    'images' => $review->images,
    'createdAt' => $review->created_at,
];
```

Add only required public package fields. Do not return Customer itself, booking IDs, moderator IDs or moderation notes. Comments need the same projection. Customer itinerary Resources should include the customer-facing schedule, selected services and agreed totals, but omit admin notes, base costs, markup, staff accounts and internal revision snapshots. Adapt frontend types alongside this change. Test response keys, not just visible UI.

## 7. Effective admin authority — High

`updateAdmin()` updates `Admin.is_super_admin`, while `RestrictTo` authorizes from `User.role`. Demoting through the former does not demote the latter. The `permissions` JSON list is stored but is not consulted by middleware/controllers. Thus department/permission selections do not restrict an admin to that department.

**Fix:** synchronize role and profile in a transaction, revoke affected sessions and protect the last active superadmin. Example transaction body, after locking/checking the remaining superadmin set:

```php
$admin = Admin::whereKey($id)->lockForUpdate()->firstOrFail();
$user = User::whereKey($admin->user_id)->lockForUpdate()->firstOrFail();
if (array_key_exists('isSuperAdmin', $data)) {
    $user->role = $data['isSuperAdmin'] ? 'superadmin' : 'admin';
    $user->save();
    $admin->is_super_admin = $data['isSuperAdmin'];
}
$admin->save();
```

Add Gate policies per operation and attach `can:` middleware. Example policy rule:

```php
Gate::define('payments.verify', fn (User $u) =>
    $u->role === 'superadmin' || ($u->role === 'admin'
        && in_array('payments.verify', $u->admin?->permissions ?? [], true)));
// Payment verification route: ->middleware('can:payments.verify')
```

Agree the permission matrix with the owner, migrate existing permissions, and test promotion, demotion and a restricted staff account. Do not silently remove access from existing staff during an unplanned rollout.

## 8. Dependency audit — High maximum advisory severity

Audit counts are vulnerable packages, not distinct exploitable attack paths. Root/frontend/backend counts overlap; do not sum them into unique vulnerabilities.

| Project | Result | Packages/version observed |
|---|---|---|
| Laravel | 4 advisories affecting 3 packages | `laravel/framework 13.25.0` (Low), `league/commonmark 2.10.0` (Medium and High), `league/flysystem 3.35.2` (Low) |
| Frontend | 7 packages: 4 High, 3 Moderate | `brace-expansion 1.1.16`, `js-yaml 4.3.0`, `nanoid 3.3.16`, `vite 5.4.21`; `esbuild 0.21.5`, `react-router 6.30.4`, `react-router-dom 6.30.4` |
| Root npm | 4 packages: 3 High, 1 Moderate | `brace-expansion 5.0.8`, `multer 2.2.0`, `nodemailer 9.0.3`; `morgan 1.11.0` |
| Legacy Node backend | 9 packages: 3 High, 6 Moderate | `brace-expansion 1.1.16/5.0.8`, `js-yaml 4.3.0`, `nodemailer 6.10.1`; `body-parser 1.20.6`, `express 4.22.2`, `moment 2.30.1`, `morgan 1.11.0`, `qs 6.15.3`, `uuid 9.0.1` |

Additional lock locations: frontend `package-lock.json:2130,2622,3451,3699,4284,4299,4974`; root `package-lock.json:125,699,743,762`; backend `package-lock.json:566,590,1495,2447,2823,2916,3021,3069,3507,4308`; Laravel `composer.lock:1660,2070,2259`.

The three PHP versions were confirmed installed in production. The framework debug-page advisory is mitigated by verified production debug=false. The CommonMark table-parser/HTML advisories require the affected Markdown features to process relevant input; that exploit path was not established. Vite/esbuild/YAML/brace/nanoid entries are development/build dependencies in this frontend lockfile. Production serves a static build, so a Vite development-server advisory is not automatically a production server vulnerability. React Router is shipped runtime code; SSR-specific advisories do not automatically apply to this SPA. Legacy Node advisories are not evidence that Laravel is affected.

**Fix after approval, in a branch/staging environment:**

```sh
# Laravel: resolve patched compatible releases and rerun audit/tests.
composer update laravel/framework league/commonmark league/flysystem --with-all-dependencies --no-scripts
composer audit --locked

# In each npm project separately: review changes, do not use --force blindly.
npm audit fix --ignore-scripts
npm audit
```

The audit recommends a major Vite upgrade for some findings; that needs a deliberate Node/Vite/plugin compatibility upgrade, build and browser tests. Do not deploy lockfile-only changes without rebuilding/installing the corresponding production artifacts. Relevant advisory links: [Laravel debug page](https://github.com/advisories/GHSA-jh5r-qr3c-85q8), [CommonMark table DoS](https://github.com/advisories/GHSA-3q6v-r5mr-hxv8), [CommonMark HTML handling](https://github.com/advisories/GHSA-97jj-33gv-5xf9), [Flysystem path normalization](https://github.com/advisories/GHSA-cxf4-7mrp-vvpr), [Vite path traversal](https://github.com/advisories/GHSA-4w7w-66w2-5vf9). Audit findings change over time; recheck before implementing.

## 9. Database exposure/privileges — Medium

The app connects locally to MySQL. A single TCP connection from this audit environment to the supplied hosting IP on **3306 succeeded**. This is a shared-host listener; it does **not** prove anonymous access or that this app's account can authenticate remotely. No database password was tested over the internet.

The runtime account has database-scoped **ALL PRIVILEGES**, not global ALL and not GRANT OPTION. Global USAGE is not an administrative privilege. Schema-level CREATE/DROP/ALTER are unnecessarily powerful for ordinary requests.

**Fix:** ask the host to restrict external MySQL access to approved IPs or disable it if unused, and remove unnecessary cPanel Remote MySQL entries. Do not change shared-server bind/firewall settings yourself. Create a separate runtime account with only required data permissions, and use a separate migration account. Proposed DBA commands with placeholders:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE
ON `APP_DATABASE`.* TO 'APP_RUNTIME_USER'@'localhost';
-- Grant required migration privileges only to a separate deployment identity.
```

Use cPanel to create credentials; do not paste them into Git/chat. Test the app with the new account before removing the old account's permissions. No Supabase/Firebase datastore was found: Firebase PHP JWT is a token library, so RLS/Firebase rules are not applicable to this MySQL deployment. Ownership must be enforced in Laravel.

## 10. Secrets and filesystem permissions — Medium

- Production Laravel `.env` is **0644**. Whether other hosting users can actually traverse to it depends on account isolation and directory permissions; public HTTP probes were blocked. Tightening it still reduces exposure.
- Legacy `backend/src/utils/seed.js:748` contains a fixed superadmin password and line 752 logs it. It also exists in reachable Git history (e.g. blob `16f698e3caf5`, older source line 607). Its validity in production was not tested. Treat the seeded account as requiring a password review, not as a confirmed compromise.
- Root `.env` variants are ignored and no real `.env` was found tracked in inspected history. Laravel ignores `.env`, `.env.backup` and `.env.production`, but `.env.local` and `.env.test` were not ignored in its separate repository.
- Real-looking credential assignments exist in ignored `backend/.env:14,18,20,64,65,66` and `backend-php/.env:3,34,35,59,67,78,79,84`. Values are intentionally omitted. Presence in a private `.env` is not itself a leak. Other matches were validation strings, translations and deliberate test credentials.
- Frontend environment declarations inspected expose only `VITE_API_URL`; no private key was found in those declarations or the scanned frontend source. No claim is made that an unrecognized/encoded secret cannot exist in excluded artifacts.

**Fix, after confirming PHP runs as the account owner:**

```sh
chmod 600 /home2/zlwoctte/public_html/website_91fe39e6/roxaval-backend-php/.env
```

Add to the Laravel repository's `.gitignore`:

```gitignore
.env.*
!.env.example
```

Replace the seed literal and remove credential logging:

```js
const seedPassword = process.env.SEED_ADMIN_PASSWORD;
if (!seedPassword) throw new Error('SEED_ADMIN_PASSWORD is required');
// Use seedPassword only when deliberately creating the initial admin.
console.log('Superadmin created; credentials are not logged.');
```

Rotate the seeded account password if ever used; rotate other credentials only where exposure is confirmed/suspected. If a valid secret was committed/shared, rotate it first, then plan history cleanup with collaborators. Never publish backup dumps or archives. Do not chmod public assets to 0600.

## 11. Public catalog disclosure — Medium

Public numeric-ID detail routes call `CrudFactory::show()`, which lacks the published/active filter used on list and slug routes. Public hotel and guide responses include operational contact fields; this was confirmed by printing field names only. Public model graphs can also include internal metadata. Whether a particular contact field is intentionally public requires business confirmation.

**Fix:** split public and admin detail routes; public responses must use public field projections. Public lookup example:

```php
$doc = TourPackage::whereKey($id)->where('status', 'published')->firstOrFail();
// Return a PublicTourPackageResource, not the entire model.
```

Use `active` for hotels/guides/vehicles/transfers, `published` for content, and protected `/admin/{id}` routes for drafts. Apply visibility to nested records too. Keep admin preview working through authenticated routes. Avoid treating an unauthenticated optional role as permission.

## 12. Validation/query helper — Medium

`relationName()` invokes any existing model method matching a query-string key before checking whether its return value is a relation. Some methods have side effects or throw errors; no destructive method was invoked during this review. `limit` has no upper bound. Generic CRUD and settings accept request-wide data; database constraints and `$fillable` are not a substitute for per-action validation. This is separate from the exploitable customer association in issue 1.

**Fix:** endpoint-specific relation/filter/sort/select allowlists; do not discover relationships by executing arbitrary methods:

```php
private function relationName(string $field): ?string
{
    $allowed = match ($this->query->getModel()::class) {
        \App\Models\Activity::class => ['destinations'],
        \App\Models\Hotel::class => ['destination', 'roomTypes'],
        default => [],
    };
    return in_array($field, $allowed, true) ? $field : null;
}
$limit = min(100, max(1, (int) $this->request->query('limit', 20)));
```

Complete the allowlists for required endpoints and reject unknown filter/sort/field names with 400. Public selects must never choose private fields. Add dedicated FormRequests with string maxima, bounded arrays, enums, numeric ranges and ownership-aware foreign-key checks. Existing UI dropdowns are not server validation. Raw SQL reviewed used bound values/controlled expressions; no confirmed SQL-injection payload path was found, but the generic query helper still requires hardening.

## 13. Upload validation — Medium

Image upload endpoints enforce image type, a 10 MB limit and a ten-image batch limit. Receipts enforce only file presence/size and use Cloudinary auto detection.

**Fix:** explicitly allow required formats, enforce MIME/size on the server, use randomized private paths and scan untrusted documents before staff open them:

```php
$request->validate([
    'receipt' => 'required|file|mimes:pdf,jpg,jpeg,png|mimetypes:application/pdf,image/jpeg,image/png|max:5120',
]);
```

Combine with private storage in issue 2, `nosniff`, and safe download responses. Reject HTML/SVG/executables and malformed files; filename extensions alone are insufficient. Recheck finalized payment state under a row lock immediately before attaching the receipt.

## 14. Concurrent payment integrity — Medium

Submission checks and creation are separate database operations. Verification reads the payment, updates it, then adjusts a booking total without transaction/locking. Receipt finalization checks are also separated from attachment update. The sequential guard works for ordinary repeated requests, but concurrent requests can see stale state, create duplicates or overwrite state/totals. No live financial mutation was attempted.

**Fix:** a transaction for each financial state transition, using the same lock order everywhere (booking, then payment), and recompute totals from verified payment records:

```php
DB::transaction(function () use ($bookingId, $paymentId, $newStatus) {
    $booking = Booking::whereKey($bookingId)->lockForUpdate()->firstOrFail();
    $payment = Payment::whereKey($paymentId)
        ->where('booking_id', $booking->id)->lockForUpdate()->firstOrFail();
    // Recheck owner, current status, currency and amount while locked.
    if ($payment->status === $newStatus) return;
    abort_if(in_array($payment->status, ['Verified', 'Refunded'], true), 409);
    $payment->update(['status' => $newStatus]);
    $booking->pricing_amount_paid = Payment::where('booking_id', $booking->id)
        ->where('status', 'Verified')->sum('amount');
    // Apply the existing validated booking-status/history updates here.
    $booking->save();
});
```

Keep actor/audit metadata and notify only after commit. For submission, lock the booking before checking pending payments and totals, and add idempotency keys/uniqueness constraints. Validate concurrency against MySQL, not only SQLite.

## 15. Headers/cookies — Medium

HTTP-to-HTTPS/canonical redirects worked. HTTPS frontend and API samples lacked CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy and Permissions-Policy. The Laravel session Secure setting is null; JWT cookies separately specify Secure in production. No authenticated cookie was issued just for this audit.

**Fix:** merge headers into both virtual hosts without replacing existing rewrite/PHP rules. Starting baseline:

```apache
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  Header always set Content-Security-Policy "frame-ancestors 'self'; base-uri 'self'; object-src 'none'"
</IfModule>
```

Enable `Strict-Transport-Security: max-age=31536000` on HTTPS hosts after confirming TLS coverage. Do not add includeSubDomains/preload until all subdomains are ready. The baseline CSP prevents framing/base/object abuse but **does not** establish a complete script policy: inventory maps, images, API, styles and inline structured data, then test a nonce/hash-based `script-src` and narrow `connect-src` in report-only mode before enforcement.

Set `SESSION_SECURE_COOKIE=true`, retain HttpOnly, and apply issue 3's JWT/CSRF changes. A header must be verified on error responses as well as successful HTML. Test maps, PDF viewing, image hosts and forms after rollout.

## 16. Backups — Low / verification gap

Private full application backups and SQL dumps were found outside public roots with 0600 permissions, including the 29 September combined-release database backup. That is positive. This check verified existence/permissions, not a fresh restoration or ongoing scheduled/offsite backup policy.

**Fix:** enable daily database backups with retention and encrypted offsite copies under a different account; monitor failures and test restoration to an isolated database. Example scheduled job structure, using credentials from a protected MySQL option file rather than command arguments:

```sh
umask 077
mysqldump --defaults-extra-file=/PRIVATE/PATH/mysql-backup.cnf \
  --single-transaction --routines --triggers APP_DATABASE > /PRIVATE/PATH/staging.sql
# Check exit status, encrypt, upload offsite, verify checksum, then rotate retention.
# Schedule through the hosting backup service; never write dumps under public_html.
```

This command is a proposed template, not a job configured by this audit. Coordinate with the host where managed backup tooling is available.

## Controls that passed / things not established

- Password writes use Laravel Hash::make; comparison uses Hash::check. Password/reset hash fields are hidden from User serialization.
- Reset tokens use random bytes, SHA-256 storage and a ten-minute expiry. Customer email codes use HMAC, expiry, five attempts, row locks and one-time consumption; staff/disabled accounts cannot use that flow.
- Admin API routes generally have server-side authentication and role middleware. A public SPA admin shell is not, by itself, an authorization defect.
- Ordinary customer booking/payment/message/document lookups contain ownership checks. The itinerary-association path above bypasses the intended boundary and must be addressed.
- Production `APP_ENV=production`, `APP_DEBUG=false`; required credential settings are populated; JWT signing keys are distinct. Secret strength/reuse across external services was not exhaustively assessed.
- Explicit production CORS origins are the two Roxaval frontend origins. An untrusted Origin received no Access-Control-Allow-Origin header.
- `.env` HTTP probes returned 406; API `.git/HEAD` returned 403. These samples do not prove every backup/source path is inaccessible.
- No `dangerouslySetInnerHTML`, `innerHTML`, `document.write` or eval-style sink was found in the scanned frontend source. Blade/email content reviewed is escaped; the raw star-rating fragment contains fixed character entities. This is not a guarantee against every URL-based, third-party or future XSS path.
- No confirmed SQL injection was found in reviewed raw-query usage. MongoDB/Supabase/Firebase production exposure was not asserted; the active datastore is MySQL.
- Errors from AI calls return a generic public message, but upstream response bodies are logged server-side. Review log retention/redaction for personal data. No raw secrets or customer records are included in this report.
- Hosting WAF policy, admin MFA, remote DB account grants, TLS cipher posture, Cloudinary account-wide restrictions, remote repository exposure, automatic offsite backups and restore success require owner/provider confirmation.

## Manual action checklist

- [ ] Approve a staged remediation plan; prioritize issues 1–7 and private storage. Do not apply these snippets directly to production without integration tests/backups.
- [ ] Have the host restrict remote MySQL access and confirm which accounts can connect remotely. No unsafe DNS changes are needed.
- [ ] Move the web application to a least-privilege DB account and reserve schema privileges for deployment.
- [ ] Review/reset the legacy seeded administrator password; enable MFA for hosting, Git and administrative access where supported.
- [ ] Rotate any credentials confirmed exposed in shared archives, logs, repositories or previous messages; do not publish replacement values.
- [ ] Confirm PHP ownership, then restrict `.env` permissions and keep local/server backups private.
- [ ] Migrate existing sensitive Cloudinary assets to private storage, update references, and invalidate the old public URLs.
- [ ] Review existing request/itinerary ownership associations and staff role/profile consistency before repairing records.
- [ ] Approve a staff permission matrix and test a genuinely restricted account.
- [ ] Upgrade dependencies in staging; rerun audits and frontend/Laravel tests, including two-customer authorization and MySQL concurrency tests.
- [ ] Configure monitored daily encrypted offsite DB backups and perform a restore drill.
- [ ] Verify HTTPS headers, cookies, cross-origin forms, email login, uploads, maps and PDF downloads after approved remediation.
- [ ] Re-audit before raising the provisional **4/10** security score. No finding in this report establishes that attackers have already accessed the database.
