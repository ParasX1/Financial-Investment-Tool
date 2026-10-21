-- Stores the user-facing profile handle edited from the Profile settings page.
ALTER TABLE "public"."Users"
ADD COLUMN IF NOT EXISTS "handle" "text";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Users_handle_format_check'
      AND conrelid = 'public."Users"'::regclass
  ) THEN
    ALTER TABLE "public"."Users"
    ADD CONSTRAINT "Users_handle_format_check"
    CHECK ("handle" IS NULL OR "handle" ~ '^[a-z][a-z0-9_]{2,29}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Users_handle_unique_idx"
ON "public"."Users" (lower("handle"))
WHERE "handle" IS NOT NULL;
