// File purpose: Keeps Create drafts account-scoped while safely carrying a signed-out draft through login.
import * as React from "react";
import type { DiscussionDraft } from "../types";
import { useCommunityDraft } from "./useCommunityDraft";

const EMPTY_DRAFT: DiscussionDraft = {
  title: "",
  body: "",
  tags: [],
  postType: "",
  timeFrame: "",
  symbol: "",
  sourceUrl: "",
  imageFile: null,
  imagePreviewUrl: null,
};

function canTransferDraft(previousOwner: string, nextOwner: string) {
  return (
    (previousOwner === "signed-out" || previousOwner === "auth-loading") &&
    nextOwner.startsWith("user:")
  );
}

export function useCommunityOwnedDraft(ownerKey: string) {
  const draftState = useCommunityDraft();
  const ownerRef = React.useRef(ownerKey);
  const ownerMatches =
    ownerRef.current === ownerKey ||
    canTransferDraft(ownerRef.current, ownerKey);

  React.useEffect(() => {
    const previousOwner = ownerRef.current;
    if (previousOwner === ownerKey) return;

    ownerRef.current = ownerKey;
    if (!canTransferDraft(previousOwner, ownerKey)) {
      draftState.resetDraft();
    }
  }, [draftState.resetDraft, ownerKey]);

  const mayEditCurrentDraft = React.useCallback(
    () =>
      ownerRef.current === ownerKey ||
      canTransferDraft(ownerRef.current, ownerKey),
    [ownerKey],
  );

  const setDraftField = React.useCallback(
    (...args: Parameters<typeof draftState.setDraftField>) => {
      if (mayEditCurrentDraft()) draftState.setDraftField(...args);
    },
    [draftState.setDraftField, mayEditCurrentDraft],
  );
  const setDraftMetadataField = React.useCallback(
    (...args: Parameters<typeof draftState.setDraftMetadataField>) => {
      if (mayEditCurrentDraft()) draftState.setDraftMetadataField(...args);
    },
    [draftState.setDraftMetadataField, mayEditCurrentDraft],
  );
  const toggleDraftTag = React.useCallback(
    (...args: Parameters<typeof draftState.toggleDraftTag>) => {
      if (mayEditCurrentDraft()) draftState.toggleDraftTag(...args);
    },
    [draftState.toggleDraftTag, mayEditCurrentDraft],
  );
  const clearDraftTags = React.useCallback(() => {
    if (mayEditCurrentDraft()) draftState.clearDraftTags();
  }, [draftState.clearDraftTags, mayEditCurrentDraft]);
  const setDraftImage = React.useCallback(
    (...args: Parameters<typeof draftState.setDraftImage>) => {
      if (mayEditCurrentDraft()) draftState.setDraftImage(...args);
    },
    [draftState.setDraftImage, mayEditCurrentDraft],
  );
  const resetDraft = React.useCallback(() => {
    if (mayEditCurrentDraft()) draftState.resetDraft();
  }, [draftState.resetDraft, mayEditCurrentDraft]);

  return {
    draft: ownerMatches ? draftState.draft : EMPTY_DRAFT,
    setDraftField,
    setDraftMetadataField,
    toggleDraftTag,
    clearDraftTags,
    setDraftImage,
    resetDraft,
  };
}
