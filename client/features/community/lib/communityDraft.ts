// File purpose: Normalizes discussion drafts and checks whether draft content should block navigation.
import type {
  DiscussionDraft,
  DiscussionPostInput,
} from "../types";
import { normalizeSelectedTags } from "./smartTags";

export function normalizeDiscussionDraft(
  draft: Pick<DiscussionDraft, "title" | "body" | "tags">,
): DiscussionPostInput {
  const title = draft.title.trim().replace(/\s+/g, " ");
  const body = draft.body.trim();

  return {
    title,
    body,
    tags: normalizeSelectedTags(draft.tags),
  };
}

export function isDiscussionDraftDirty(draft: DiscussionDraft) {
  return Boolean(
    draft.title.trim() ||
      draft.body.trim() ||
      draft.tags.length ||
      draft.imageFile,
  );
}
