# Issue 1 — customer itinerary ownership

Status: implemented locally, awaiting review. Nothing deployed, no production connection used, no production data changed. Issue 2 and later issues have not been started.

Branch in both the root and separate Laravel repositories: `security/issue-1-itinerary-ownership`. Existing uncommitted work was preserved; it is not part of this fix. No Git push was performed.

## Changes

- `backend-php/app/Services/CustomTourRequestService.php`: validate and allowlist customer preference input before conversion/mass assignment; reject itinerary aliases, discard other internal fields, and validate nested preference fields. Admin creation retains its existing separate behavior. Accept/reject/request-changes now require the linked itinerary to belong to both the customer and that request.
- `backend-php/app/Models/CustomTourRequest.php`: shared customer/parent ownership predicate.
- `backend-php/app/Http/Controllers/Api/CustomTourRequestController.php`: customer list/detail JSON suppresses an invalid itinerary and its ID. This changes only the in-memory response, not the stored association. Valid response shapes remain unchanged. Broader JSON field minimization is reserved for issue 6.
- `backend-php/tests/Feature/ItineraryOwnershipTest.php`: three regression scenarios with separate Alice/Bob accounts; checks malicious camelCase/snake_case/short aliases, unexpected internal fields, invalid nested keys, direct cross-customer IDs, pre-existing corrupt links, same-customer/wrong-parent links, all three decisions, unchanged database records after denied operations, and legitimate EN/DE/FR reads/decisions.

No frontend source changes, database migrations or data repairs are needed for this patch. The request allowlist includes every field currently emitted by `CustomTourWizard.buildPreferencesPayload`, including child/infant ages and custom destination/activity names.

## Results

- Full Laravel suite: **41 tests / 963 assertions passed** using isolated in-memory SQLite; email notifications mocked in new security tests. The first run caught missing required pricing columns in the new test fixtures; fixtures were corrected and the full suite rerun successfully.
- Frontend production build passed. Existing bundle-size warning remains.
- Functional TypeScript check passed with the existing unused-symbol flags disabled; this is not a claim that strict lint is clean.
- Existing Chromium multilingual suite passed: language selection/switching, EUR settings, translated package content, 181 sorted hotel choices, admin review entry, SEO save/refresh, and no observed browser runtime errors. API responses in this browser suite are mocked; actual Laravel API behavior is covered by the full integration suite above.
- `git diff --check` passed.

## Read-only check before any future data repair

No records are repaired by this change. If a later task authorizes a production consistency check, first run this read-only count and report the result before proposing any repair:

```sql
SELECT COUNT(*) AS invalid_itinerary_links
FROM custom_tour_requests AS r
LEFT JOIN itineraries AS i ON i.id = r.itinerary_id
WHERE r.itinerary_id IS NOT NULL
  AND (i.id IS NULL
       OR i.customer_id <> r.customer_id
       OR i.custom_tour_request_id <> r.id);
```

This query has **not** been run against production in this task. Invalid existing links will be hidden from customers until separately reviewed; administrators retain visibility for investigation. Production MySQL concurrency and real authenticated browser flows were not exercised. No historical data is silently corrected.

Next step: user approval before starting issue 2, including its private-document migration plan. No deployment is authorized for this sequence.
