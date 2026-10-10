// File purpose: Builds user-facing partial-load warnings when secondary Community queries fail.
export function getCommunityLoadErrorMessage({
  commentsError,
  likesError,
  savesError,
}: {
  commentsError?: string;
  likesError?: string;
  savesError?: string;
}) {
  return (
    [commentsError, likesError, savesError].filter(Boolean).join(" ") || null
  );
}
