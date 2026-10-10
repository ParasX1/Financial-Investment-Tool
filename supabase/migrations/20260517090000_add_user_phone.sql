-- Stores the phone number edited from the Profile settings page.
ALTER TABLE "public"."Users"
ADD COLUMN IF NOT EXISTS "phone" "text";
