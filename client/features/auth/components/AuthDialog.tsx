import * as React from "react";
import Image from "next/image";
import Modal from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";
import { useRouter } from "next/router";
import { FitLogo } from "@/components/shared/FitLogo";
import { wrapDialogTabBoundary } from "@/components/shared/dialogFocus";
import { useAuth } from "../context/AuthContext";
import { getAuthErrorMessage } from "../lib/authErrors";
import {
  DEFAULT_AUTH_REDIRECT_PATH,
  getSafeAuthRedirectPath,
} from "../lib/authRedirect";
import {
  NEW_PASSWORD_HELPER_TEXT,
  validateAuthForm,
} from "../lib/authValidation";
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
  const [pendingAction, setPendingAction] = React.useState<
    "email" | "google" | null
  >(null);
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const pending = pendingAction !== null;
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
    setPendingAction(null);
    setPasswordVisible(false);
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
    setPasswordVisible(false);
    setFieldErrors({});
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const result = validateAuthForm(mode, draft);
    setFieldErrors(result.errors);
    setError(null);
    setInfo(null);
    if (Object.keys(result.errors).length > 0) return;

    setPendingAction("email");
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
        setPasswordVisible(false);
        setInfo(
          "Check your inbox for a confirmation link, then return to continue.",
        );
        return;
      }
      onHide();
      await router.push(getSafeAuthRedirectPath(redirectTo));
    } catch (authError) {
      setError(getAuthErrorMessage(authError, mode));
    } finally {
      setPendingAction(null);
    }
  };

  const handleGoogleSignIn = async () => {
    if (pending) return;
    setError(null);
    setInfo(null);
    setPendingAction("google");
    try {
      await signInWithGoogle(getSafeAuthRedirectPath(redirectTo));
    } catch (authError) {
      setError(getAuthErrorMessage(authError, "oauth"));
      setPendingAction(null);
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
      keyboard={!pending}
      backdrop={pending ? "static" : true}
      centered
      restoreFocus
      aria-labelledby="auth-dialog-title"
      aria-describedby="auth-dialog-description"
      dialogClassName={styles.authDialog}
      contentClassName={styles.authContent}
      backdropClassName={styles.authBackdrop}
      animation={false}
    >
      <ModalBody className={styles.authBody} onKeyDown={wrapDialogTabBoundary}>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Close authentication dialog"
          disabled={pending}
          onClick={onHide}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
        <div className={styles.brandHeader}>
          <FitLogo
            className={styles.authLogo}
            showWordmark
            size="small"
            wordmark="FIT"
          />
        </div>

        <section className={styles.formPanel}>
          <div
            className={styles.modeTabs}
            role="group"
            aria-label="Account access"
          >
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
            <h2 id="auth-dialog-title" className={styles.title}>
              {title}
            </h2>
            <p id="auth-dialog-description" className={styles.subtitle}>
              {subtitle}
            </p>
          </header>

          {error ? (
            <p className={styles.errorMessage} role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <div className={styles.confirmationMessage}>
              <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                <path d="M3 5h18v14H3zM3 5l9 7 9-7" />
              </svg>
              <div>
                <h3>Confirm your email</h3>
                <p className={styles.successMessage} role="status">
                  {info}
                </p>
              </div>
            </div>
          ) : null}
          {Object.values(fieldErrors).some(Boolean) ? (
            <p className={styles.validationMessage} role="alert">
              Check the highlighted fields to continue.
            </p>
          ) : null}

          <form
            key={mode}
            onSubmit={handleSubmit}
            noValidate
            aria-busy={pending}
          >
            {isSignUp ? (
              <div className={styles.nameGrid}>
                <AuthField
                  autoComplete="given-name"
                  autoFocus
                  error={fieldErrors.firstName}
                  disabled={pending}
                  id="auth-first-name"
                  label="First name"
                  maxLength={80}
                  value={draft.firstName}
                  onChange={(value) => updateField("firstName", value)}
                />
                <AuthField
                  autoComplete="family-name"
                  error={fieldErrors.lastName}
                  disabled={pending}
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
              disabled={pending}
              id="auth-email"
              label="Email address"
              maxLength={254}
              type="email"
              value={draft.email}
              onChange={(value) => updateField("email", value)}
            />
            <AuthField
              autoComplete={isSignUp ? "new-password" : "current-password"}
              description={isSignUp ? NEW_PASSWORD_HELPER_TEXT : undefined}
              disabled={pending}
              error={fieldErrors.password}
              id="auth-password"
              label="Password"
              maxLength={128}
              type="password"
              passwordVisible={passwordVisible}
              onTogglePassword={() => setPasswordVisible((current) => !current)}
              value={draft.password}
              onChange={(value) => updateField("password", value)}
            />

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={pending}
            >
              {pendingAction === "email"
                ? isSignUp
                  ? "Creating account..."
                  : "Signing in..."
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </button>
            <div className={styles.divider} aria-hidden="true">
              <span>or</span>
            </div>
            <button
              type="button"
              className={styles.googleButton}
              aria-label="Sign in with Google"
              disabled={pending}
              onClick={handleGoogleSignIn}
            >
              <Image
                src="/brand/google-signin-dark.svg"
                alt=""
                aria-hidden="true"
                className={styles.googleArtwork}
                width={180}
                height={40}
                unoptimized
              />
            </button>
          </form>
          {pending ? (
            <p className={styles.pendingMessage} role="status">
              {pendingAction === "google"
                ? "Opening Google sign-in. Complete the next step to continue."
                : isSignUp
                  ? "Creating your account. Please wait."
                  : "Signing in. Please wait."}
            </p>
          ) : null}
        </section>
      </ModalBody>
    </Modal>
  );
}

function AuthField({
  autoComplete,
  autoFocus,
  description,
  disabled,
  error,
  id,
  label,
  maxLength,
  onChange,
  onTogglePassword,
  passwordVisible,
  type = "text",
  value,
}: {
  autoComplete: string;
  autoFocus?: boolean;
  description?: string;
  disabled: boolean;
  error?: string;
  id: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  onTogglePassword?: () => void;
  passwordVisible?: boolean;
  type?: React.HTMLInputTypeAttribute;
  value: string;
}) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.inputWrap}>
        <input
          id={id}
          name={id.replace("auth-", "")}
          type={type === "password" && passwordVisible ? "text" : type}
          className={`${styles.input} ${type === "password" ? styles.passwordInput : ""}`}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          required
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {type === "password" && onTogglePassword ? (
          <button
            type="button"
            className={styles.passwordToggle}
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            aria-controls={id}
            aria-pressed={Boolean(passwordVisible)}
            disabled={disabled}
            onClick={onTogglePassword}
          >
            {passwordVisible ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      {description ? (
        <p id={descriptionId} className={styles.fieldHint}>
          {description}
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
