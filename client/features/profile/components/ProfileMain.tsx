import * as React from "react";
import {
  AuthDialog,
  NEW_PASSWORD_HELPER_TEXT,
  useAuthDialog,
  validateNewPassword,
} from "@/features/auth";
import { fitFeedback } from "@/components/shared/fitStyles";
import { FitPageHeader } from "@/components/shared/FitPageHeader";
import { FitPageShell } from "@/components/shared/FitPageShell";
import {
  FIT_CONTENT_MAX_WIDTH_PX,
  FIT_FOCUS_VISIBLE,
  cn,
} from "@/components/shared/uiPrimitives";
import { useProfileController } from "../hooks/useProfileController";
import type {
  ProfileEmailValues,
  ProfileIdentityValues,
  ProfilePhoneValues,
} from "../types";
import { ProfileSettingsPanel } from "./ProfileAccountSections";
import { ProfileEditDialog } from "./ProfileEditDialog";
import { ProfileField } from "./ProfileField";
import styles from "../styles/profile.module.css";

type ActiveDialog = "email" | "identity" | "password" | "phone" | null;

const messageToneClass = {
  error: fitFeedback.error,
  info: fitFeedback.info,
  success: fitFeedback.success,
} as const;

export function ProfileMain() {
  const profile = useProfileController();
  const authDialog = useAuthDialog();
  const [activeDialog, setActiveDialog] = React.useState<ActiveDialog>(null);
  const [dialogOwnerUserId, setDialogOwnerUserId] = React.useState<
    string | null
  >(null);
  const [identityDraft, setIdentityDraft] =
    React.useState<ProfileIdentityValues>({
      firstName: "",
      handle: "",
      lastName: "",
    });
  const [emailDraft, setEmailDraft] = React.useState<ProfileEmailValues>({
    email: "",
  });
  const [phoneDraft, setPhoneDraft] = React.useState<ProfilePhoneValues>({
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
  const dialogIsCurrent = Boolean(
    !profile.authLoading &&
    profile.profileSnapshot &&
    dialogOwnerUserId &&
    dialogOwnerUserId === profile.user?.id,
  );

  const resetDialogState = React.useCallback(() => {
    setActiveDialog(null);
    setDialogOwnerUserId(null);
    setIdentityDraft({ firstName: "", handle: "", lastName: "" });
    setEmailDraft({ email: "" });
    setPhoneDraft({ phone: "" });
    setPasswordDraft({ confirmPassword: "", newPassword: "" });
    setPasswordErrors({});
  }, []);

  React.useEffect(() => {
    resetDialogState();
  }, [profile.authLoading, profile.user?.id, resetDialogState]);

  const closeDialog = React.useCallback(() => {
    resetDialogState();
    profile.clearFeedback();
  }, [profile, resetDialogState]);

  const openIdentityDialog = React.useCallback(() => {
    if (!profile.user || !profile.profileSnapshot) return;
    profile.clearFeedback();
    setIdentityDraft({
      firstName: profile.firstName,
      handle: profile.handle,
      lastName: profile.lastName,
    });
    setDialogOwnerUserId(profile.user.id);
    setActiveDialog("identity");
  }, [profile]);

  const openEmailDialog = React.useCallback(() => {
    if (!profile.user || !profile.profileSnapshot) return;
    profile.clearFeedback();
    setEmailDraft({
      email: profile.email,
    });
    setDialogOwnerUserId(profile.user.id);
    setActiveDialog("email");
  }, [profile]);

  const openPhoneDialog = React.useCallback(() => {
    if (!profile.user || !profile.profileSnapshot) return;
    profile.clearFeedback();
    setPhoneDraft({
      phone: profile.phone,
    });
    setDialogOwnerUserId(profile.user.id);
    setActiveDialog("phone");
  }, [profile]);

  const openPasswordDialog = React.useCallback(() => {
    if (!profile.user || !profile.profileSnapshot) return;
    profile.clearFeedback();
    setPasswordDraft({ confirmPassword: "", newPassword: "" });
    setPasswordErrors({});
    setDialogOwnerUserId(profile.user.id);
    setActiveDialog("password");
  }, [profile]);

  const saveIdentity = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!dialogIsCurrent) return;
      const saved = await profile.saveIdentity(identityDraft);
      if (saved) resetDialogState();
    },
    [dialogIsCurrent, identityDraft, profile, resetDialogState],
  );

  const saveEmail = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!dialogIsCurrent) return;
      const saved = await profile.saveEmail(emailDraft);
      if (saved) resetDialogState();
    },
    [dialogIsCurrent, emailDraft, profile, resetDialogState],
  );

  const savePhone = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!dialogIsCurrent) return;
      const saved = await profile.savePhone(phoneDraft);
      if (saved) resetDialogState();
    },
    [dialogIsCurrent, phoneDraft, profile, resetDialogState],
  );

  const savePassword = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!dialogIsCurrent) return;
      const nextErrors: typeof passwordErrors = {};

      const newPasswordError = validateNewPassword(passwordDraft.newPassword);
      if (newPasswordError) nextErrors.newPassword = newPasswordError;
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
      if (saved) resetDialogState();
    },
    [dialogIsCurrent, passwordDraft, profile, resetDialogState],
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
            className={styles.header}
            title="Profile"
            subtitle="Your public identity and private account settings."
            subtitleClassName="max-w-[48rem]"
          />

          <div className={styles.signedOutLayout}>
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
                <section className={styles.authGate}>
                  <div className={styles.authGateVisual} aria-hidden="true">
                    <div className={styles.authGateAvatar}>F</div>
                  </div>
                  <div className={styles.authGateCopy}>
                    <h2 className={styles.authGateTitle}>
                      Sign in to continue
                    </h2>
                    <p className={styles.authGateSubtitle}>
                      Manage your profile and account settings.
                    </p>
                    <div className={styles.authGateActions}>
                      <button
                        type="button"
                        className={cn(
                          styles.button,
                          styles.buttonPrimary,
                          FIT_FOCUS_VISIBLE,
                        )}
                        onClick={() => authDialog.openSignIn("/Profile")}
                      >
                        Sign in
                      </button>
                      <button
                        type="button"
                        className={cn(
                          styles.button,
                          styles.buttonSecondary,
                          FIT_FOCUS_VISIBLE,
                        )}
                        onClick={() => authDialog.openSignUp("/Profile")}
                      >
                        Create account
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
                      Checking your account session.
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
                      Fetching saved account details.
                    </p>
                  </div>
                </section>
              ) : (
                <div
                  aria-busy={profile.profileLoading || profile.authLoading}
                  className={styles.settingsStack}
                >
                  <ProfileSettingsPanel
                    avatarDisplayUrl={profile.avatarDisplayUrl}
                    displayName={profile.displayName}
                    email={profile.email}
                    emailVerified={profile.emailVerified}
                    hasPendingEmailChange={profile.hasPendingEmailChange}
                    initials={profile.initials}
                    pendingEmail={profile.pendingEmail}
                    phone={profile.phone}
                    profileHandle={profile.profileHandle}
                    savingAvatar={profile.savingAvatar}
                    sendingVerification={profile.sendingVerification}
                    onAvatarChange={profile.changeAvatar}
                    onEditEmail={openEmailDialog}
                    onEditIdentity={openIdentityDialog}
                    onEditPassword={openPasswordDialog}
                    onEditPhone={openPhoneDialog}
                    onResendVerification={profile.resendVerification}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <ProfileEditDialog
        show={dialogIsCurrent && activeDialog === "identity"}
        title="Edit profile"
        submitLabel={profile.savingDetails ? "Saving…" : "Save identity"}
        disabled={profile.savingDetails}
        onClose={closeDialog}
        onSubmit={saveIdentity}
      >
        <div className={styles.formStack}>
          <ProfileField
            autoComplete="username"
            disabled={profile.savingDetails}
            error={profile.errors.handle}
            helperText="3-30 lowercase letters, numbers, or underscores."
            id="profile-dialog-handle"
            label="Username"
            placeholder="nathan_li"
            value={identityDraft.handle}
            onChange={(value) => {
              profile.clearFeedback();
              setIdentityDraft((current) => ({ ...current, handle: value }));
            }}
          />
        </div>
        <div className={styles.formGrid}>
          <ProfileField
            autoComplete="given-name"
            disabled={profile.savingDetails}
            error={profile.errors.firstName}
            helperText="Kept with account details."
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
            helperText="Kept with account details."
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
        show={dialogIsCurrent && activeDialog === "email"}
        title="Change email"
        description="Email changes are confirmed from your inbox before becoming active."
        submitLabel={profile.savingContact ? "Saving…" : "Save email"}
        disabled={profile.savingContact}
        onClose={closeDialog}
        onSubmit={saveEmail}
      >
        {profile.hasPendingEmailChange ? (
          <div className={styles.pendingNotice} role="status">
            Email change pending for <strong>{profile.pendingEmail}</strong>.
          </div>
        ) : null}
        <div className={styles.formStack}>
          <ProfileField
            autoComplete="email"
            disabled={profile.savingContact}
            error={profile.errors.email}
            helperText="Used for sign-in and recovery."
            id="profile-dialog-email"
            label="Email address"
            placeholder="name@example.com"
            type="email"
            value={emailDraft.email}
            onChange={(value) => {
              profile.clearFeedback();
              setEmailDraft((current) => ({ ...current, email: value }));
            }}
          />
        </div>
      </ProfileEditDialog>

      <ProfileEditDialog
        show={dialogIsCurrent && activeDialog === "phone"}
        title="Update phone"
        description="This is a contact number for account support. It is not used as a sign-in method."
        submitLabel={profile.savingContact ? "Saving…" : "Save phone"}
        disabled={profile.savingContact}
        onClose={closeDialog}
        onSubmit={savePhone}
      >
        <div className={styles.formStack}>
          <ProfileField
            autoComplete="tel"
            disabled={profile.savingContact}
            error={profile.errors.phone}
            helperText="Optional. Use 7 to 15 digits."
            id="profile-dialog-phone"
            label="Phone"
            placeholder="+61 2 5555 1234"
            type="tel"
            value={phoneDraft.phone}
            onChange={(value) => {
              profile.clearFeedback();
              setPhoneDraft((current) => ({ ...current, phone: value }));
            }}
          />
        </div>
      </ProfileEditDialog>

      <ProfileEditDialog
        show={dialogIsCurrent && activeDialog === "password"}
        title="Change password"
        description="Update this account password."
        submitLabel={profile.updatingPassword ? "Updating…" : "Update password"}
        disabled={profile.updatingPassword}
        onClose={closeDialog}
        onSubmit={savePassword}
      >
        <div className={styles.formGrid}>
          <ProfileField
            autoComplete="new-password"
            disabled={profile.updatingPassword}
            error={passwordErrors.newPassword}
            helperText={NEW_PASSWORD_HELPER_TEXT}
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
            helperText="Repeat password."
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

      <AuthDialog {...authDialog.dialogProps} onHide={authDialog.close} />
    </FitPageShell>
  );
}
