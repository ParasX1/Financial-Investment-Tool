import * as React from "react";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
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
    security: "Security",
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
  profileHandle,
  savingAvatar,
  sendingVerification,
  onAvatarChange,
  onEditEmail,
  onEditIdentity,
  onEditPassword,
  onEditPhone,
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
  profileHandle: string;
  savingAvatar: boolean;
  sendingVerification: boolean;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEditEmail: () => void;
  onEditIdentity: () => void;
  onEditPassword: () => void;
  onEditPhone: () => void;
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

      <div className={styles.profileWorkspace}>
        <aside className={styles.profileCard} aria-label="Profile preview">
          <div className={styles.profileCardGlow} aria-hidden="true" />
          <div className={styles.avatarFrameLarge}>
            {avatarDisplayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.avatarImage}
                src={avatarDisplayUrl}
                alt="Profile avatar"
              />
            ) : (
              <span className={styles.avatarInitialsLarge}>{initials}</span>
            )}
          </div>

          <div className={styles.profileIdentity}>
            <p className={styles.eyebrow}>Profile</p>
            <h2 className={styles.profileDisplayName}>{displayName}</h2>
            <p className={styles.profileHandle}>{profileHandle}</p>
            <p className={styles.profileEmail}>{accountEmail}</p>
          </div>

          <div className={styles.profileActions}>
            <button
              type="button"
              className={cn(styles.profilePrimaryAction, FIT_FOCUS_VISIBLE)}
              onClick={onEditIdentity}
            >
              Edit profile
            </button>
            <button
              type="button"
              className={cn(styles.profileSecondaryAction, FIT_FOCUS_VISIBLE)}
              disabled={savingAvatar}
              onClick={() => fileInputRef.current?.click()}
            >
              <CameraAltRoundedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
              {savingAvatar ? "Uploading" : "Photo"}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className={styles.visuallyHidden}
            tabIndex={-1}
            onChange={onAvatarChange}
          />

          <div className={styles.profileMiniMeta}>
            <span>{emailVerified ? "Verified email" : "Email needs review"}</span>
            <span aria-hidden="true">.</span>
            <span>{phone ? "Phone added" : "No phone"}</span>
          </div>
        </aside>

        <div className={styles.settingsColumn}>
          <div className={styles.settingsColumnHeader}>
            <p className={styles.eyebrow}>Account settings</p>
            <h3>Private details</h3>
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
                onAction={onEditEmail}
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
                onAction={onEditPhone}
              />
            </SettingsCard>

            <SettingsCard
              id="profile-security-settings-title"
              title={settingGroupLabelById.security}
            >
              <ProfileSettingRow
                icon={LockRoundedIcon}
                label="Password"
                value="Sign-in password"
                actionLabel="Change"
                onAction={onEditPassword}
              />
            </SettingsCard>
          </div>
        </div>
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
