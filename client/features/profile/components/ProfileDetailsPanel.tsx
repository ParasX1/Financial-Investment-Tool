import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type { ProfileErrors, ProfileFieldKey } from "../types";
import { ProfileField } from "./ProfileField";
import styles from "../styles/profile.module.css";

export function ProfileDetailsPanel({
  email,
  emailVerified,
  errors,
  firstName,
  hasPendingEmailChange,
  isEditing,
  lastName,
  onFieldChange,
  onResendVerification,
  onSave,
  pendingEmail,
  phone,
  saving,
  sendingVerification,
}: {
  email: string;
  emailVerified: boolean;
  errors: ProfileErrors;
  firstName: string;
  hasPendingEmailChange: boolean;
  isEditing: boolean;
  lastName: string;
  onFieldChange: (field: ProfileFieldKey, value: string) => void;
  onResendVerification: () => void;
  onSave: () => void;
  pendingEmail: string;
  phone: string;
  saving: boolean;
  sendingVerification: boolean;
}) {
  return (
    <section
      id="personal-details"
      tabIndex={-1}
      className={styles.panel}
      aria-labelledby="personal-details-title"
    >
      <div className={styles.panelHeader}>
        <div className={styles.panelTitleRow}>
          <div className="min-w-0">
            <p className={styles.eyebrow}>Account details</p>
            <h2 id="personal-details-title" className={styles.panelTitle}>
              Your personal details
            </h2>
            <p className={styles.panelSubtitle}>
              These details support account access and recovery. Choose Edit
              profile before changing them.
            </p>
          </div>

          <div className={styles.actionRow}>
            {!emailVerified ? (
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
                <MailOutlineRoundedIcon
                  sx={{ fontSize: 17 }}
                  aria-hidden="true"
                />
                {sendingVerification
                  ? "Sending..."
                  : hasPendingEmailChange
                    ? "Resend email change"
                    : "Send verification email"}
              </button>
            ) : null}
            <button
              type="button"
              className={cn(
                styles.button,
                styles.buttonPrimary,
                FIT_FOCUS_VISIBLE,
              )}
              disabled={!isEditing || saving}
              onClick={onSave}
            >
              <SaveRoundedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.panelBody}>
        {hasPendingEmailChange ? (
          <div className={styles.pendingNotice} role="status">
            Email change pending for <strong>{pendingEmail}</strong>. Verify it
            from the confirmation email before it becomes your sign-in email.
          </div>
        ) : null}
        <div className={styles.formGrid}>
          <ProfileField
            autoComplete="given-name"
            disabled={!isEditing}
            error={errors.firstName}
            helperText="Use the name you want associated with your FIT account."
            id="profile-first-name"
            label="First name"
            placeholder="Nathan"
            value={firstName}
            onChange={(value) => onFieldChange("firstName", value)}
          />
          <ProfileField
            autoComplete="family-name"
            disabled={!isEditing}
            error={errors.lastName}
            helperText="This combines with first name to form your display name."
            id="profile-last-name"
            label="Last name"
            placeholder="Li"
            value={lastName}
            onChange={(value) => onFieldChange("lastName", value)}
          />
          <ProfileField
            autoComplete="email"
            disabled={!isEditing}
            error={errors.email}
            helperText="Changing email may require confirmation from the new inbox. Save the email before sending verification to a new address."
            id="profile-email"
            label="Email address"
            placeholder="name@example.com"
            type="email"
            value={email}
            onChange={(value) => onFieldChange("email", value)}
          />
          <ProfileField
            autoComplete="tel"
            disabled={!isEditing}
            error={errors.phone}
            helperText="Optional. Use 7 to 15 digits, with spaces or punctuation if helpful."
            id="profile-phone"
            label="Phone"
            placeholder="+61 2 5555 1234"
            type="tel"
            value={phone}
            onChange={(value) => onFieldChange("phone", value)}
          />
        </div>
      </div>
    </section>
  );
}
