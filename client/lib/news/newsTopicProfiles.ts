const LEGACY_NEWS_TOPIC_PROFILE_ALIASES: Readonly<Record<string, string>> = {
  "money-news": "money",
};

export function resolveNewsTopicProfileId(topicId: string | undefined) {
  if (!topicId) return undefined;

  return LEGACY_NEWS_TOPIC_PROFILE_ALIASES[topicId] ?? topicId;
}
