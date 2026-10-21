// File purpose: Manages the stack of user-facing Community feedback messages.
import * as React from "react";
import type { FeedbackMessage } from "../types";

export function useCommunityFeedback() {
  const [feedback, setFeedback] = React.useState<FeedbackMessage[]>([]);

  const pushFeedback = React.useCallback(
    (message: Omit<FeedbackMessage, "id">) => {
      const id = `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setFeedback((previous) => [...previous.slice(-2), { id, ...message }]);
    },
    [],
  );

  const dismissFeedback = React.useCallback((id: string) => {
    setFeedback((previous) => previous.filter((item) => item.id !== id));
  }, []);

  return {
    feedback,
    pushFeedback,
    dismissFeedback,
  };
}
