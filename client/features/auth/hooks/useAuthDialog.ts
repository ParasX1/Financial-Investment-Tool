import * as React from "react";
import type { AuthMode } from "../types";

const DEFAULT_REDIRECT = "/dashboardView";

type AuthDialogState = {
  mode: AuthMode | null;
  redirectTo: string;
};

export function useAuthDialog() {
  const [state, setState] = React.useState<AuthDialogState>({
    mode: null,
    redirectTo: DEFAULT_REDIRECT,
  });

  const openSignIn = React.useCallback((redirectTo = DEFAULT_REDIRECT) => {
    setState({ mode: "sign-in", redirectTo });
  }, []);
  const openSignUp = React.useCallback((redirectTo = DEFAULT_REDIRECT) => {
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
