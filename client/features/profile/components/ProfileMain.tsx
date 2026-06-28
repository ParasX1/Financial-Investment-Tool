import * as React from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { fitFeedback } from "@/components/shared/fitStyles";
import { FitPageHeader } from "@/components/shared/FitPageHeader";
import { FitPageShell } from "@/components/shared/FitPageShell";
import {
  FIT_CONTENT_MAX_WIDTH_PX,
  FIT_FOCUS_VISIBLE,
  cn,
} from "@/components/shared/uiPrimitives";
import { PROFILE_PRIMARY_TABS } from "../data/profileSections";
import { useProfileController } from "../hooks/useProfileController";
import type { ProfileSectionId } from "../types";
import { ProfileAvatarPanel } from "./ProfileAvatarPanel";
import { ProfileDetailsPanel } from "./ProfileDetailsPanel";
import { ProfileSectionNav } from "./ProfileSectionNav";
import { ProfileSecurityPanel } from "./ProfileSecurityPanel";
import { ProfileStatusRail } from "./ProfileStatusRail";
import styles from "../styles/profile.module.css";

const messageToneClass = {
  error: fitFeedback.error,
  info: fitFeedback.info,
  success: fitFeedback.success,
} as const;

export function ProfileMain() {
  const profile = useProfileController();
  const [activeSectionId, setActiveSectionId] =
    React.useState<ProfileSectionId>("profile-card");
  const hasAccount = Boolean(profile.user);
  const showAccountRequired = !profile.authLoading && !hasAccount;

  const selectSection = React.useCallback((sectionId: ProfileSectionId) => {
    setActiveSectionId(sectionId);
    window.requestAnimationFrame(() => {
      const target = document.getElementById(sectionId);
      target?.scrollIntoView({ block: "start", behavior: "smooth" });
      target?.focus?.({ preventScroll: true });
    });
  }, []);

  const activeTabId =
    activeSectionId === "security" ? "security" : "personal-settings";

  return (
    <FitPageShell
      className={styles.shell}
      skipLabel="Skip to profile settings"
      skipTargetId="profile-main"
    >
      <main id="profile-main" tabIndex={-1} className={styles.page}>
        <div
          className={styles.pageInner}
          style={{ maxWidth: FIT_CONTENT_MAX_WIDTH_PX }}
        >
          <FitPageHeader
            title="Profile Settings"
            subtitle="Manage your FIT account identity, private details, verification, and password from one settings workspace."
            subtitleClassName="max-w-[48rem]"
          />

          {hasAccount ? (
            <nav className={styles.primaryTabs} aria-label="Account settings">
              {PROFILE_PRIMARY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={activeTabId === tab.id}
                  className={cn(
                    styles.primaryTab,
                    activeTabId === tab.id ? styles.primaryTabActive : null,
                    FIT_FOCUS_VISIBLE,
                  )}
                  onClick={() => selectSection(tab.targetSectionId)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          ) : null}

          <div className={hasAccount ? styles.layout : styles.signedOutLayout}>
            {hasAccount ? (
              <ProfileSectionNav
                activeSectionId={activeSectionId}
                onSelect={selectSection}
              />
            ) : null}

            <div className={styles.contentStack}>
              {profile.message ? (
                <div
                  className={cn(
                    styles.message,
                    messageToneClass[profile.message.tone],
                  )}
                  role={profile.message.tone === "error" ? "alert" : "status"}
                  aria-live="polite"
                >
                  {profile.message.text}
                </div>
              ) : null}

              {showAccountRequired ? (
                <section className={styles.panel}>
                  <div className={styles.signedOutPanel}>
                    <p className={styles.eyebrow}>Account required</p>
                    <h2 className={styles.panelTitle}>
                      Sign in to manage your profile
                    </h2>
                    <p className={styles.panelSubtitle}>
                      Profile details, avatar uploads, verification, and
                      password changes are available after sign-in.
                    </p>
                  </div>
                </section>
              ) : !hasAccount ? (
                <section className={styles.panel}>
                  <div className={styles.signedOutPanel}>
                    <p className={styles.eyebrow}>Loading</p>
                    <h2 className={styles.panelTitle}>Loading your profile</h2>
                    <p className={styles.panelSubtitle}>
                      Checking your account session before showing editable
                      profile settings.
                    </p>
                  </div>
                </section>
              ) : (
                <>
                  <div
                    aria-busy={profile.profileLoading || profile.authLoading}
                    className="grid min-w-0 gap-4"
                  >
                    <div className={styles.actionRow}>
                      {profile.isEditing ? (
                        <button
                          type="button"
                          className={cn(
                            styles.button,
                            styles.buttonGhost,
                            FIT_FOCUS_VISIBLE,
                          )}
                          onClick={profile.cancelEditing}
                        >
                          <CloseRoundedIcon
                            sx={{ fontSize: 17 }}
                            aria-hidden="true"
                          />
                          Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={cn(
                            styles.button,
                            styles.buttonSecondary,
                            FIT_FOCUS_VISIBLE,
                          )}
                          onClick={profile.startEditing}
                        >
                          <EditRoundedIcon
                            sx={{ fontSize: 17 }}
                            aria-hidden="true"
                          />
                          Unlock editing
                        </button>
                      )}
                    </div>

                    <ProfileAvatarPanel
                      avatarDisplayUrl={profile.avatarDisplayUrl}
                      displayName={profile.displayName}
                      email={profile.email}
                      initials={profile.initials}
                      isEditing={profile.isEditing}
                      onAvatarChange={profile.changeAvatar}
                    />
                    <ProfileDetailsPanel
                      email={profile.email}
                      emailVerified={profile.emailVerified}
                      errors={profile.errors}
                      firstName={profile.firstName}
                      isEditing={profile.isEditing}
                      lastName={profile.lastName}
                      phone={profile.phone}
                      saving={profile.saving}
                      sendingVerification={profile.sendingVerification}
                      onFieldChange={profile.updateProfileField}
                      onResendVerification={profile.resendVerification}
                      onSave={profile.saveProfile}
                    />
                    <ProfileSecurityPanel
                      confirmPassword={profile.confirmPassword}
                      isEditing={profile.isEditing}
                      newPassword={profile.newPassword}
                      setConfirmPassword={profile.setConfirmPassword}
                      setNewPassword={profile.setNewPassword}
                      updatingPassword={profile.updatingPassword}
                      onChangePassword={profile.changePassword}
                    />
                  </div>
                </>
              )}
            </div>

            <ProfileStatusRail
              emailVerified={profile.emailVerified}
              isEditing={profile.isEditing}
              userIdPreview={profile.userIdPreview}
            />
          </div>
        </div>
      </main>
    </FitPageShell>
  );
}
