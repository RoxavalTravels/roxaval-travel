# Private-file migration plan (not executed)

New documents and receipts use random `private://UUID` references in the existing URL columns and a private disk outside the document root. API JSON exposes only authenticated download routes. Public website images stay on Cloudinary. Existing documents use a restricted, same-tenant Cloudinary reader during transition. Existing public URLs remain accessible until an approved migration and removal occurs.

Before any record changes, run and review this read-only inventory on a staging copy first:

Production requires `PRIVATE_DOCUMENT_ROOT` to point outside **all** public document roots, for example `/home2/zlwoctte/roxaval-private-documents`. The Laravel installation itself sits under `public_html`, so do not assume its `storage` directory is outside every public root. Confirm ownership, use private directory/file permissions, and verify the host cannot serve this path. New private-file operations fail closed if the production setting is absent. The local test default is `storage/app/private/documents`.

```sql
SELECT type, COUNT(*) AS legacy_count FROM documents
WHERE file_url LIKE 'https://res.cloudinary.com/%' GROUP BY type;
SELECT COUNT(*) AS legacy_receipts FROM payments
WHERE receipt_url LIKE 'https://res.cloudinary.com/%';
```

No production inventory, copy, repair or deletion has been performed. Do not run a record-changing migration before reporting these counts to the owner.

1. Back up the database and private document storage; verify restore access and free disk space.
2. Produce a private manifest of record IDs, existing locations, file types and checksums. Never place it under public_html or commit it.
3. Copy each authorized legacy asset to the private disk. Check byte count, file signature and SHA-256. Leave the original untouched.
4. In small transactions, update only a still-matching old location to its verified private reference. Keep a rollback manifest outside public roots. Re-run inventory and report failed/unsupported locations.
5. Test owner/staff downloads, other-customer denial, voucher email attachments and receipts. Include existing notification/email links in the transition plan. New notification links lead to the authenticated dashboard.
6. Obtain separate explicit approval to invalidate/delete old Cloudinary assets. This code does not delete them. Verify old URLs no longer return content after that future operation, including caches.
7. Include private storage in encrypted offsite backups. Restore database and files as a consistent pair. Rollback requires this release's reader or restoration of the prior location manifest; the old application cannot read `private://` references.
