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
import {
  buildAvatarPayload,
  buildProfileDetailsPayload,
} from "../lib/profilePersistence";
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
  const [profileSnapshot, setProfileSnapshot] =
    React.useState<ProfileSnapshot | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [errors, setErrors] = React.useState<ProfileErrors>({});
  const [message, setMessage] = React.useState<ProfileMessage | null>(null);

  const [saving, setSaving] = React.useState(false);
  const [sendingVerification, setSendingVerification] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [updatingPassword, setUpdatingPassword] = React.useState(false);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfileLoading(false);
      return;
    }

    let active = true;
    const authEmail = user.email || "";

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
          tone: "info",
          text: "Profile details are ready to edit.",
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
      setProfileSnapshot(nextProfile);
      setProfileLoading(false);
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [authLoading, user]);

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
  const emailVerified = Boolean(user?.email_confirmed_at);

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

    const { error } = await supabase.from(PROFILE_TABLE).upsert(
      buildProfileDetailsPayload({
        avatarUrl,
        userId: user.id,
        values: result.values,
      }),
      { onConflict: "id" },
    );

    if (error) {
      setSaving(false);
      setMessage({ tone: "error", text: `Save failed: ${error.message}` });
      return;
    }

    if (emailChanged) {
      const previousEmail = profileSnapshot?.email || user.email || "";
      const { error: emailError } = await supabase.auth.updateUser(
        { email: result.values.email },
        { emailRedirectTo: `${window.location.origin}/Profile` },
      );

      if (emailError) {
        setSaving(false);
        setProfileSnapshot({
          ...result.values,
          avatarUrl,
          email: previousEmail,
        });
        setMessage({
          tone: "error",
          text: `Profile details saved, but email update failed: ${emailError.message}`,
        });
        return;
      }
    }

    setSaving(false);
    setProfileSnapshot({ ...result.values, avatarUrl });
    setIsEditing(false);
    setMessage({
      tone: "success",
      text: emailChanged
        ? "Profile saved. Check your new inbox to verify the email change."
        : "Profile saved successfully.",
    });
  }, [avatarUrl, isEditing, profileSnapshot?.email, user, values]);

  const changeAvatar = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!user || !isEditing) return;

      const file = event.target.files?.[0];
      if (!file) return;

      setMessage(null);

      if (!file.type.startsWith("image/")) {
        setMessage({ tone: "error", text: "Please choose an image file." });
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

      const previewUrl = URL.createObjectURL(file);
      setAvatarPreviewUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return previewUrl;
      });

      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        const bucketMissing = uploadError.message
          .toLowerCase()
          .includes("bucket not found");
        setMessage({
          tone: bucketMissing ? "info" : "error",
          text: bucketMissing
            ? `Avatar preview updated, but it was not saved because Supabase bucket "${AVATAR_BUCKET}" does not exist.`
            : `Upload failed: ${uploadError.message}`,
        });
        event.target.value = "";
        return;
      }

      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const publicUrl = data.publicUrl;

      setAvatarUrl(publicUrl);
      setAvatarVersion(Date.now());
      setAvatarPreviewUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return null;
      });

      const { error: profileError } = await supabase
        .from(PROFILE_TABLE)
        .upsert(buildAvatarPayload({ avatarUrl: publicUrl, userId: user.id }), {
          onConflict: "id",
        });

      if (!profileError) {
        setProfileSnapshot((current) =>
          current
            ? { ...current, avatarUrl: publicUrl }
            : {
                avatarUrl: publicUrl,
                email: user.email || email,
                firstName,
                lastName,
                phone,
              },
        );
      }

      setMessage(
        profileError
          ? {
              tone: "error",
              text: `Avatar uploaded, but profile save failed: ${profileError.message}`,
            }
          : { tone: "success", text: "Avatar updated successfully." },
      );
      event.target.value = "";
    },
    [email, firstName, isEditing, lastName, phone, user],
  );

  const changePassword = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!isEditing) {
        setMessage({
          tone: "info",
          text: "Unlock editing before changing your password.",
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
          ? { tone: "error", text: `Password update failed: ${error.message}` }
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
    const targetEmail = sanitizeEmail(email || user?.email || "");
    if (!targetEmail || !isValidEmail(targetEmail)) {
      setErrors((current) => ({
        ...current,
        email: "Enter a valid email address before sending verification.",
      }));
      return;
    }

    setSendingVerification(true);
    setMessage(null);

    const { error } = await supabase.auth.resend({
      email: targetEmail,
      options: { emailRedirectTo: `${window.location.origin}/Profile` },
      type: "signup",
    });

    setSendingVerification(false);
    setMessage(
      error
        ? { tone: "error", text: `Verification email failed: ${error.message}` }
        : {
            tone: "success",
            text: "Verification email sent. Check your inbox.",
          },
    );
  }, [email, user?.email]);

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
    initials,
    isEditing,
    lastName,
    message,
    newPassword,
    phone,
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
