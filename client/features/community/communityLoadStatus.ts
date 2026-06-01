export function getCommunityLoadErrorMessage({
  commentsError,
  likesError,
}: {
  commentsError?: string;
  likesError?: string;
}) {
  return [commentsError, likesError].filter(Boolean).join(" ") || null;
}
