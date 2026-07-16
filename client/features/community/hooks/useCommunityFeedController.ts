// File purpose: Composes only the Community Feed resource, actions, navigation, and feedback lifecycle.
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCommunityData } from "./useCommunityData";
import { useCommunityFeedback } from "./useCommunityFeedback";
import { useCommunityFeedActions } from "./useCommunityFeedActions";
import { useCommunityNavigationState } from "./useCommunityNavigationState";
import { useCommunitySession } from "./useCommunitySession";

export function useCommunityFeedController(supabase: SupabaseClient | null) {
  const navigation = useCommunityNavigationState();
  const session = useCommunitySession(supabase);
  const feedbackState = useCommunityFeedback();
  const communityData = useCommunityData({
    authLoading: session.authLoading,
    currentUserId: session.currentUserId,
    feedView: navigation.feedView,
    query: navigation.query,
    supabase,
    topTimeRange: navigation.topTimeRange,
  });
  const feedActions = useCommunityFeedActions({
    canDeleteComment: communityData.canDeleteComment,
    canDeletePost: communityData.canDeletePost,
    commentsState: communityData.commentsState,
    currentUserId: communityData.currentUserId,
    dispatchComments: communityData.dispatchComments,
    likedPostIds: communityData.likedPostIds,
    posts: communityData.posts,
    pushFeedback: feedbackState.pushFeedback,
    sessionKey: session.sessionKey,
    setLikedPostIds: communityData.setLikedPostIds,
    setPosts: communityData.setPosts,
    supabase,
  });

  return {
    ...navigation,
    ...feedbackState,
    ...feedActions,
    canDeleteComment: communityData.canDeleteComment,
    canDeletePost: communityData.canDeletePost,
    commentsState: communityData.commentsState,
    currentUserId: communityData.currentUserId,
    feedCounts: communityData.feedCounts,
    filteredPosts: communityData.filteredPosts,
    hasLoadedPosts: communityData.posts.length > 0,
    likedPostIds: communityData.likedPostIds,
    loadError: communityData.loadError,
    loadingCommunity: communityData.loadingCommunity,
  };
}
