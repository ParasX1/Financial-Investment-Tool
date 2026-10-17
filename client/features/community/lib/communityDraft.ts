// File purpose: Normalizes discussion drafts and checks whether draft content should block navigation.
import type { DiscussionDraft, DiscussionPostInput } from "../types";
import { normalizeSelectedTags } from "./smartTags";
import {
  normalizeCommunityTickers,
  parseCommunityTickerInput,
} from "./communityTickers";
import {
  normalizeCommunityPostType,
  normalizeCommunitySourceUrl,
  normalizeCommunitySymbol,
  normalizeCommunityTimeFrame,
} from "./communityPostMetadata";

export function normalizeDiscussionDraft(
  draft: Pick<DiscussionDraft, "title" | "body" | "tags"> & {
    postType?: DiscussionDraft["postType"] | null;
    timeFrame?: DiscussionDraft["timeFrame"] | null;
    tickers?: DiscussionDraft["tickers"] | null;
    tickerInput?: DiscussionDraft["tickerInput"] | null;
    symbol?: string | null;
    sourceUrl?: DiscussionDraft["sourceUrl"] | null;
  },
): DiscussionPostInput {
  const title = draft.title.trim().replace(/\s+/g, " ");
  const body = draft.body.trim();
  const tickers = normalizeCommunityTickers([
    ...(draft.tickers ?? []),
    ...parseCommunityTickerInput(draft.tickerInput ?? draft.symbol ?? ""),
  ]);

  return {
    title,
    body,
    tags: normalizeSelectedTags(draft.tags).filter(
      (tag) => !tag.startsWith("$"),
    ),
    postType: normalizeCommunityPostType(draft.postType),
    timeFrame: normalizeCommunityTimeFrame(draft.timeFrame),
    tickers,
    symbol: tickers[0] ?? normalizeCommunitySymbol(draft.symbol),
    sourceUrl: normalizeCommunitySourceUrl(draft.sourceUrl),
  };
}

export function isDiscussionDraftDirty(draft: DiscussionDraft) {
  return Boolean(
    draft.title.trim() ||
      draft.body.trim() ||
      draft.tags.length ||
      (draft.postType && draft.postType !== "discussion") ||
      draft.timeFrame ||
      draft.tickers?.length ||
      draft.tickerInput?.trim() ||
      draft.sourceUrl?.trim() ||
      draft.imageFile,
  );
}
