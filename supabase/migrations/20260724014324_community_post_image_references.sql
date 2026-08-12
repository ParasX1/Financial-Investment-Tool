-- Persist post images as a matched storage URL/path pair, never an arbitrary remote asset.
alter table public.posts
  drop constraint if exists posts_image_reference_check;

alter table public.posts
  add constraint posts_image_reference_check
  check (
    (image_url is null and image_path is null)
    or (
      image_url is not null
      and image_path is not null
      and image_path ~ '^posts/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$'
      and image_url ~ '^https://[^/?#]+/storage/v1/object/public/[A-Za-z0-9._-]+/posts/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$'
      and right(image_url, char_length(image_path) + 1) = '/' || image_path
    )
  );
