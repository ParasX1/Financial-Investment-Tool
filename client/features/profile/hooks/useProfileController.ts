import * as React from "react";
import supabase from "@/components/supabase";
import { useAuth } from "@/components/authContext";
import {
  MAX_AVATAR_SIZE,
  isValidEmail,
  sanitizeEmail,
  sanitizeNameInput,
  sanitizePhone,
  validateProfileForm,
} from "../lib/profileValidation";
import {
  buildAvatarDisplayUrl,
  buildDisplayName,
  buildInitials,
  formatUserIdPreview,
} from "../lib/profileView";
import { buildProfileDetailsPayload } from "../lib/profilePersistence";
import type {
  ProfileErrors,
  ProfileFieldKey,
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
  return sanitizePhone(value);
}

export function useProfileController() {
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = React.useState(0);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState<string | null>(
    null,
  );
  const [pendingAvatarFile, setPendingAvatarFile] = React.useState<File | null>(
    null,
  );
  const [profileSnapshot, setProfileSnapshot] =
    React.useState<ProfileSnapshot | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [errors, setErrors] = React.useState<ProfileErrors>({});
  const [message, setMessage] = React.useState<ProfileMessage | null>(null);
  const [pendingEmailOverride, setPendingEmailOverride] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [sendingVerification, setSendingVerification] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [updatingPassword, setUpdatingPassword] = React.useState(false);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setAvatarUrl(null);
      setAvatarPreviewUrl(null);
      setPendingAvatarFile(null);
      setProfileSnapshot(null);
      setPendingEmailOverride("");
      setErrors({});
      setMessage(null);
      setIsEditing(false);
      setNewPassword("");
      setConfirmPassword("");
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
        .select("first_name,last_name,phone,avatar_url")
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
        lastName: data?.last_name || "",
        phone: data?.phone || "",
      };

      setFirstName(nextProfile.firstName);
      setLastName(nextProfile.lastName);
      setPhone(nextProfile.phone);
      setAvatarUrl(nextProfile.avatarUrl);
      setAvatarVersion(Date.now());
      setAvatarPreviewUrl(null);
      setPendingAvatarFile(null);
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
    () => ({ email, firstName, lastName, phone }),
    [email, firstName, lastName, phone],
  );
  const currentProfile = React.useMemo<ProfileSnapshot>(
    () => ({ ...values, avatarUrl }),
    [avatarUrl, values],
  );
  const displayName = React.useMemo(() => buildDisplayName(values), [values]);
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
      if (field === "lastName") setLastName(sanitizedValue);
      if (field === "email") setEmail(sanitizedValue);
      if (field === "phone") setPhone(sanitizedValue);

      setErrors((current) => ({ ...current, [field]: undefined }));
    },
    [],
  );

  const startEditing = React.useCallback(() => {
    setErrors({});
    setMessage(null);
    setIsEditing(true);
  }, []);

  const cancelEditing = React.useCallback(() => {
    if (profileSnapshot) {
      setFirstName(profileSnapshot.firstName);
      setLastName(profileSnapshot.lastName);
      setEmail(profileSnapshot.email);
      setPhone(profileSnapshot.phone);
      setAvatarUrl(profileSnapshot.avatarUrl);
      setAvatarVersion(Date.now());
    }

    setAvatarPreviewUrl(null);
    setPendingAvatarFile(null);
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
    setMessage(null);
    setIsEditing(false);
  }, [profileSnapshot]);

  const saveProfile = React.useCallback(async () => {
    if (!user || !isEditing) return;

    const result = validateProfileForm(values);
    setFirstName(result.values.firstName);
    setLastName(result.values.lastName);
    setEmail(result.values.email);
    setPhone(result.values.phone);
    setErrors(result.errors);

    if (!result.valid) {
      setMessage({
        tone: "error",
        text: "Fix the highlighted fields before saving.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    const emailChanged =
      result.values.email !== (profileSnapshot?.email || user.email || "");

    let nextAvatarUrl = avatarUrl;
    let uploadedAvatarPath: string | null = null;

    if (pendingAvatarFile) {
      const ext = pendingAvatarFile.name.split(".").pop() || "png";
      uploadedAvatarPath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(uploadedAvatarPath, pendingAvatarFile, {
          contentType: pendingAvatarFile.type,
        });

      if (uploadError) {
        const bucketMissing = uploadError.message
          .toLowerCase()
          .includes("bucket not found");
        setSaving(false);
        setMessage({
          tone: bucketMissing ? "info" : "error",
          text: bucketMissing
            ? `Avatar preview is selected, but it cannot be saved because Supabase bucket "${AVATAR_BUCKET}" does not exist.`
            : "Avatar upload failed. Please try another supported image.",
        });
        return;
      }

      const { data } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(uploadedAvatarPath);
      nextAvatarUrl = data.publicUrl;
    }

    const { error } = await supabase.from(PROFILE_TABLE).upsert(
      buildProfileDetailsPayload({
        avatarUrl: nextAvatarUrl,
        userId: user.id,
        values: result.values,
      }),
      { onConflict: "id" },
    );

    if (error) {
      if (uploadedAvatarPath) {
        await supabase.storage.from(AVATAR_BUCKET).remove([uploadedAvatarPath]);
      }
      setSaving(false);
      setMessage({ tone: "error", text: "Save failed. Please try again." });
      return;
    }

    if (emailChanged) {
      const previousEmail = profileSnapshot?.email || user.email || "";
      const { data: emailData, error: emailError } =
        await supabase.auth.updateUser(
          { email: result.values.email },
          { emailRedirectTo: `${window.location.origin}/Profile` },
        );

      if (emailError) {
        setSaving(false);
        setEmail(previousEmail);
        setAvatarUrl(nextAvatarUrl);
        setAvatarVersion(Date.now());
        setAvatarPreviewUrl(null);
        setPendingAvatarFile(null);
        setProfileSnapshot({
          ...result.values,
          avatarUrl: nextAvatarUrl,
          email: previousEmail,
        });
        setMessage({
          tone: "error",
          text: "Profile details saved, but the email update failed. Please try again.",
        });
        return;
      }

      const nextPendingEmail = sanitizeEmail(emailData.user?.new_email || "");
      setPendingEmailOverride(
        emailData.user?.email_change_sent_at || nextPendingEmail
          ? nextPendingEmail || result.values.email
          : "",
      );
      setEmail(result.values.email);
    }

    setSaving(false);
    setAvatarUrl(nextAvatarUrl);
    setAvatarVersion(Date.now());
    setAvatarPreviewUrl(null);
    setPendingAvatarFile(null);
    setProfileSnapshot({ ...result.values, avatarUrl: nextAvatarUrl });
    setIsEditing(false);
    setNewPassword("");
    setConfirmPassword("");
    setMessage({
      tone: "success",
      text: emailChanged
        ? "Profile saved. Check the confirmation email to verify the email change."
        : "Profile saved successfully.",
    });
  }, [
    avatarUrl,
    isEditing,
    pendingAvatarFile,
    profileSnapshot?.email,
    user,
    values,
  ]);

  const changeAvatar = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!user || !isEditing) return;

      const file = event.target.files?.[0];
      if (!file) return;

      setMessage(null);

      if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
        setMessage({
          tone: "error",
          text: "Please choose a JPG, PNG, WebP, or GIF image.",
        });
        event.target.value = "";
        return;
      }

      if (file.size > MAX_AVATAR_SIZE) {
        setMessage({
          tone: "error",
          text: "Upload failed: image must be 5MB or smaller.",
        });
        event.target.value = "";
        return;
      }

      setPendingAvatarFile(file);
      setAvatarPreviewUrl(URL.createObjectURL(file));
      setMessage({
        tone: "info",
        text: "Avatar preview selected. Save profile to apply it.",
      });
      event.target.value = "";
    },
    [isEditing, user],
  );

  const changePassword = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!isEditing) {
        setMessage({
          tone: "info",
          text: "Edit profile before changing your password.",
        });
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        setMessage({
          tone: "error",
          text: "Password must be at least 6 characters.",
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        setMessage({
          tone: "error",
          text: "New password and confirmation do not match.",
        });
        return;
      }

      setUpdatingPassword(true);
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

      if (!error) {
        setNewPassword("");
        setConfirmPassword("");
      }
    },
    [confirmPassword, isEditing, newPassword],
  );

  const resendVerification = React.useCallback(async () => {
    if (!user) return;

    const targetEmail = sanitizeEmail(
      pendingEmail || profileSnapshot?.email || user.email || "",
    );
    const draftEmail = sanitizeEmail(email);
    const resendType = pendingEmail ? "email_change" : "signup";

    if (draftEmail && draftEmail !== targetEmail) {
      setMessage({
        tone: "info",
        text: "Save the email change before sending verification to a new address.",
      });
      return;
    }

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
  }, [email, pendingEmail, profileSnapshot?.email, user]);

  return {
    authLoading,
    avatarDisplayUrl,
    avatarUrl,
    cancelEditing,
    changeAvatar,
    changePassword,
    confirmPassword,
    currentProfile,
    displayName,
    email,
    emailVerified,
    errors,
    firstName,
    hasPendingEmailChange,
    initials,
    isEditing,
    lastName,
    message,
    newPassword,
    phone,
    pendingEmail,
    profileLoading,
    profileSnapshot,
    resendVerification,
    saveProfile,
    saving,
    sendingVerification,
    setConfirmPassword,
    setNewPassword,
    startEditing,
    updateProfileField,
    updatingPassword,
    user,
    userIdPreview,
  };
}
