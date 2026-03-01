-- Progress share links are now generated as signed JWTs in application code.
-- Keep legacy table only for backwards compatibility and remove broad anon read.

drop policy if exists "Anonymous access to share links" on public.progress_share_links;
