import * as React from "react";
import { useRouter } from "next/router";
import ModalLogin from "@/components/Modal/ModalLogin";
import ModalSignUp from "@/components/Modal/ModalSignUp";
import { useAuth } from "@/components/authContext";
import {
  homeExperiencePoints,
  homeFooterLinks,
  homeNavItems,
  homeRouteLinks,
} from "../data/homeContent";
import type { HomeRouteLink } from "../types";
import { HomeFooter } from "./HomeFooter";
import { HomeExperienceSection } from "./HomeExperienceSection";
import { HomeHero } from "./HomeHero";
import { HomeNavigation } from "./HomeNavigation";
import { HomeProductSection } from "./HomeProductSection";
import styles from "../styles/home.module.css";

export function HomeMain() {
  const router = useRouter();
  const { loading, user } = useAuth();
  const [showLogin, setShowLogin] = React.useState(false);
  const [showSignUp, setShowSignUp] = React.useState(false);
  const signedIn = Boolean(user);

  const openWorkspace = React.useCallback(() => {
    if (signedIn) {
      router.push("/dashboardView");
      return;
    }

    setShowLogin(true);
  }, [router, signedIn]);

  const openRoute = React.useCallback(
    (route: HomeRouteLink) => {
      if (route.gated && !signedIn) {
        setShowLogin(true);
        return;
      }

      router.push(route.href);
    },
    [router, signedIn],
  );

  return (
    <div className={styles.shell}>
      <HomeNavigation
        loading={loading}
        navItems={homeNavItems}
        signedIn={signedIn}
        onSignIn={() => setShowLogin(true)}
      />

      <main id="main-content" className={styles.page} tabIndex={-1}>
        <HomeHero
          signedIn={signedIn}
          onOpenWorkspace={openWorkspace}
        />
        <div className={styles.content}>
          <HomeProductSection
            routes={homeRouteLinks}
            signedIn={signedIn}
            onRouteSelect={openRoute}
          />
          <HomeExperienceSection points={homeExperiencePoints} />
        </div>
      </main>

      <HomeFooter links={homeFooterLinks} />

      <ModalLogin
        redirectTo="/dashboardView"
        show={showLogin}
        onShowSignUp={() => {
          setShowLogin(false);
          setShowSignUp(true);
        }}
        onHide={() => setShowLogin(false)}
      />
      <ModalSignUp
        redirectTo="/dashboardView"
        show={showSignUp}
        setLogin={(nextShowLogin) => {
          setShowSignUp(false);
          setShowLogin(nextShowLogin);
        }}
        onHide={() => setShowSignUp(false)}
      />
    </div>
  );
}
