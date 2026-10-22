-- REVIEW ONLY. Do not apply until approved and tested.
-- Extend buyer access to Draft releases purchased with either Stripe sandbox or live Checkout.
-- Published releases remain public for browsing; secure WAV delivery still requires a live paid order.
-- Never grant paid download access based on a sandbox license after publication.
BEGIN;
DROP POLICY IF EXISTS "Buyers read licensed releases" ON public.music_releases;
CREATE POLICY "Buyers read licensed releases"
ON public.music_releases FOR SELECT TO authenticated
USING (
  status = 'draft'
  AND EXISTS (
    SELECT 1 FROM public.music_licenses l
    JOIN public.music_orders o ON o.id = l.order_id
    WHERE l.release_id = music_releases.id
      AND l.buyer_id = (SELECT auth.uid())
      AND o.buyer_id = (SELECT auth.uid())
      AND o.release_id = music_releases.id
      AND l.status = 'active' AND o.status = 'paid'
      AND (o.stripe_session_id LIKE 'cs_test_%' OR o.stripe_session_id LIKE 'cs_live_%')
  )
);
DROP POLICY IF EXISTS "Buyers read licensed tracks" ON public.music_tracks;
CREATE POLICY "Buyers read licensed tracks"
ON public.music_tracks FOR SELECT TO authenticated
USING (
 EXISTS (
   SELECT 1 FROM public.music_releases r
   JOIN public.music_licenses l ON l.release_id = r.id
   JOIN public.music_orders o ON o.id = l.order_id
   WHERE r.id = music_tracks.release_id
     AND l.buyer_id = (SELECT auth.uid())
     AND o.buyer_id = (SELECT auth.uid())
     AND o.release_id = r.id
     AND l.status = 'active' AND o.status = 'paid'
     AND (
       (r.status = 'draft' AND (o.stripe_session_id LIKE 'cs_test_%' OR o.stripe_session_id LIKE 'cs_live_%'))
       OR
       (r.status = 'published' AND o.stripe_session_id LIKE 'cs_live_%')
     )
 )
);
COMMIT;
-- Post-deployment check: verify owner's live MULA Draft purchase appears.
-- Test sandbox-only buyers cannot download a published WAV.
-- Test revoked/refunded buyers cannot retrieve a signed URL.
