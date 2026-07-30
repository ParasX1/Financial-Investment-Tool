// File purpose: Adapts authentication and routing into the route-ready Home landing screen.
import * as React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAuth } from "@/components/authContext";
import { AuthDialog } from "@/features/auth";
import {
  homeExperiencePoints,
  homeFooterGroups,
  homeMetadata,
  homeRouteLinks,
} from "../data/homeContent";
import { useHomeEntryController } from "../hooks/useHomeEntryController";
import { HomeCtaSection } from "../components/HomeCtaSection";
import { HomeFooter } from "../components/HomeFooter";
import { HomeExperienceSection } from "../components/HomeExperienceSection";
import { HomeHero } from "../components/HomeHero";
import { HomeNavigation } from "../components/HomeNavigation";
import { HomeProductSection } from "../components/HomeProductSection";
import styles from "../styles/home.module.css";

export type HomeScreenController = ReturnType<typeof useHomeEntryController>;

export function HomeScreenView({
  controller,
}: {
  controller: HomeScreenController;
}) {
  const {
    authDialog,
    authLoading,
    closeAuthDialog,
    openLogin,
    openSignUp,
    redirectTo,
    selectRoute,
    signedIn,
  } = controller;

  return (
    <>
      <Head>
        <title>{homeMetadata.title}</title>
        <meta name="description" content={homeMetadata.description} />
        <meta name="theme-color" content={homeMetadata.themeColor} />
      </Head>

      <div className={styles.shell}>
        <HomeNavigation
          loading={authLoading}
          signedIn={signedIn}
          onSignIn={() => openLogin()}
        />

        <main id="main-content" className={styles.page} tabIndex={-1}>
          <HomeHero
            authLoading={authLoading}
            signedIn={signedIn}
            onSignIn={() => openLogin()}
          />
          <div className={styles.content}>
            <HomeProductSection
              authLoading={authLoading}
              routes={homeRouteLinks}
              signedIn={signedIn}
              onRouteSelect={selectRoute}
            />
            <HomeExperienceSection points={homeExperiencePoints} />
            <HomeCtaSection
              authLoading={authLoading}
              signedIn={signedIn}
              onCreateAccount={() => openSignUp()}
            />
          </div>
        </main>

        <HomeFooter
          groups={homeFooterGroups}
          loading={authLoading}
          signedIn={signedIn}
          onSignIn={() => openLogin()}
        />

        <AuthDialog
          initialMode={authDialog === "signup" ? "sign-up" : "sign-in"}
          redirectTo={redirectTo}
          show={authDialog !== null}
          onHide={closeAuthDialog}
        />
      </div>
    </>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const { loading, user } = useAuth();
  const navigate = React.useCallback(
    (href: string) => router.push(href),
    [router],
  );
  const controller = useHomeEntryController({
    authLoading: loading,
    navigate,
    signedIn: Boolean(user),
  });

  return <HomeScreenView controller={controller} />;
}
