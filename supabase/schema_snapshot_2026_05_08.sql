-- Current remote schema snapshot exported from Supabase on 2026-05-08.
-- This file is for documentation/context only and is not run by Supabase CLI.
-- Table order and constraints may not be valid for direct execution.

CREATE TABLE public.Users (
  id uuid NOT NULL,
  first_name text,
  last_name text,
  email text,
  stock_ids json,
  created timestamp with time zone DEFAULT now(),
  avatar_url text,
  CONSTRAINT Users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid,
  user_name text,
  body text,
  image_url text,
  image_path text,
  created_at timestamp with time zone DEFAULT now(),
  author_id uuid DEFAULT auth.uid(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id)
);

CREATE TABLE public.post_likes (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_likes_pkey PRIMARY KEY (post_id, user_id),
  CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  tags text[] NOT NULL DEFAULT '{}',
  image_url text,
  image_path text,
  votes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  author_id uuid DEFAULT auth.uid(),
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text,
  last_name text,
  avatar_url text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.tickers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  symbol text NOT NULL,
  name text,
  industry text,
  CONSTRAINT tickers_pkey PRIMARY KEY (id)
);
