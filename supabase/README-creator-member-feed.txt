CREATOR'S WORLD MEMBER FEED

Public entry: /creators.html#community
Any active, confirmed, non-anonymous signed-in member can post.
Photos, video and audio: one file per post, maximum 50 MiB.
Daily reservation limits: 20 posts / 500 MiB, including canceled reservations.
Video is served in its original format; no transcoding or automatic content review.
MOV playback depends on the device and codec. Recommend MP4 for broad compatibility.

Migration: migrations/20261102192922_creator_member_feed.sql
The separate private creator-member-media bucket never exposes unfinished uploads.
Reserve an immutable path, upload with TUS, then finalize after Storage confirms size,
MIME and owner. File MIME restrictions are not a malware scanning service.
The reviewed creator-world-uploads/public release workflow stays separate.
No Stripe or paid-music entitlements are involved in member posting.

The author can remove a post. Existing creator_admin / admin app_metadata roles
see Moderator tools on the feed and can review reported posts and remove them.
Reports do not automatically hide posts. Moderators must review them.
Removal hides the post immediately, then the client removes the underlying file.
Previously issued signed playback URLs can remain valid up to 15 minutes.
If object cleanup fails, the post remains hidden; the owner/moderator can retry
member_remove_post and Storage.remove. Never delete storage.objects rows via SQL.
Upload reservations abandoned by closing the page remain private; operators should
periodically remove stale reservations with the same RPC + Storage API sequence.
Do not delete published objects before removing the post.

Tests:
  node scripts/check-creator-member-db.js
  npm test
  node scripts/check-creator-member-browser.js  (requires Playwright + Chromium)
The database test runs the real migration in isolated PostgreSQL, with synthetic
roles and fixtures. Browser tests use the real TUS client and a local test server,
including a failed upload chunk, continuation and single publication.

To disable posting without destroying existing posts, revoke EXECUTE on
public.member_reserve_post(uuid,text,text,bigint), public.member_publish_post(uuid)
AND their same-signature private implementations from authenticated, then remove
the composer scripts/styles from creators.html. Leave data and moderation access
intact while resolving the incident. Do not drop the bucket or migration tables.
