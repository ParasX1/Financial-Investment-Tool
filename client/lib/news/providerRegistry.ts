import { gdeltProvider } from "./providers/gdeltProvider";
import { googleNewsRssProvider } from "./providers/googleNewsRssProvider";
import { yahooFinanceRssProvider } from "./providers/yahooFinanceRssProvider";
import type { NewsProvider } from "./types";

type ProviderDefinition = {
  aliases: readonly string[];
  provider: NewsProvider;
};

// Keep provider wiring in one place. Adding a source should only require a
// provider implementation plus one definition here.
const PROVIDER_DEFINITIONS: readonly ProviderDefinition[] = [
  {
    aliases: ["google", "google-news", "google-rss"],
    provider: googleNewsRssProvider,
  },
  {
    aliases: [],
    provider: gdeltProvider,
  },
  {
    aliases: ["yahoo", "yahoo-finance", "yahoo-rss"],
    provider: yahooFinanceRssProvider,
  },
];

const PROVIDERS_BY_ID = new Map(
  PROVIDER_DEFINITIONS.map(({ provider }) => [provider.id, provider]),
);

const PROVIDER_IDS_BY_ALIAS = new Map(
  PROVIDER_DEFINITIONS.flatMap(({ aliases, provider }) => [
    [provider.id, provider.id] as const,
    ...aliases.map((alias) => [alias, provider.id] as const),
  ]),
);

function normaliseProviderId(value: string) {
  return PROVIDER_IDS_BY_ALIAS.get(value.trim().toLowerCase());
}

export function resolveNewsProviders(
  env: Record<string, string | undefined> = process.env,
): NewsProvider[] {
  const requestedIds = (env.NEWS_PROVIDER_ORDER ?? "")
    .split(",")
    .map(normaliseProviderId)
    .filter((id): id is string => Boolean(id));
  const orderedIds = requestedIds.length
    ? requestedIds
    : PROVIDER_DEFINITIONS.map(({ provider }) => provider.id);
  const seen = new Set<string>();

  return orderedIds
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((id) => PROVIDERS_BY_ID.get(id))
    .filter((provider): provider is NewsProvider => Boolean(provider));
}
