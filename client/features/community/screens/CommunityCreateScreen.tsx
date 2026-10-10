// File purpose: Owns the Community Create route composition, draft guard, and publish navigation.
import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/router";
import { CommunityComposer } from "../components/CommunityComposer";
import { FeedbackStack, CommunityNotice } from "../components/CommunityFeedback";
import { CommunityLayout } from "../components/CommunityLayout";
import { CommunityToolbar } from "../components/CommunityToolbar";
import { useCommunityCreateController } from "../hooks/useCommunityCreateController";
import { useCommunityDraftNavigation } from "../hooks/useCommunityDraftNavigation";
import { useCommunityRouteSync } from "../hooks/useCommunityRouteSync";
import { getCommunityCreateHref, getCommunityFeedHref } from "../lib/communityRouting";
import communityStyles from "../styles/community.module.css";
import type { CommunityFeedView, CommunityTopTimeRange } from "../types";

export function CommunityCreateScreen({
  supabase,
}: {
  supabase: SupabaseClient | null;
}) {
  const router = useRouter();
  const community = useCommunityCreateController(supabase);
  const { pushFeedback, setFeedView, setQuery, setTopTimeRange } = community;
  const { navigateWithDraftGuard } = useCommunityDraftNavigation({
    draft: community.draft,
    pushFeedback,
    router,
  });

  useCommunityRouteSync({
    router,
    setFeedView,
    setQuery,
    setTopTimeRange,
  });

  const feedHref = getCommunityFeedHref(
    community.feedView,
    community.query,
    community.topTimeRange,
  );

  const handleFeedViewChange = React.useCallback(
    (view: CommunityFeedView) => {
      navigateWithDraftGuard(`feed:${view}`, () => {
        setFeedView(view);
        router.push(
          getCommunityFeedHref(
            view,
            community.query,
            community.topTimeRange,
          ),
        );
      });
    },
    [
      community.query,
      community.topTimeRange,
      navigateWithDraftGuard,
      router,
      setFeedView,
    ],
  );

  const handleTopTimeRangeChange = React.useCallback(
    (range: CommunityTopTimeRange) => {
      setTopTimeRange(range);
      router.replace(
        getCommunityCreateHref(
          community.feedView,
          community.query,
          range,
        ),
        undefined,
        { shallow: true },
      );
    },
    [community.feedView, community.query, router, setTopTimeRange],
  );

  const handleSearchSubmit = React.useCallback(() => {
    const href = getCommunityFeedHref(
      community.feedView,
      community.query.trim(),
      community.topTimeRange,
    );
    navigateWithDraftGuard("search", () => router.push(href));
  }, [
    community.feedView,
    community.query,
    community.topTimeRange,
    navigateWithDraftGuard,
    router,
  ]);

  const handleBack = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      navigateWithDraftGuard("back-to-feed", () => router.push(feedHref));
    },
    [feedHref, navigateWithDraftGuard, router],
  );

  return (
    <CommunityLayout
      activeTimeRange={community.topTimeRange}
      activeView={community.feedView}
      onTimeRangeChange={handleTopTimeRangeChange}
      onViewChange={handleFeedViewChange}
      toolbar={
        <CommunityToolbar
          actionHref={feedHref}
          actionLabel="Back"
          actionType="back"
          query={community.query}
          onActionClick={handleBack}
          onQueryChange={community.setQuery}
          onSearchSubmit={handleSearchSubmit}
        />
      }
    >
      {!supabase ? (
        <div className="mt-4">
          <CommunityNotice>
            Supabase environment variables are missing, so new posts and
            comments stay local until the page refreshes.
          </CommunityNotice>
        </div>
      ) : null}

      <CommunityComposer
        className={communityStyles.primaryContentStart}
        draft={community.draft}
        creating={community.creating}
        canAttachImage={Boolean(supabase && community.currentUserId)}
        onDraftChange={community.setDraftField}
        onDraftMetadataChange={community.setDraftMetadataField}
        onDraftTickersChange={community.setDraftTickers}
        onClearTags={community.clearDraftTags}
        onDraftImageChange={community.setDraftImage}
        onToggleTag={community.toggleDraftTag}
        onSubmit={async () => {
          const created = await community.handleCreatePost();
          if (created) {
            router.push(
              getCommunityFeedHref(
                community.feedView,
                community.query,
                community.topTimeRange,
              ),
            );
          }
        }}
      />

      <FeedbackStack
        items={community.feedback}
        onDismiss={community.dismissFeedback}
      />
    </CommunityLayout>
  );
}
