insert into storage.buckets (id, name, public)
values ('checklist-evidence', 'checklist-evidence', true)
on conflict (id) do nothing;

create policy "Evidence images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'checklist-evidence' );

create policy "Anyone can upload an evidence image"
  on storage.objects for insert
  with check ( bucket_id = 'checklist-evidence' );

create policy "Anyone can update an evidence image"
  on storage.objects for update
  with check ( bucket_id = 'checklist-evidence' );
