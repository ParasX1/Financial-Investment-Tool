// File purpose: Builds user-facing partial-load warnings when secondary Community queries fail.
export function getCommunityLoadErrorMessage({
  commentsError,
  likesError,
}: {
  commentsError?: string;
  likesError?: string;
}) {
  return [commentsError, likesError].filter(Boolean).join(" ") || null;
}
