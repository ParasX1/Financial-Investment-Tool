import * as React from "react";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import styles from "../styles/profile.module.css";

export function ProfileField({
  autoComplete,
  disabled,
  error,
  helperText,
  id,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  autoComplete?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  value: string;
}) {
  const helpId = helperText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className={cn(
          styles.fieldInput,
          error ? styles.fieldInputError : null,
          FIT_FOCUS_VISIBLE,
        )}
        disabled={disabled}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {helperText ? (
        <p id={helpId} className={styles.fieldHelp}>
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
