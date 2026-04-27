-- Create private Storage bucket for match videos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'match-videos',
  'match-videos',
  false,
  5368709120, -- 5 GB per file
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/x-matroska', 'video/*']
)
on conflict (id) do nothing;

-- Coach can upload into their own folder ({user_id}/...)
create policy "Coach can upload own videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'match-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Coach can read their own videos
create policy "Coach can read own videos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'match-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Coach can update (overwrite) their own videos
create policy "Coach can update own videos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'match-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Coach can delete their own videos
create policy "Coach can delete own videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'match-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add video_storage_path column to saved_matches for efficient lookups
alter table public.saved_matches
  add column if not exists video_storage_path text;

create index if not exists saved_matches_video_path_idx
  on public.saved_matches (user_id, video_storage_path)
  where video_storage_path is not null;
