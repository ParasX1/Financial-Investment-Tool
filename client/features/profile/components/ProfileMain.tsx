import * as React from "react";
import ModalLogin from "@/components/Modal/ModalLogin";
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
import type {
  ProfileContactValues,
  ProfileIdentityValues,
  ProfileSectionId,
} from "../types";
import {
  ProfileDetailsSection,
  ProfileIdentitySection,
  ProfileOverviewSection,
  ProfileSecuritySection,
} from "./ProfileAccountSections";
import { ProfileEditDialog } from "./ProfileEditDialog";
import { ProfileField } from "./ProfileField";
import { ProfileSectionNav } from "./ProfileSectionNav";
import styles from "../styles/profile.module.css";

type ActiveDialog = "identity" | "contact" | "password" | null;

const messageToneClass = {
  error: fitFeedback.error,
  info: fitFeedback.info,
  success: fitFeedback.success,
} as const;

export function ProfileMain() {
  const profile = useProfileController();
  const [activeSectionId, setActiveSectionId] =
    React.useState<ProfileSectionId>("overview");
  const [showLogin, setShowLogin] = React.useState(false);
  const [activeDialog, setActiveDialog] = React.useState<ActiveDialog>(null);
  const [identityDraft, setIdentityDraft] =
    React.useState<ProfileIdentityValues>({
      firstName: "",
      lastName: "",
    });
  const [contactDraft, setContactDraft] = React.useState<ProfileContactValues>({
    email: "",
    phone: "",
  });
  const [passwordDraft, setPasswordDraft] = React.useState({
    confirmPassword: "",
    newPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = React.useState<{
    confirmPassword?: string;
    newPassword?: string;
  }>({});

  const hasAccount = Boolean(profile.user);
  const showAccountRequired = !profile.authLoading && !hasAccount;
  const showInitialProfileLoading =
    hasAccount && profile.profileLoading && !profile.profileSnapshot;

  const selectSection = React.useCallback((sectionId: ProfileSectionId) => {
    setActiveSectionId(sectionId);
    window.requestAnimationFrame(() => {
      const target = document.getElementById(sectionId);
      target?.scrollIntoView({ block: "start", behavior: "smooth" });
      target?.focus?.({ preventScroll: true });
    });
  }, []);

  const activeTabId =
    activeSectionId === "overview"
      ? "overview"
      : activeSectionId === "security"
        ? "security"
        : "personal-settings";

  const closeDialog = React.useCallback(() => {
    setActiveDialog(null);
    setPasswordErrors({});
    profile.clearFeedback();
  }, [profile]);

  const openIdentityDialog = React.useCallback(() => {
    profile.clearFeedback();
    setIdentityDraft({
      firstName: profile.firstName,
      lastName: profile.lastName,
    });
    setActiveDialog("identity");
  }, [profile]);

  const openContactDialog = React.useCallback(() => {
    profile.clearFeedback();
    setContactDraft({
      email: profile.email,
      phone: profile.phone,
    });
    setActiveDialog("contact");
  }, [profile]);

  const openPasswordDialog = React.useCallback(() => {
    profile.clearFeedback();
    setPasswordDraft({ confirmPassword: "", newPassword: "" });
    setPasswordErrors({});
    setActiveDialog("password");
  }, [profile]);

  const saveIdentity = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const saved = await profile.saveIdentity(identityDraft);
      if (saved) setActiveDialog(null);
    },
    [identityDraft, profile],
  );

  const saveContact = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const saved = await profile.saveContact(contactDraft);
      if (saved) setActiveDialog(null);
    },
    [contactDraft, profile],
  );

  const savePassword = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const nextErrors: typeof passwordErrors = {};

      if (!passwordDraft.newPassword || passwordDraft.newPassword.length < 6) {
        nextErrors.newPassword = "Password must be at least 6 characters.";
      }
      if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
        nextErrors.confirmPassword =
          "New password and confirmation do not match.";
      }

      setPasswordErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;

      const saved = await profile.changePassword(
        passwordDraft.newPassword,
        passwordDraft.confirmPassword,
      );
      if (saved) setActiveDialog(null);
    },
    [passwordDraft, passwordErrors, profile],
  );

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
            subtitle="Manage your FIT identity, contact details, verification, and sign-in security from one account workspace."
            subtitleClassName="max-w-[48rem]"
          />

          {hasAccount ? (
            <nav className={styles.primaryTabs} aria-label="Account settings">
              {PROFILE_PRIMARY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={activeTabId === tab.id ? "page" : undefined}
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
                    <div className={styles.actionRow}>
                      <button
                        type="button"
                        className={cn(
                          styles.button,
                          styles.buttonPrimary,
                          FIT_FOCUS_VISIBLE,
                        )}
                        onClick={() => setShowLogin(true)}
                      >
                        Sign in
                      </button>
                    </div>
                  </div>
                </section>
              ) : !hasAccount ? (
                <section className={styles.panel}>
                  <div className={styles.signedOutPanel}>
                    <p className={styles.eyebrow}>Loading</p>
                    <h2 className={styles.panelTitle}>Loading your profile</h2>
                    <p className={styles.panelSubtitle}>
                      Checking your account session before showing profile
                      settings.
                    </p>
                  </div>
                </section>
              ) : showInitialProfileLoading ? (
                <section className={styles.panel}>
                  <div className={styles.signedOutPanel}>
                    <p className={styles.eyebrow}>Loading</p>
                    <h2 className={styles.panelTitle}>
                      Loading your profile details
                    </h2>
                    <p className={styles.panelSubtitle}>
                      Fetching saved account details before enabling profile
                      actions.
                    </p>
                  </div>
                </section>
              ) : (
                <div
                  aria-busy={profile.profileLoading || profile.authLoading}
                  className={styles.settingsStack}
                >
                  <ProfileOverviewSection
                    displayName={profile.displayName}
                    email={profile.email}
                    emailVerified={profile.emailVerified}
                    hasPendingEmailChange={profile.hasPendingEmailChange}
                    pendingEmail={profile.pendingEmail}
                    phone={profile.phone}
                    userIdPreview={profile.userIdPreview}
                    onSelectProfile={() => selectSection("profile-card")}
                    onSelectSecurity={() => selectSection("security")}
                  />
                  <ProfileIdentitySection
                    avatarDisplayUrl={profile.avatarDisplayUrl}
                    displayName={profile.displayName}
                    initials={profile.initials}
                    savingAvatar={profile.savingAvatar}
                    onAvatarChange={profile.changeAvatar}
                    onEditIdentity={openIdentityDialog}
                  />
                  <ProfileDetailsSection
                    email={profile.email}
                    emailVerified={profile.emailVerified}
                    firstName={profile.firstName}
                    hasPendingEmailChange={profile.hasPendingEmailChange}
                    lastName={profile.lastName}
                    pendingEmail={profile.pendingEmail}
                    phone={profile.phone}
                    sendingVerification={profile.sendingVerification}
                    onEditContact={openContactDialog}
                    onEditIdentity={openIdentityDialog}
                    onResendVerification={profile.resendVerification}
                  />
                  <ProfileSecuritySection
                    email={profile.email}
                    emailVerified={profile.emailVerified}
                    hasPendingEmailChange={profile.hasPendingEmailChange}
                    pendingEmail={profile.pendingEmail}
                    sendingVerification={profile.sendingVerification}
                    onEditPassword={openPasswordDialog}
                    onResendVerification={profile.resendVerification}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <ProfileEditDialog
        show={activeDialog === "identity"}
        title="Update display name"
        description="Your display name is generated from first and last name."
        submitLabel={profile.savingDetails ? "Saving..." : "Save name"}
        disabled={profile.savingDetails}
        onClose={closeDialog}
        onSubmit={saveIdentity}
      >
        <div className={styles.formGrid}>
          <ProfileField
            autoComplete="given-name"
            disabled={profile.savingDetails}
            error={profile.errors.firstName}
            helperText="Use the first name you want associated with your FIT account."
            id="profile-dialog-first-name"
            label="First name"
            placeholder="Nathan"
            value={identityDraft.firstName}
            onChange={(value) => {
              profile.clearFeedback();
              setIdentityDraft((current) => ({ ...current, firstName: value }));
            }}
          />
          <ProfileField
            autoComplete="family-name"
            disabled={profile.savingDetails}
            error={profile.errors.lastName}
            helperText="This combines with first name to form your display name."
            id="profile-dialog-last-name"
            label="Last name"
            placeholder="Li"
            value={identityDraft.lastName}
            onChange={(value) => {
              profile.clearFeedback();
              setIdentityDraft((current) => ({ ...current, lastName: value }));
            }}
          />
        </div>
      </ProfileEditDialog>

      <ProfileEditDialog
        show={activeDialog === "contact"}
        title="Update contact details"
        description="Email changes require confirmation from the new inbox before sign-in changes."
        submitLabel={profile.savingContact ? "Saving..." : "Save contact"}
        disabled={profile.savingContact}
        onClose={closeDialog}
        onSubmit={saveContact}
      >
        {profile.hasPendingEmailChange ? (
          <div className={styles.pendingNotice} role="status">
            Email change pending for <strong>{profile.pendingEmail}</strong>.
          </div>
        ) : null}
        <div className={styles.formGrid}>
          <ProfileField
            autoComplete="email"
            disabled={profile.savingContact}
            error={profile.errors.email}
            helperText="Use the address you want for sign-in and account recovery."
            id="profile-dialog-email"
            label="Email address"
            placeholder="name@example.com"
            type="email"
            value={contactDraft.email}
            onChange={(value) => {
              profile.clearFeedback();
              setContactDraft((current) => ({ ...current, email: value }));
            }}
          />
          <ProfileField
            autoComplete="tel"
            disabled={profile.savingContact}
            error={profile.errors.phone}
            helperText="Optional. Use 7 to 15 digits, with spaces or punctuation if helpful."
            id="profile-dialog-phone"
            label="Phone"
            placeholder="+61 2 5555 1234"
            type="tel"
            value={contactDraft.phone}
            onChange={(value) => {
              profile.clearFeedback();
              setContactDraft((current) => ({ ...current, phone: value }));
            }}
          />
        </div>
      </ProfileEditDialog>

      <ProfileEditDialog
        show={activeDialog === "password"}
        title="Change password"
        description="Choose a new password for the currently signed-in FIT account."
        submitLabel={
          profile.updatingPassword ? "Updating..." : "Update password"
        }
        disabled={profile.updatingPassword}
        onClose={closeDialog}
        onSubmit={savePassword}
      >
        <div className={styles.formGrid}>
          <ProfileField
            autoComplete="new-password"
            disabled={profile.updatingPassword}
            error={passwordErrors.newPassword}
            helperText="Use at least 6 characters."
            id="profile-dialog-new-password"
            label="New password"
            type="password"
            value={passwordDraft.newPassword}
            onChange={(value) => {
              profile.clearFeedback();
              setPasswordErrors((current) => ({
                ...current,
                newPassword: undefined,
              }));
              setPasswordDraft((current) => ({
                ...current,
                newPassword: value,
              }));
            }}
          />
          <ProfileField
            autoComplete="new-password"
            disabled={profile.updatingPassword}
            error={passwordErrors.confirmPassword}
            helperText="Repeat the new password exactly."
            id="profile-dialog-confirm-password"
            label="Confirm new password"
            type="password"
            value={passwordDraft.confirmPassword}
            onChange={(value) => {
              profile.clearFeedback();
              setPasswordErrors((current) => ({
                ...current,
                confirmPassword: undefined,
              }));
              setPasswordDraft((current) => ({
                ...current,
                confirmPassword: value,
              }));
            }}
          />
        </div>
      </ProfileEditDialog>

      <ModalLogin
        redirectTo="/Profile"
        show={showLogin}
        onHide={() => setShowLogin(false)}
      />
    </FitPageShell>
  );
}
