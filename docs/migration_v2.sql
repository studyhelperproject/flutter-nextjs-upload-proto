-- 1. Create a function to handle new object uploads in Storage
-- This function will be triggered whenever a new file is inserted into storage.objects
create or replace function public.handle_new_photo()
returns trigger
language plpgsql
security definer
as $$
declare
  path_parts text[];
  user_id_from_path uuid;
  image_public_url text;
begin
  -- Check if the object is in the 'photos' bucket
  if new.bucket_id <> 'photos' then
    return new;
  end if;

  -- Parse the file path to extract user_id
  -- Expected path format: uploads/{user_id}/{filename}
  path_parts := string_to_array(new.name, '/');
  
  -- Basic validation: path should have at least 3 parts (uploads, user_id, filename)
  if array_length(path_parts, 1) < 3 then
    return new;
  end if;

  -- Attempt to cast the second part to UUID
  begin
    user_id_from_path := path_parts[2]::uuid;
  exception when others then
    -- If casting fails (not a valid UUID), ignore this upload
    return new;
  end;

  -- Construct the public URL
  -- NOTE: Replace 'NEXT_PUBLIC_SUPABASE_URL' with your actual Supabase Project URL if needed,
  -- or use the storage specific URL format.
  -- Simpler approach: Store the path or relative URL, but here we store full URL for consistency with previous app logic.
  -- Format: https://[project-id].supabase.co/storage/v1/object/public/[bucket]/[name]
  image_public_url := current_setting('request.headers')::json->>'origin' || '/storage/v1/object/public/' || new.bucket_id || '/' || new.name;
  
  -- Insert into user_photos table
  insert into public.user_photos (user_id, image_url)
  values (user_id_from_path, image_public_url);

  return new;
end;
$$;

-- 2. Create the trigger
drop trigger if exists on_photo_upload on storage.objects;

create trigger on_photo_upload
  after insert on storage.objects
  for each row
  execute procedure public.handle_new_photo();
