-- Store Community attachments as validated storage paths; clients derive the
-- public URL from their configured Supabase project and bucket.
alter table public.posts
  drop constraint if exists posts_image_reference_check;

update public.posts
set
  image_url = null,
  image_path = case
    when image_path ~ '^posts/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$'
      then image_path
    else substring(
      image_url
      from '^https?://[^/?#]+/storage/v1/object/public/[^/?#]+/(posts/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp|gif))$'
    )
  end
where image_url is not null or image_path is not null;

alter table public.posts
  add constraint posts_image_reference_check
  check (
    image_url is null
    and (
      image_path is null
      or image_path ~ '^posts/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$'
    )
  );

alter table public.comments
  drop constraint if exists comments_image_reference_check;

update public.comments
set
  image_url = null,
  image_path = case
    when image_path ~ '^comments/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$'
      then image_path
    else substring(
      image_url
      from '^https?://[^/?#]+/storage/v1/object/public/[^/?#]+/(comments/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp|gif))$'
    )
  end
where image_url is not null or image_path is not null;

alter table public.comments
  add constraint comments_image_reference_check
  check (
    image_url is null
    and (
      image_path is null
      or image_path ~ '^comments/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$'
    )
  );
