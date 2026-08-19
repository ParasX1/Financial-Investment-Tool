import * as React from "react";
import Modal from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";
import { useRouter } from "next/router";
import { FitLogo } from "@/components/shared/FitLogo";
import { useAuth } from "../context/AuthContext";
import { getAuthErrorMessage } from "../lib/authErrors";
import {
  DEFAULT_AUTH_REDIRECT_PATH,
  getSafeAuthRedirectPath,
} from "../lib/authRedirect";
import { validateAuthForm } from "../lib/authValidation";
import type { AuthFieldErrors, AuthMode } from "../types";
import styles from "../styles/authDialog.module.css";

type AuthDialogProps = {
  initialMode?: AuthMode;
  redirectTo?: string;
  show: boolean;
  onHide: () => void;
};

const EMPTY_DRAFT = {
  email: "",
  firstName: "",
  lastName: "",
  password: "",
};

export function AuthDialog({
  initialMode = "sign-in",
  redirectTo = DEFAULT_AUTH_REDIRECT_PATH,
  show,
  onHide,
}: AuthDialogProps) {
  const [mode, setMode] = React.useState<AuthMode>(initialMode);
  const [draft, setDraft] = React.useState(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = React.useState<AuthFieldErrors>({});
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (show) {
      setMode(initialMode);
      return;
    }
    setDraft(EMPTY_DRAFT);
    setFieldErrors({});
    setError(null);
    setInfo(null);
    setPending(false);
  }, [initialMode, show]);

  const updateField = (field: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError(null);
    setInfo(null);
  };

  const selectMode = (nextMode: AuthMode) => {
    if (pending || nextMode === mode) return;
    setMode(nextMode);
    setDraft((current) => ({ ...current, password: "" }));
    setFieldErrors({});
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = validateAuthForm(mode, draft);
    setFieldErrors(result.errors);
    setError(null);
    setInfo(null);
    if (Object.keys(result.errors).length > 0) return;

    setPending(true);
    try {
      if (mode === "sign-in") {
        await signIn(result.values.email, result.values.password);
        onHide();
        await router.push(getSafeAuthRedirectPath(redirectTo));
        return;
      }

      const values = result.values as typeof result.values & {
        firstName: string;
        lastName: string;
      };
      const status = await signUp(
        values.email,
        values.password,
        { first_name: values.firstName, last_name: values.lastName },
        getSafeAuthRedirectPath(redirectTo),
      );
      if (status === "verify-email") {
        setDraft((current) => ({ ...current, password: "" }));
        setInfo("Check your inbox for a confirmation link, then return to continue.");
        return;
      }
      onHide();
      await router.push(getSafeAuthRedirectPath(redirectTo));
    } catch (authError) {
      setError(getAuthErrorMessage(authError, mode));
    } finally {
      setPending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      await signInWithGoogle(getSafeAuthRedirectPath(redirectTo));
    } catch (authError) {
      setError(getAuthErrorMessage(authError, "oauth"));
      setPending(false);
    }
  };

  const isSignUp = mode === "sign-up";
  const title = isSignUp ? "Create your FIT account" : "Welcome back";
  const subtitle = isSignUp
    ? "Save watchlists and keep your research in one place."
    : "Sign in to continue to your FIT workspace.";

  return (
    <Modal
      show={show}
      onHide={pending ? undefined : onHide}
      centered
      restoreFocus
      aria-labelledby="auth-dialog-title"
      aria-describedby="auth-dialog-description"
      dialogClassName={styles.authDialog}
      contentClassName={styles.authContent}
      backdropClassName={styles.authBackdrop}
      animation={false}
    >
      <ModalBody className={styles.authBody}>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Close authentication dialog"
          disabled={pending}
          onClick={onHide}
        >
          <span aria-hidden="true">x</span>
        </button>
        <FitLogo className={styles.authLogo} showWordmark size="small" />

        <div className={styles.modeTabs} role="group" aria-label="Account access">
          <button
            type="button"
            className={styles.modeTab}
            aria-pressed={!isSignUp}
            disabled={pending}
            onClick={() => selectMode("sign-in")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={styles.modeTab}
            aria-pressed={isSignUp}
            disabled={pending}
            onClick={() => selectMode("sign-up")}
          >
            Create account
          </button>
        </div>

        <header className={styles.intro}>
          <h2 id="auth-dialog-title" className={styles.title}>{title}</h2>
          <p id="auth-dialog-description" className={styles.subtitle}>{subtitle}</p>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          {isSignUp ? (
            <div className={styles.nameGrid}>
              <AuthField
                autoComplete="given-name"
                autoFocus
                error={fieldErrors.firstName}
                id="auth-first-name"
                label="First name"
                maxLength={80}
                value={draft.firstName}
                onChange={(value) => updateField("firstName", value)}
              />
              <AuthField
                autoComplete="family-name"
                error={fieldErrors.lastName}
                id="auth-last-name"
                label="Last name"
                maxLength={80}
                value={draft.lastName}
                onChange={(value) => updateField("lastName", value)}
              />
            </div>
          ) : null}

          <AuthField
            autoComplete="email"
            autoFocus={!isSignUp}
            error={fieldErrors.email}
            id="auth-email"
            label="Email address"
            maxLength={254}
            type="email"
            value={draft.email}
            onChange={(value) => updateField("email", value)}
          />
          <AuthField
            autoComplete={isSignUp ? "new-password" : "current-password"}
            description={isSignUp ? "Use at least 8 characters." : undefined}
            error={fieldErrors.password}
            id="auth-password"
            label="Password"
            maxLength={128}
            type="password"
            value={draft.password}
            onChange={(value) => updateField("password", value)}
          />

          {error ? <p className={styles.errorMessage} role="alert">{error}</p> : null}
          {info ? <p className={styles.successMessage} role="status">{info}</p> : null}

          <button type="submit" className={styles.primaryButton} disabled={pending}>
            {pending
              ? isSignUp ? "Creating account..." : "Signing in..."
              : isSignUp ? "Create account" : "Sign in"}
          </button>
          <div className={styles.divider} aria-hidden="true"><span>or</span></div>
          <button
            type="button"
            className={styles.googleButton}
            disabled={pending}
            onClick={handleGoogleSignIn}
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>
      </ModalBody>
    </Modal>
  );
}

function AuthField({
  autoComplete,
  autoFocus,
  description,
  error,
  id,
  label,
  maxLength,
  onChange,
  type = "text",
  value,
}: {
  autoComplete: string;
  autoFocus?: boolean;
  description?: string;
  error?: string;
  id: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  value: string;
}) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        className={styles.input}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {description ? <p id={descriptionId} className={styles.fieldHint}>{description}</p> : null}
      {error ? <p id={errorId} className={styles.fieldError}>{error}</p> : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className={styles.googleIcon} viewBox="0 0 24 24" focusable="false">
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"
      />
      <path
        fill="currentColor"
        opacity=".82"
        d="M12 22c2.7 0 4.98-.9 6.64-2.43l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z"
      />
      <path
        fill="currentColor"
        opacity=".62"
        d="M6.39 13.86A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.53H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.47l3.35-2.61Z"
      />
      <path
        fill="currentColor"
        opacity=".92"
        d="M12 6.01c1.47 0 2.79.5 3.83 1.5L18.7 4.63A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.53l3.35 2.61C7.18 7.77 9.39 6.01 12 6.01Z"
      />
    </svg>
  );
}
