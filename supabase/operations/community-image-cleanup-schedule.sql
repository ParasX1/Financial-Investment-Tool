-- Apply only after the protected Edge worker passes hosted acceptance.
-- Substitute the verified project URL in this administrator operation.
-- Source migration replay never installs a production schedule.
select cron.schedule(
  'fit-community-image-cleanup',
  '*/5 * * * *',
  $job$select private.invoke_community_image_cleanup('https://<project-ref>.supabase.co/functions/v1/community-image-cleanup');$job$
);
