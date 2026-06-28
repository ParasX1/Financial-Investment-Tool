import * as React from "react";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import styles from "../styles/profile.module.css";

type StatusTone = "success" | "warning" | "neutral";

export function ProfileSettingRow({
  actionDisabled = false,
  actionLabel,
  description,
  icon: Icon,
  label,
  onAction,
  status,
  statusTone = "neutral",
  value,
}: {
  actionDisabled?: boolean;
  actionLabel?: string;
  description?: string;
  icon: React.ElementType;
  label: string;
  onAction?: () => void;
  status?: string;
  statusTone?: StatusTone;
  value: React.ReactNode;
}) {
  return (
    <div className={styles.settingRow}>
      <div className={styles.settingIcon} aria-hidden="true">
        <Icon sx={{ fontSize: 20 }} />
      </div>

      <div className={styles.settingCopy}>
        <div className={styles.settingHeading}>
          <span className={styles.settingLabel}>{label}</span>
          {status ? (
            <span
              className={cn(
                styles.statusBadge,
                statusTone === "success" ? styles.statusBadgeSuccess : null,
                statusTone === "warning" ? styles.statusBadgeWarning : null,
              )}
            >
              {status}
            </span>
          ) : null}
        </div>
        <div className={styles.settingValue}>{value}</div>
        {description ? (
          <p className={styles.settingDescription}>{description}</p>
        ) : null}
      </div>

      {actionLabel && onAction ? (
        <button
          type="button"
          className={cn(styles.rowAction, FIT_FOCUS_VISIBLE)}
          disabled={actionDisabled}
          onClick={onAction}
        >
          <span>{actionLabel}</span>
          <ChevronRightRoundedIcon sx={{ fontSize: 19 }} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
