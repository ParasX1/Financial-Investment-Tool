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
  tickers: [],
  tickerInput: "",
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
  const {
    draft,
    clearDraftTags: clearDraftTagsState,
    resetDraft: resetDraftState,
    setDraftField: setDraftFieldState,
    setDraftImage: setDraftImageState,
    setDraftMetadataField: setDraftMetadataFieldState,
    setDraftTickers: setDraftTickersState,
    toggleDraftTag: toggleDraftTagState,
  } = useCommunityDraft();
  const ownerRef = React.useRef(ownerKey);
  const ownerMatches =
    ownerRef.current === ownerKey ||
    canTransferDraft(ownerRef.current, ownerKey);

  React.useEffect(() => {
    const previousOwner = ownerRef.current;
    if (previousOwner === ownerKey) return;

    ownerRef.current = ownerKey;
    if (!canTransferDraft(previousOwner, ownerKey)) {
      resetDraftState();
    }
  }, [ownerKey, resetDraftState]);

  const mayEditCurrentDraft = React.useCallback(
    () =>
      ownerRef.current === ownerKey ||
      canTransferDraft(ownerRef.current, ownerKey),
    [ownerKey],
  );

  const setDraftField = React.useCallback(
    (...args: Parameters<typeof setDraftFieldState>) => {
      if (mayEditCurrentDraft()) setDraftFieldState(...args);
    },
    [mayEditCurrentDraft, setDraftFieldState],
  );
  const setDraftMetadataField = React.useCallback(
    (...args: Parameters<typeof setDraftMetadataFieldState>) => {
      if (mayEditCurrentDraft()) setDraftMetadataFieldState(...args);
    },
    [mayEditCurrentDraft, setDraftMetadataFieldState],
  );
  const toggleDraftTag = React.useCallback(
    (...args: Parameters<typeof toggleDraftTagState>) => {
      if (mayEditCurrentDraft()) toggleDraftTagState(...args);
    },
    [mayEditCurrentDraft, toggleDraftTagState],
  );
  const setDraftTickers = React.useCallback(
    (...args: Parameters<typeof setDraftTickersState>) => {
      if (mayEditCurrentDraft()) setDraftTickersState(...args);
    },
    [mayEditCurrentDraft, setDraftTickersState],
  );
  const clearDraftTags = React.useCallback(() => {
    if (mayEditCurrentDraft()) clearDraftTagsState();
  }, [clearDraftTagsState, mayEditCurrentDraft]);
  const setDraftImage = React.useCallback(
    (...args: Parameters<typeof setDraftImageState>) => {
      if (mayEditCurrentDraft()) setDraftImageState(...args);
    },
    [mayEditCurrentDraft, setDraftImageState],
  );
  const resetDraft = React.useCallback(() => {
    if (mayEditCurrentDraft()) resetDraftState();
  }, [mayEditCurrentDraft, resetDraftState]);

  return {
    draft: ownerMatches ? draft : EMPTY_DRAFT,
    setDraftField,
    setDraftMetadataField,
    setDraftTickers,
    toggleDraftTag,
    clearDraftTags,
    setDraftImage,
    resetDraft,
  };
}
