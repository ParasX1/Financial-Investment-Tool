import * as React from "react";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import { ProfileSettingRow } from "./ProfileSettingRow";
import styles from "../styles/profile.module.css";

export function ProfileOverviewSection({
  displayName,
  email,
  emailVerified,
  hasPendingEmailChange,
  pendingEmail,
  phone,
  userIdPreview,
  onSelectSecurity,
  onSelectProfile,
}: {
  displayName: string;
  email: string;
  emailVerified: boolean;
  hasPendingEmailChange: boolean;
  pendingEmail: string;
  phone: string;
  userIdPreview: string;
  onSelectSecurity: () => void;
  onSelectProfile: () => void;
}) {
  return (
    <section
      id="overview"
      tabIndex={-1}
      className={styles.overviewPanel}
      aria-labelledby="profile-overview-title"
    >
      <div className={styles.overviewCopy}>
        <p className={styles.eyebrow}>Account overview</p>
        <h2 id="profile-overview-title" className={styles.overviewTitle}>
          Hi {displayName},
          <span> your FIT account is ready to manage.</span>
        </h2>
        <p className={styles.overviewText}>
          Review the identity, contact, and sign-in details that keep your
          investing workspace connected to the right account.
        </p>
      </div>

      <div className={styles.overviewCards} aria-label="Account summary">
        <button
          type="button"
          className={cn(styles.overviewCard, FIT_FOCUS_VISIBLE)}
          onClick={onSelectProfile}
        >
          <AccountCircleRoundedIcon sx={{ fontSize: 22 }} aria-hidden="true" />
          <span>
            <strong>{displayName}</strong>
            <small>{userIdPreview}</small>
          </span>
        </button>
        <button
          type="button"
          className={cn(styles.overviewCard, FIT_FOCUS_VISIBLE)}
          onClick={onSelectSecurity}
        >
          <VerifiedUserRoundedIcon sx={{ fontSize: 22 }} aria-hidden="true" />
          <span>
            <strong>
              {emailVerified
                ? "Email verified"
                : hasPendingEmailChange
                  ? "Email change pending"
                  : "Email not verified"}
            </strong>
            <small>{hasPendingEmailChange ? pendingEmail : email}</small>
          </span>
        </button>
        <button
          type="button"
          className={cn(styles.overviewCard, FIT_FOCUS_VISIBLE)}
          onClick={onSelectProfile}
        >
          <PhoneIphoneRoundedIcon sx={{ fontSize: 22 }} aria-hidden="true" />
          <span>
            <strong>{phone ? "Phone saved" : "Phone optional"}</strong>
            <small>{phone || "Add a recovery phone when you need one"}</small>
          </span>
        </button>
      </div>
    </section>
  );
}

export function ProfileIdentitySection({
  avatarDisplayUrl,
  displayName,
  initials,
  savingAvatar,
  onAvatarChange,
  onEditIdentity,
}: {
  avatarDisplayUrl: string | null;
  displayName: string;
  initials: string;
  savingAvatar: boolean;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEditIdentity: () => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <section
      id="profile-card"
      tabIndex={-1}
      className={styles.panel}
      aria-labelledby="profile-card-title"
    >
      <div className={styles.panelHeader}>
        <p className={styles.eyebrow}>Profile</p>
        <h2 id="profile-card-title" className={styles.panelTitle}>
          How FIT identifies you
        </h2>
        <p className={styles.panelSubtitle}>
          Keep your avatar and display name recognizable inside your account
          workspace.
        </p>
      </div>

      <div className={styles.profileIdentity}>
        <div className={styles.avatarFrame}>
          {avatarDisplayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.avatarImage}
              src={avatarDisplayUrl}
              alt="Profile avatar"
            />
          ) : (
            <span className={styles.avatarInitials}>{initials}</span>
          )}
        </div>
        <div className={styles.profileIdentityCopy}>
          <h3 className={styles.identityName}>{displayName}</h3>
          <p className={styles.identityHint}>
            Display name is generated from your saved first and last name.
          </p>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={cn(
                styles.button,
                styles.buttonSecondary,
                FIT_FOCUS_VISIBLE,
              )}
              onClick={onEditIdentity}
            >
              Change display name
            </button>
            <button
              type="button"
              className={cn(styles.button, styles.buttonGhost, FIT_FOCUS_VISIBLE)}
              disabled={savingAvatar}
              onClick={() => fileInputRef.current?.click()}
            >
              <CameraAltRoundedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
              {savingAvatar ? "Uploading..." : "Change photo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={styles.visuallyHidden}
              tabIndex={-1}
              onChange={onAvatarChange}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProfileDetailsSection({
  email,
  emailVerified,
  firstName,
  hasPendingEmailChange,
  lastName,
  pendingEmail,
  phone,
  sendingVerification,
  onEditContact,
  onEditIdentity,
  onResendVerification,
}: {
  email: string;
  emailVerified: boolean;
  firstName: string;
  hasPendingEmailChange: boolean;
  lastName: string;
  pendingEmail: string;
  phone: string;
  sendingVerification: boolean;
  onEditContact: () => void;
  onEditIdentity: () => void;
  onResendVerification: () => void;
}) {
  return (
    <section
      id="personal-details"
      tabIndex={-1}
      className={styles.panel}
      aria-labelledby="profile-details-title"
    >
      <div className={styles.panelHeader}>
        <p className={styles.eyebrow}>Account details</p>
        <h2 id="profile-details-title" className={styles.panelTitle}>
          Personal details
        </h2>
        <p className={styles.panelSubtitle}>
          These details support account access, alerts, and recovery. Each
          change has its own confirmation step.
        </p>
      </div>
      <div className={styles.settingsList}>
        <ProfileSettingRow
          icon={BadgeRoundedIcon}
          label="Legal name"
          value={`${firstName || "First name missing"} ${
            lastName || "Last name missing"
          }`}
          description="Used to form your FIT display name."
          actionLabel="Edit"
          onAction={onEditIdentity}
        />
        <ProfileSettingRow
          icon={EmailRoundedIcon}
          label="Email address"
          value={hasPendingEmailChange ? pendingEmail : email}
          status={
            emailVerified
              ? "Verified"
              : hasPendingEmailChange
                ? "Pending"
                : "Not verified"
          }
          statusTone={
            emailVerified ? "success" : hasPendingEmailChange ? "warning" : "neutral"
          }
          description={
            hasPendingEmailChange
              ? "Verify the new address from the confirmation email before it becomes your sign-in email."
              : "This is your primary sign-in and account recovery address."
          }
          actionLabel="Change"
          onAction={onEditContact}
        />
        {!emailVerified ? (
          <div className={styles.inlineActionRow}>
            <button
              type="button"
              className={cn(
                styles.button,
                styles.buttonWarning,
                FIT_FOCUS_VISIBLE,
              )}
              disabled={sendingVerification}
              onClick={onResendVerification}
            >
              {sendingVerification
                ? "Sending..."
                : hasPendingEmailChange
                  ? "Resend email change"
                  : "Send verification email"}
            </button>
          </div>
        ) : null}
        <ProfileSettingRow
          icon={PhoneIphoneRoundedIcon}
          label="Phone"
          value={phone || "No phone added"}
          description="Optional contact detail for account support."
          actionLabel={phone ? "Change" : "Add"}
          onAction={onEditContact}
        />
      </div>
    </section>
  );
}

export function ProfileSecuritySection({
  email,
  emailVerified,
  hasPendingEmailChange,
  pendingEmail,
  sendingVerification,
  onEditPassword,
  onResendVerification,
}: {
  email: string;
  emailVerified: boolean;
  hasPendingEmailChange: boolean;
  pendingEmail: string;
  sendingVerification: boolean;
  onEditPassword: () => void;
  onResendVerification: () => void;
}) {
  return (
    <section
      id="security"
      tabIndex={-1}
      className={styles.panel}
      aria-labelledby="profile-security-title"
    >
      <div className={styles.panelHeader}>
        <p className={styles.eyebrow}>Sign-in security</p>
        <h2 id="profile-security-title" className={styles.panelTitle}>
          Ways of signing in
        </h2>
        <p className={styles.panelSubtitle}>
          Keep sign-in details separate from profile edits so security changes
          stay deliberate.
        </p>
      </div>
      <div className={styles.settingsList}>
        <ProfileSettingRow
          icon={EmailRoundedIcon}
          label="Sign-in email"
          value={hasPendingEmailChange ? pendingEmail : email}
          status={
            emailVerified
              ? "Verified"
              : hasPendingEmailChange
                ? "Pending"
                : "Needs verification"
          }
          statusTone={
            emailVerified ? "success" : hasPendingEmailChange ? "warning" : "neutral"
          }
          description="Email changes require confirmation before they become your sign-in address."
          actionLabel={!emailVerified ? "Verify" : undefined}
          actionDisabled={sendingVerification}
          onAction={!emailVerified ? onResendVerification : undefined}
        />
        <ProfileSettingRow
          icon={LockRoundedIcon}
          label="Password"
          value="Set for this account"
          description="Use a focused password flow instead of editing it with profile details."
          actionLabel="Change"
          onAction={onEditPassword}
        />
        <ProfileSettingRow
          icon={CheckCircleRoundedIcon}
          label="Signed-out login"
          value="Use your verified email and password"
          description="FIT will ask you to sign in before showing account settings."
        />
      </div>
    </section>
  );
}
