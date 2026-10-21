import * as React from "react";
import { DEFAULT_AUTH_REDIRECT_PATH } from "../lib/authRedirect";
import type { AuthMode } from "../types";

type AuthDialogState = {
  mode: AuthMode | null;
  redirectTo: string;
};

export function useAuthDialog() {
  const [state, setState] = React.useState<AuthDialogState>({
    mode: null,
    redirectTo: DEFAULT_AUTH_REDIRECT_PATH,
  });

  const openSignIn = React.useCallback((redirectTo = DEFAULT_AUTH_REDIRECT_PATH) => {
    setState({ mode: "sign-in", redirectTo });
  }, []);
  const openSignUp = React.useCallback((redirectTo = DEFAULT_AUTH_REDIRECT_PATH) => {
    setState({ mode: "sign-up", redirectTo });
  }, []);
  const close = React.useCallback(() => {
    setState((current) => ({ ...current, mode: null }));
  }, []);

  return {
    close,
    dialogProps: {
      initialMode: state.mode ?? "sign-in",
      redirectTo: state.redirectTo,
      show: state.mode !== null,
    },
    openSignIn,
    openSignUp,
  };
}
