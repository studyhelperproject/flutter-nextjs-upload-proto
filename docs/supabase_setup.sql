-- 1. Create a table to store photo URLs
create table if not exists public.user_photos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  image_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS) on the table
alter table public.user_photos enable row level security;

-- 3. Create policies for the table
-- Allow users to insert their own photos
create policy "Users can upload their own photos"
  on public.user_photos for insert
  with check (auth.uid() = user_id);

-- Allow users to view their own photos
create policy "Users can view their own photos"
  on public.user_photos for select
  using (auth.uid() = user_id);

-- 4. Create a storage bucket named 'photos'
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- 5. Create policies for the storage bucket
-- Allow authenticated users to upload files to 'photos' bucket
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'photos' );

-- Allow public access to view photos (needed for publicUrl)
create policy "Allow public viewing"
on storage.objects for select
to public
using ( bucket_id = 'photos' );
