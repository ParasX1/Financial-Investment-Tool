import * as React from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Modal from "react-bootstrap/Modal";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import styles from "../styles/profile.module.css";

export function ProfileEditDialog({
  children,
  description,
  disabled = false,
  onClose,
  onSubmit,
  show,
  submitLabel,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  disabled?: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  show: boolean;
  submitLabel: string;
  title: string;
}) {
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      dialogClassName={styles.editDialog}
      backdropClassName={styles.editDialogBackdrop}
      contentClassName={styles.editDialogContent}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <form className={styles.editDialogForm} onSubmit={onSubmit}>
        <div className={styles.editDialogHeader}>
          <div className="min-w-0">
            <h2 id={titleId} className={styles.editDialogTitle}>
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className={styles.editDialogDescription}>
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            className={cn(styles.iconButton, FIT_FOCUS_VISIBLE)}
            onClick={onClose}
          >
            <CloseRoundedIcon sx={{ fontSize: 20 }} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.editDialogBody}>{children}</div>

        <div className={styles.editDialogFooter}>
          <button
            type="button"
            className={cn(styles.button, styles.buttonGhost, FIT_FOCUS_VISIBLE)}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={cn(
              styles.button,
              styles.buttonPrimary,
              FIT_FOCUS_VISIBLE,
            )}
            disabled={disabled}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
