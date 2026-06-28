import * as React from "react";
import supabase from "@/components/supabase";
import { useAuth } from "@/components/authContext";
import {
  MAX_AVATAR_SIZE,
  isValidEmail,
  sanitizeEmail,
  sanitizeHandle,
  sanitizeName,
  sanitizeNameInput,
  sanitizePhone,
  validateHandle,
  validateName,
  validatePhone,
} from "../lib/profileValidation";
import {
  buildAvatarDisplayUrl,
  buildDisplayName,
  buildProfileHandle,
  buildInitials,
  formatUserIdPreview,
} from "../lib/profileView";
import { buildProfileDetailsPayload } from "../lib/profilePersistence";
import type {
  ProfileEmailValues,
  ProfileErrors,
  ProfileFieldKey,
  ProfileFormValues,
  ProfilePhoneValues,
  ProfileIdentityValues,
  ProfileMessage,
  ProfileSnapshot,
} from "../types";

const AVATAR_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
  "avatars";
const ALLOWED_AVATAR_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const PROFILE_TABLE = "Users";

function sanitizeProfileField(field: ProfileFieldKey, value: string) {
  if (field === "firstName" || field === "lastName") {
    return sanitizeNameInput(value);
  }

  if (field === "email") return sanitizeEmail(value);
  if (field === "handle") return sanitizeHandle(value);
  return sanitizePhone(value);
}

function buildFallbackHandle(email: string, userId: string) {
  const fromEmail = sanitizeHandle(email.split("@")[0] || "");
  if (!validateHandle(fromEmail)) return fromEmail;
  return `u${userId
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .slice(0, 12)}`;
}

function validateIdentity(values: ProfileIdentityValues) {
  const nextValues: ProfileIdentityValues = {
    firstName: sanitizeName(values.firstName),
    handle: sanitizeHandle(values.handle),
    lastName: sanitizeName(values.lastName),
  };
  const errors: ProfileErrors = {};
  const firstNameError = validateName("First name", nextValues.firstName);
  const handleError = validateHandle(nextValues.handle);
  const lastNameError = validateName("Last name", nextValues.lastName);

  if (firstNameError) errors.firstName = firstNameError;
  if (handleError) errors.handle = handleError;
  if (lastNameError) errors.lastName = lastNameError;

  return {
    errors,
    valid: Object.keys(errors).length === 0,
    values: nextValues,
  };
}

function validateEmail(values: ProfileEmailValues) {
  const nextValues: ProfileEmailValues = {
    email: sanitizeEmail(values.email),
  };
  const errors: ProfileErrors = {};

  if (!nextValues.email) errors.email = "Email is required";
  else if (!isValidEmail(nextValues.email)) {
    errors.email = "Enter a valid email address";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0,
    values: nextValues,
  };
}

function validatePhoneDetails(values: ProfilePhoneValues) {
  const nextValues: ProfilePhoneValues = {
    phone: sanitizePhone(values.phone),
  };
  const errors: ProfileErrors = {};
  const phoneError = validatePhone(nextValues.phone);

  if (phoneError) errors.phone = phoneError;

  return {
    errors,
    valid: Object.keys(errors).length === 0,
    values: nextValues,
  };
}

export function useProfileController() {
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = React.useState(0);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState<string | null>(
    null,
  );
  const [profileSnapshot, setProfileSnapshot] =
    React.useState<ProfileSnapshot | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<ProfileErrors>({});
  const [message, setMessage] = React.useState<ProfileMessage | null>(null);
  const [pendingEmailOverride, setPendingEmailOverride] = React.useState("");

  const [savingDetails, setSavingDetails] = React.useState(false);
  const [savingContact, setSavingContact] = React.useState(false);
  const [savingAvatar, setSavingAvatar] = React.useState(false);
  const [sendingVerification, setSendingVerification] = React.useState(false);
  const [updatingPassword, setUpdatingPassword] = React.useState(false);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setEmail("");
      setFirstName("");
      setHandle("");
      setLastName("");
      setPhone("");
      setAvatarUrl(null);
      setAvatarPreviewUrl(null);
      setProfileSnapshot(null);
      setPendingEmailOverride("");
      setErrors({});
      setMessage(null);
      setProfileLoading(false);
      return;
    }

    let active = true;
    const authEmail = sanitizeEmail(user.new_email || user.email || "");

    setEmail(authEmail);
    setProfileLoading(true);

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from(PROFILE_TABLE)
        .select("first_name,last_name,handle,phone,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setMessage({
          tone: "error",
          text: "Profile details could not be loaded. Refresh the page or sign in again.",
        });
        setProfileLoading(false);
        return;
      }

      const nextProfile: ProfileSnapshot = {
        avatarUrl: data?.avatar_url || null,
        email: authEmail,
        firstName: data?.first_name || "",
        handle: data?.handle || buildFallbackHandle(authEmail, user.id),
        lastName: data?.last_name || "",
        phone: data?.phone || "",
      };

      setFirstName(nextProfile.firstName);
      setHandle(nextProfile.handle);
      setLastName(nextProfile.lastName);
      setPhone(nextProfile.phone);
      setAvatarUrl(nextProfile.avatarUrl);
      setAvatarVersion(Date.now());
      setAvatarPreviewUrl(null);
      setProfileSnapshot(nextProfile);
      setProfileLoading(false);
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [authLoading, user]);

  React.useEffect(() => {
    if (!user?.new_email && !user?.email_change_sent_at) {
      setPendingEmailOverride("");
    }
  }, [user?.email_change_sent_at, user?.new_email]);

  React.useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const values = React.useMemo(
    () => ({ email, firstName, handle, lastName, phone }),
    [email, firstName, handle, lastName, phone],
  );
  const currentProfile = React.useMemo<ProfileSnapshot>(
    () => ({ ...values, avatarUrl }),
    [avatarUrl, values],
  );
  const displayName = React.useMemo(() => buildDisplayName(values), [values]);
  const profileHandle = React.useMemo(
    () => buildProfileHandle(values),
    [values],
  );
  const initials = React.useMemo(() => buildInitials(values), [values]);
  const userIdPreview = React.useMemo(
    () => formatUserIdPreview(user?.id),
    [user?.id],
  );
  const avatarDisplayUrl = React.useMemo(
    () => avatarPreviewUrl || buildAvatarDisplayUrl(avatarUrl, avatarVersion),
    [avatarPreviewUrl, avatarUrl, avatarVersion],
  );
  const pendingEmail = sanitizeEmail(user?.new_email || pendingEmailOverride);
  const hasPendingEmailChange = Boolean(
    pendingEmail && (user?.email_change_sent_at || pendingEmailOverride),
  );
  const emailVerified =
    Boolean(user?.email_confirmed_at) && !hasPendingEmailChange;

  const updateProfileField = React.useCallback(
    (field: ProfileFieldKey, value: string) => {
      const sanitizedValue = sanitizeProfileField(field, value);

      if (field === "firstName") setFirstName(sanitizedValue);
      if (field === "handle") setHandle(sanitizedValue);
      if (field === "lastName") setLastName(sanitizedValue);
      if (field === "email") setEmail(sanitizedValue);
      if (field === "phone") setPhone(sanitizedValue);

      setErrors((current) => ({ ...current, [field]: undefined }));
    },
    [],
  );

  const clearFeedback = React.useCallback(() => {
    setErrors({});
    setMessage(null);
  }, []);

  const saveUsersRow = React.useCallback(
    async (nextValues: ProfileFormValues, nextAvatarUrl: string | null) => {
      if (!user) return { error: new Error("No signed-in user") };

      return supabase.from(PROFILE_TABLE).upsert(
        buildProfileDetailsPayload({
          avatarUrl: nextAvatarUrl,
          userId: user.id,
          values: nextValues,
        }),
        { onConflict: "id" },
      );
    },
    [user],
  );

  const saveIdentity = React.useCallback(
    async (nextIdentity: ProfileIdentityValues) => {
      if (!user) return false;

      const result = validateIdentity(nextIdentity);
      setErrors(result.errors);

      if (!result.valid) {
        setMessage({
          tone: "error",
          text: "Fix the highlighted fields before saving your profile.",
        });
        return false;
      }

      const nextValues = { ...values, ...result.values };
      setSavingDetails(true);
      setMessage(null);

      const { error } = await saveUsersRow(nextValues, avatarUrl);
      setSavingDetails(false);

      if (error) {
        setMessage({ tone: "error", text: "Profile save failed. Try again." });
        return false;
      }

      setFirstName(result.values.firstName);
      setHandle(result.values.handle);
      setLastName(result.values.lastName);
      setProfileSnapshot({ ...nextValues, avatarUrl });
      setMessage({ tone: "success", text: "Profile identity updated." });
      return true;
    },
    [avatarUrl, saveUsersRow, user, values],
  );

  const saveEmail = React.useCallback(
    async (nextEmail: ProfileEmailValues) => {
      if (!user) return false;

      const result = validateEmail(nextEmail);
      setErrors(result.errors);

      if (!result.valid) {
        setMessage({
          tone: "error",
          text: "Enter a valid email address before saving.",
        });
        return false;
      }

      const previousEmail = profileSnapshot?.email || user.email || "";
      const emailChanged = result.values.email !== previousEmail;

      setSavingContact(true);
      setMessage(null);

      if (!emailChanged) {
        setSavingContact(false);
        setMessage({ tone: "info", text: "Email is already up to date." });
        return false;
      }

      const { data: emailData, error: emailError } =
        await supabase.auth.updateUser(
          { email: result.values.email },
          { emailRedirectTo: `${window.location.origin}/Profile` },
        );

      setSavingContact(false);

      if (emailError) {
        setEmail(previousEmail);
        setProfileSnapshot({
          ...values,
          avatarUrl,
          email: previousEmail,
        });
        setMessage({
          tone: "error",
          text: "Email change could not be started. Please try again.",
        });
        return false;
      }

      setEmail(previousEmail);
      setProfileSnapshot({
        ...values,
        avatarUrl,
        email: previousEmail,
      });
      const nextPendingEmail = sanitizeEmail(emailData.user?.new_email || "");
      setPendingEmailOverride(
        emailData.user?.email_change_sent_at || nextPendingEmail
          ? nextPendingEmail || result.values.email
          : "",
      );
      setMessage({
        tone: "success",
        text: "Email change started. Check your inbox to confirm it.",
      });
      return true;
    },
    [avatarUrl, profileSnapshot?.email, user, values],
  );

  const savePhone = React.useCallback(
    async (nextPhone: ProfilePhoneValues) => {
      if (!user) return false;

      const result = validatePhoneDetails(nextPhone);
      setErrors(result.errors);

      if (!result.valid) {
        setMessage({
          tone: "error",
          text: "Fix the highlighted phone number before saving.",
        });
        return false;
      }

      const nextValues = { ...values, ...result.values };
      setSavingContact(true);
      setMessage(null);

      const { error } = await saveUsersRow(nextValues, avatarUrl);
      setSavingContact(false);

      if (error) {
        setMessage({ tone: "error", text: "Phone save failed. Try again." });
        return false;
      }

      setPhone(result.values.phone);
      setProfileSnapshot({ ...nextValues, avatarUrl });
      setMessage({ tone: "success", text: "Phone updated." });
      return true;
    },
    [avatarUrl, saveUsersRow, user, values],
  );

  const changeAvatar = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!user) return false;

      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return false;

      setMessage(null);

      if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
        setMessage({
          tone: "error",
          text: "Please choose a JPG, PNG, WebP, or GIF image.",
        });
        return false;
      }

      if (file.size > MAX_AVATAR_SIZE) {
        setMessage({
          tone: "error",
          text: "Upload failed: image must be 5MB or smaller.",
        });
        return false;
      }

      const previewUrl = URL.createObjectURL(file);
      const ext = file.name.split(".").pop() || "png";
      const uploadedAvatarPath = `${user.id}/${Date.now()}.${ext}`;

      setSavingAvatar(true);
      setAvatarPreviewUrl(previewUrl);

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(uploadedAvatarPath, file, {
          contentType: file.type,
        });

      if (uploadError) {
        const bucketMissing = uploadError.message
          .toLowerCase()
          .includes("bucket not found");
        setSavingAvatar(false);
        setAvatarPreviewUrl(null);
        URL.revokeObjectURL(previewUrl);
        setMessage({
          tone: bucketMissing ? "info" : "error",
          text: bucketMissing
            ? `Avatar cannot be saved because Supabase bucket "${AVATAR_BUCKET}" does not exist.`
            : "Avatar upload failed. Please try another supported image.",
        });
        return false;
      }

      const { data } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(uploadedAvatarPath);
      const nextAvatarUrl = data.publicUrl;
      const { error } = await saveUsersRow(values, nextAvatarUrl);

      if (error) {
        await supabase.storage.from(AVATAR_BUCKET).remove([uploadedAvatarPath]);
        setSavingAvatar(false);
        setAvatarPreviewUrl(null);
        URL.revokeObjectURL(previewUrl);
        setMessage({ tone: "error", text: "Avatar save failed. Try again." });
        return false;
      }

      setSavingAvatar(false);
      setAvatarUrl(nextAvatarUrl);
      setAvatarVersion(Date.now());
      setAvatarPreviewUrl(null);
      URL.revokeObjectURL(previewUrl);
      setProfileSnapshot({ ...values, avatarUrl: nextAvatarUrl });
      setMessage({ tone: "success", text: "Profile photo updated." });
      return true;
    },
    [saveUsersRow, user, values],
  );

  const changePassword = React.useCallback(
    async (newPassword: string, confirmPassword: string) => {
      if (!newPassword || newPassword.length < 6) {
        setMessage({
          tone: "error",
          text: "Password must be at least 6 characters.",
        });
        return false;
      }

      if (newPassword !== confirmPassword) {
        setMessage({
          tone: "error",
          text: "New password and confirmation do not match.",
        });
        return false;
      }

      setUpdatingPassword(true);
      setMessage(null);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      setUpdatingPassword(false);

      setMessage(
        error
          ? {
              tone: "error",
              text: "Password update failed. Please sign in again and retry.",
            }
          : { tone: "success", text: "Password updated successfully." },
      );

      return !error;
    },
    [],
  );

  const resendVerification = React.useCallback(async () => {
    if (!user) return;

    const targetEmail = sanitizeEmail(
      pendingEmail || profileSnapshot?.email || user.email || "",
    );
    const resendType = pendingEmail ? "email_change" : "signup";

    if (!targetEmail || !isValidEmail(targetEmail)) {
      setErrors((current) => ({
        ...current,
        email: "Save a valid email address before sending verification.",
      }));
      return;
    }

    setSendingVerification(true);
    setMessage(null);

    const { error } = await supabase.auth.resend({
      email: targetEmail,
      options: { emailRedirectTo: `${window.location.origin}/Profile` },
      type: resendType,
    });

    setSendingVerification(false);
    setMessage(
      error
        ? {
            tone: "error",
            text: "Verification email could not be sent. Please try again.",
          }
        : {
            tone: "success",
            text: pendingEmail
              ? "Email change verification sent. Check the confirmation email."
              : "Verification email sent. Check your inbox.",
          },
    );
  }, [pendingEmail, profileSnapshot?.email, user]);

  return {
    authLoading,
    avatarDisplayUrl,
    avatarUrl,
    changeAvatar,
    changePassword,
    clearFeedback,
    currentProfile,
    displayName,
    email,
    emailVerified,
    errors,
    firstName,
    handle,
    hasPendingEmailChange,
    initials,
    lastName,
    message,
    phone,
    pendingEmail,
    profileHandle,
    profileLoading,
    profileSnapshot,
    resendVerification,
    saveEmail,
    saveIdentity,
    savePhone,
    savingAvatar,
    savingContact,
    savingDetails,
    sendingVerification,
    updateProfileField,
    updatingPassword,
    user,
    userIdPreview,
  };
}
