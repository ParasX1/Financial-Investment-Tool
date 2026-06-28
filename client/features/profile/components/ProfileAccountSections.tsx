import * as React from "react";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import { ProfileSettingRow } from "./ProfileSettingRow";
import styles from "../styles/profile.module.css";

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
          Profile
        </h2>
        <p className={styles.panelSubtitle}>Avatar and display name.</p>
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
          <p className={styles.identityHint}>From first and last name.</p>
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
          Name, email, and phone.
        </p>
      </div>
      <div className={styles.settingsList}>
        <ProfileSettingRow
          icon={BadgeRoundedIcon}
          label="Legal name"
          value={`${firstName || "First name missing"} ${
            lastName || "Last name missing"
          }`}
          description="Used for display name."
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
              ? "Confirm this from your inbox."
              : "Used for sign-in and recovery."
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
          description="Optional support contact."
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
          Sign-in
        </h2>
        <p className={styles.panelSubtitle}>Email verification and password.</p>
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
          description="Confirm changes from your inbox."
          actionLabel={!emailVerified ? "Verify" : undefined}
          actionDisabled={sendingVerification}
          onAction={!emailVerified ? onResendVerification : undefined}
        />
        <ProfileSettingRow
          icon={LockRoundedIcon}
          label="Password"
          value="Set for this account"
          description="Change password separately."
          actionLabel="Change"
          onAction={onEditPassword}
        />
        <ProfileSettingRow
          icon={CheckCircleRoundedIcon}
          label="Signed-out login"
          value="Use your verified email and password"
          description="Required before account settings."
        />
      </div>
    </section>
  );
}
