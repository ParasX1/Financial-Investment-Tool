// File purpose: Manages create-post draft text, metadata, tags, attached image preview, and draft reset behavior.
import * as React from "react";
import type {
  DiscussionDraft,
  DiscussionDraftField,
  DiscussionDraftMetadataField,
} from "../types";
import {
  MAX_DISCUSSION_TAGS,
  getDefaultSelectedTags,
  normalizeSelectedTags,
} from "../lib/smartTags";
import { normalizeCommunityTickers } from "../lib/communityTickers";

const EMPTY_DISCUSSION_DRAFT: DiscussionDraft = {
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

export function useCommunityDraft() {
  const [draft, setDraft] = React.useState<DiscussionDraft>(
    EMPTY_DISCUSSION_DRAFT,
  );
  const tagsEditedRef = React.useRef(false);
  const draftImagePreviewRef = React.useRef<string | null>(null);

  const setDraftField = React.useCallback(
    (field: DiscussionDraftField, value: string) => {
      setDraft((previous) => {
        const next = { ...previous, [field]: value };

        if (!next.title.trim() && !next.body.trim()) {
          tagsEditedRef.current = false;
          return { ...next, tags: [] };
        }

        if (tagsEditedRef.current) return next;
        return { ...next, tags: getDefaultSelectedTags(next) };
      });
    },
    [],
  );

  const setDraftMetadataField = React.useCallback(
    (field: DiscussionDraftMetadataField, value: string) => {
      setDraft((previous) => ({ ...previous, [field]: value }));
    },
    [],
  );

  const setDraftTickers = React.useCallback((tickers: string[]) => {
    setDraft((previous) => ({
      ...previous,
      tickers: normalizeCommunityTickers(tickers),
    }));
  }, []);

  const toggleDraftTag = React.useCallback((tag: string) => {
    tagsEditedRef.current = true;

    setDraft((previous) => {
      const selected = normalizeSelectedTags(previous.tags);

      if (selected.includes(tag)) {
        return {
          ...previous,
          tags: selected.filter((item) => item !== tag),
        };
      }

      if (selected.length >= MAX_DISCUSSION_TAGS) return previous;

      return {
        ...previous,
        tags: normalizeSelectedTags([...selected, tag]),
      };
    });
  }, []);

  const clearDraftTags = React.useCallback(() => {
    tagsEditedRef.current = true;
    setDraft((previous) => ({ ...previous, tags: [] }));
  }, []);

  const setDraftImage = React.useCallback((file: File | null) => {
    setDraft((previous) => {
      if (draftImagePreviewRef.current) {
        URL.revokeObjectURL(draftImagePreviewRef.current);
        draftImagePreviewRef.current = null;
      }

      if (!file) {
        return { ...previous, imageFile: null, imagePreviewUrl: null };
      }

      const imagePreviewUrl = URL.createObjectURL(file);
      draftImagePreviewRef.current = imagePreviewUrl;

      return { ...previous, imageFile: file, imagePreviewUrl };
    });
  }, []);

  const resetDraft = React.useCallback(() => {
    if (draftImagePreviewRef.current) {
      URL.revokeObjectURL(draftImagePreviewRef.current);
      draftImagePreviewRef.current = null;
    }

    tagsEditedRef.current = false;
    setDraft(EMPTY_DISCUSSION_DRAFT);
  }, []);

  React.useEffect(
    () => () => {
      if (draftImagePreviewRef.current) {
        URL.revokeObjectURL(draftImagePreviewRef.current);
      }
    },
    [],
  );

  return {
    draft,
    setDraftField,
    setDraftMetadataField,
    setDraftTickers,
    toggleDraftTag,
    clearDraftTags,
    setDraftImage,
    resetDraft,
  };
}
