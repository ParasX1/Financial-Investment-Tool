// File purpose: Owns Home entry routing and the mutually exclusive authentication dialogs.
import * as React from "react";
import type { HomeEntryDestination, HomeRouteLink } from "../types";

export type HomeAuthDialog = "login" | "signup" | null;

const DEFAULT_HOME_DESTINATION: HomeEntryDestination = "/dashboardView";

type HomeEntryState = {
  authDialog: HomeAuthDialog;
  redirectTo: HomeEntryDestination;
};

type HomeEntryControllerOptions = {
  authLoading: boolean;
  navigate: (href: string) => unknown;
  signedIn: boolean;
};

function createInitialState(): HomeEntryState {
  return {
    authDialog: null,
    redirectTo: DEFAULT_HOME_DESTINATION,
  };
}

export function useHomeEntryController({
  authLoading,
  navigate,
  signedIn,
}: HomeEntryControllerOptions) {
  const [entryState, setEntryState] =
    React.useState<HomeEntryState>(createInitialState);

  const openAuthDialog = React.useCallback(
    (
      authDialog: Exclude<HomeAuthDialog, null>,
      redirectTo: HomeEntryDestination,
    ) => {
      if (authLoading) return;

      if (signedIn) {
        void navigate(redirectTo);
        return;
      }

      setEntryState({ authDialog, redirectTo });
    },
    [authLoading, navigate, signedIn],
  );

  const openLogin = React.useCallback(
    (redirectTo = DEFAULT_HOME_DESTINATION) => {
      openAuthDialog("login", redirectTo);
    },
    [openAuthDialog],
  );

  const openSignUp = React.useCallback(
    (redirectTo = DEFAULT_HOME_DESTINATION) => {
      openAuthDialog("signup", redirectTo);
    },
    [openAuthDialog],
  );

  const selectRoute = React.useCallback(
    (route: HomeRouteLink) => {
      if (authLoading) return;

      if (route.gated && !signedIn) {
        setEntryState({
          authDialog: "login",
          redirectTo: route.href,
        });
        return;
      }

      void navigate(route.href);
    },
    [authLoading, navigate, signedIn],
  );

  const switchToLogin = React.useCallback(() => {
    setEntryState((current) => ({
      ...current,
      authDialog: "login",
    }));
  }, []);

  const switchToSignUp = React.useCallback(() => {
    setEntryState((current) => ({
      ...current,
      authDialog: "signup",
    }));
  }, []);

  const closeAuthDialog = React.useCallback(() => {
    setEntryState((current) => ({
      ...current,
      authDialog: null,
    }));
  }, []);

  return {
    authDialog: entryState.authDialog,
    authLoading,
    closeAuthDialog,
    openLogin,
    openSignUp,
    redirectTo: entryState.redirectTo,
    selectRoute,
    signedIn,
    switchToLogin,
    switchToSignUp,
  };
}
