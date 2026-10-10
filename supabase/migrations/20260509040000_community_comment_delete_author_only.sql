-- Align comment deletion with the Community ownership rule:
-- users may delete only their own comments. A discussion owner removes other
-- users' comments only by deleting the whole discussion, using post cascade.

do $$
begin
  if to_regclass('public.comments') is not null then
    execute 'drop policy if exists "Community comment authors can delete" on public.comments';
    execute 'create policy "Community comment authors can delete" on public.comments for delete to authenticated using (auth.uid() = author_id)';
  end if;
end $$;
