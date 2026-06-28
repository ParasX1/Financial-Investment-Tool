import * as React from "react";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import { ProfileSettingRow } from "./ProfileSettingRow";
import {
  PROFILE_SETTINGS_GROUPS,
  type ProfileSettingsGroup,
} from "../data/profileSections";
import styles from "../styles/profile.module.css";

const settingGroupLabelById = PROFILE_SETTINGS_GROUPS.reduce<
  Record<ProfileSettingsGroup["id"], string>
>(
  (labels, group) => ({
    ...labels,
    [group.id]: group.label,
  }),
  {
    contact: "Contact",
    profile: "Profile",
    "sign-in": "Security & sign-in",
  },
);

export function ProfileSettingsPanel({
  avatarDisplayUrl,
  displayName,
  email,
  emailVerified,
  hasPendingEmailChange,
  initials,
  pendingEmail,
  phone,
  savingAvatar,
  sendingVerification,
  onAvatarChange,
  onEditContact,
  onEditIdentity,
  onEditPassword,
  onResendVerification,
}: {
  avatarDisplayUrl: string | null;
  displayName: string;
  email: string;
  emailVerified: boolean;
  hasPendingEmailChange: boolean;
  initials: string;
  pendingEmail: string;
  phone: string;
  savingAvatar: boolean;
  sendingVerification: boolean;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEditContact: () => void;
  onEditIdentity: () => void;
  onEditPassword: () => void;
  onResendVerification: () => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const accountEmail = hasPendingEmailChange ? pendingEmail : email;
  const emailVerificationActionLabel = emailVerified
    ? undefined
    : hasPendingEmailChange
      ? "Resend"
      : "Verify";

  return (
    <section
      className={styles.settingsPanel}
      aria-labelledby="profile-settings-title"
    >
      <h2 id="profile-settings-title" className={styles.visuallyHidden}>
        Profile settings
      </h2>
      <div className={styles.accountSummaryCard}>
        <div className={styles.avatarFrameSmall}>
          {avatarDisplayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.avatarImage}
              src={avatarDisplayUrl}
              alt="Profile avatar"
            />
          ) : (
            <span className={styles.avatarInitialsSmall}>{initials}</span>
          )}
        </div>

        <div className={styles.accountSummaryCopy}>
          <p className={styles.eyebrow}>Identity</p>
          <h2 className={styles.accountName}>{displayName}</h2>
          <div className={styles.accountMetaLine}>
            <span>{accountEmail}</span>
          </div>
        </div>

        <div className={styles.accountSummaryActions}>
          <button
            type="button"
            className={cn(
              styles.rowAction,
              styles.summaryAction,
              FIT_FOCUS_VISIBLE,
            )}
            disabled={savingAvatar}
            onClick={() => fileInputRef.current?.click()}
          >
            <CameraAltRoundedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
            {savingAvatar ? "Uploading" : "Photo"}
          </button>
          <button
            type="button"
            className={cn(
              styles.rowAction,
              styles.summaryAction,
              FIT_FOCUS_VISIBLE,
            )}
            onClick={onEditIdentity}
          >
            Edit name
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

      <div className={styles.settingsGrid}>
        <SettingsCard
          id="profile-contact-settings-title"
          title={settingGroupLabelById.contact}
        >
          <ProfileSettingRow
            icon={EmailRoundedIcon}
            label="Email"
            value={accountEmail}
            status={
              emailVerified
                ? "Verified"
                : hasPendingEmailChange
                  ? "Pending"
                  : "Not verified"
            }
            statusTone={
              emailVerified
                ? "success"
                : hasPendingEmailChange
                  ? "warning"
                  : "neutral"
            }
            description={
              hasPendingEmailChange ? "Confirm from inbox." : undefined
            }
            actionLabel="Change"
            onAction={onEditContact}
            secondaryActionDisabled={sendingVerification}
            secondaryActionLabel={emailVerificationActionLabel}
            onSecondaryAction={
              emailVerificationActionLabel ? onResendVerification : undefined
            }
          />
          <ProfileSettingRow
            icon={PhoneIphoneRoundedIcon}
            label="Phone"
            value={phone || "No phone added"}
            actionLabel={phone ? "Change" : "Add"}
            onAction={onEditContact}
          />
        </SettingsCard>

        <SettingsCard
          id="profile-security-settings-title"
          title={settingGroupLabelById["sign-in"]}
        >
          <ProfileSettingRow
            icon={LockRoundedIcon}
            label="Password"
            value="Password set"
            actionLabel="Change"
            onAction={onEditPassword}
          />
          <ProfileSettingRow
            icon={CheckCircleRoundedIcon}
            label="Signed-out login"
            value="Email and password"
          />
        </SettingsCard>
      </div>
    </section>
  );
}

function SettingsCard({
  children,
  id,
  title,
}: {
  children: React.ReactNode;
  id: string;
  title: string;
}) {
  return (
    <section className={styles.settingCard} aria-labelledby={id}>
      <div className={styles.settingCardHeader}>
        <h3 id={id} className={styles.settingCardTitle}>
          {title}
        </h3>
      </div>
      <div className={styles.settingsList}>{children}</div>
    </section>
  );
}
