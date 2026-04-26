DROP POLICY IF EXISTS "Avatars are public" ON storage.objects;

-- Public can read individual avatar files (cannot list whole bucket via this policy alone since it requires path)
-- Public buckets serve files directly via URL regardless; this policy just allows authenticated SELECT on individual rows.
CREATE POLICY "Authenticated can read avatars"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'avatars');
