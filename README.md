# HYPHSWORLD Upload Studio — review package

Standalone draft-only owner upload UI. No homepage modifications, publishing workflow, deployment or database changes have been performed.

## Defaults
Video / Homepage / Draft. The client authenticates with existing HWAuth and requires a trusted Supabase app_metadata owner claim. Browser checks are not sufficient; the proposed SQL enforces server-side RLS and private storage access. Owner role must be correctly provisioned separately.

## Review / activation procedure (do NOT run without approval)
1. Security-review docs/owner-upload-studio-review.sql and confirm actual owner's trusted app_metadata claim and configuration.
2. Apply schema and private storage policies in an approved change window, not from this review.
3. Add HTML/JS files to repo; existing homepage remains untouched. Verify auth-client.js integration.
4. Run nonowner, anonymous, owner, spoofed-role, upload, size-limit, MIME, RLS, private-bucket, and mobile tests before use.
5. Confirm operational upload limits (Supabase project size limits may be lower than 50MB). Use resumable uploads for large videos in later revision.

## Limitations
This is an initial feature implementation, not a tested or production-ready deployment. No auto-publishing; no signed preview of previously uploaded draft files; no transcoding or resumable uploads. File MIME validation is preliminary; verify server-side media content before ever publishing. Storage upload + DB insert are non-atomic; cleanup is best effort. Avoid claiming runtime verification until the connected test system is configured and tested.

## Review findings (October 31, 2026)
- The uploaded `2DAY NEWKI 3.mp4` is about 54 MB, **above the initial 50 MiB limit**. It cannot be uploaded through this implementation without compression or a separate approved resumable-upload upgrade.
- This is a code review package, not a deployed or runtime-tested service. The Supabase SQL is proposed, not applied.
- Validate database path ownership and private storage RLS with an actual authenticated owner and unauthorized user before activation.
- Explicit publication remains unavailable by design. Homepage never reads these private draft records.
- A GitHub branch may exist, but the package files are not claimed to be committed or merged.
