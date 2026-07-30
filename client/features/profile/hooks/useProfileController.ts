import * as React from "react";
import { useAuth } from "@/components/authContext";
import {
  defaultProfileDependencies,
  type ProfileControllerDependencies,
} from "../data/profileDependencies";
import { ProfileAvatarStorageError } from "../data/profileAvatarStorage";
import {
  MAX_AVATAR_SIZE,
  buildFallbackHandle,
  sanitizeEmail,
  sanitizeProfileField,
  validateEmail,
  validateIdentity,
  validatePhoneDetails,
} from "../lib/profileValidation";
import {
  buildAvatarDisplayUrl,
  buildDisplayName,
  buildProfileHandle,
  buildInitials,
  formatUserIdPreview,
} from "../lib/profileView";
import type {
  ProfileEmailValues,
  ProfileErrors,
  ProfileFieldKey,
  ProfilePhoneValues,
  ProfileIdentityValues,
  ProfileMessage,
  ProfileSnapshot,
} from "../types";

const ALLOWED_AVATAR_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type ProfileOwner = {
  sessionToken: symbol;
  userId: string;
};

type ProfileSession = {
  key: string;
  token: symbol;
};

const useCommittedLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

async function removeAvatarObject(
  avatarStorage: ProfileControllerDependencies["avatarStorage"],
  input: { path: string; userId: string },
) {
  try {
    await avatarStorage.remove(input);
    return true;
  } catch {
    return false;
  }
}

export function useProfileController(
  dependencies: ProfileControllerDependencies = defaultProfileDependencies,
) {
  const { accountClient, avatarStorage, usersRepository } = dependencies;
  const { user, loading: authLoading } = useAuth();
  const authUserId = user?.id ?? null;
  const authEmail = sanitizeEmail(user?.email || "");
  const authSessionKey = authLoading
    ? `loading:${authUserId ?? ""}`
    : authUserId
      ? `user:${authUserId}`
      : "signed-out";
  const authSession = React.useMemo<ProfileSession>(
    () => ({ key: authSessionKey, token: Symbol(authSessionKey) }),
    [authSessionKey],
  );
  const committedSessionRef = React.useRef(authSession);
  useCommittedLayoutEffect(() => {
    committedSessionRef.current = authSession;
  }, [authSession]);

  const isSessionCurrent = React.useCallback(
    (ownerId: string, sessionToken: symbol) =>
      committedSessionRef.current.key === `user:${ownerId}` &&
      committedSessionRef.current.token === sessionToken,
    [],
  );

  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [avatarStoragePath, setAvatarStoragePath] = React.useState<
    string | null
  >(null);
  const [avatarVersion, setAvatarVersion] = React.useState(0);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState<string | null>(
    null,
  );
  const [profileSnapshot, setProfileSnapshot] =
    React.useState<ProfileSnapshot | null>(null);
  const [profileOwner, setProfileOwner] = React.useState<ProfileOwner | null>(
    null,
  );
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
    if (!authUserId) {
      setEmail("");
      setFirstName("");
      setHandle("");
      setLastName("");
      setPhone("");
      setAvatarUrl(null);
      setAvatarStoragePath(null);
      setAvatarPreviewUrl(null);
      setProfileSnapshot(null);
      setProfileOwner(null);
      setPendingEmailOverride("");
      setErrors({});
      setMessage(null);
      setProfileLoading(false);
      setSavingDetails(false);
      setSavingContact(false);
      setSavingAvatar(false);
      setSendingVerification(false);
      setUpdatingPassword(false);
      return;
    }

    let active = true;
    const owner: ProfileOwner = {
      sessionToken: authSession.token,
      userId: authUserId,
    };

    setEmail(authEmail);
    setFirstName("");
    setHandle("");
    setLastName("");
    setPhone("");
    setAvatarUrl(null);
    setAvatarStoragePath(null);
    setAvatarPreviewUrl(null);
    setProfileSnapshot(null);
    setProfileOwner(owner);
    setPendingEmailOverride("");
    setErrors({});
    setMessage(null);
    setProfileLoading(true);
    setSavingDetails(false);
    setSavingContact(false);
    setSavingAvatar(false);
    setSendingVerification(false);
    setUpdatingPassword(false);

    const loadProfile = async () => {
      try {
        const details = await usersRepository.findByUserId(authUserId);

        if (!active || !isSessionCurrent(authUserId, authSession.token)) return;

        const nextProfile: ProfileSnapshot = {
          avatarUrl: details?.avatarUrl ?? null,
          email: authEmail,
          firstName: details?.firstName ?? "",
          handle: details?.handle || buildFallbackHandle(authEmail, authUserId),
          lastName: details?.lastName ?? "",
          phone: details?.phone ?? "",
        };

        setFirstName(nextProfile.firstName);
        setHandle(nextProfile.handle);
        setLastName(nextProfile.lastName);
        setPhone(nextProfile.phone);
        setAvatarUrl(nextProfile.avatarUrl);
        setAvatarStoragePath(details?.avatarPath ?? null);
        setAvatarVersion(Date.now());
        setAvatarPreviewUrl(null);
        setProfileSnapshot(nextProfile);
      } catch {
        if (!active || !isSessionCurrent(authUserId, authSession.token)) return;
        setMessage({
          tone: "error",
          text: "Profile details could not be loaded. Refresh the page or sign in again.",
        });
      } finally {
        if (active && isSessionCurrent(authUserId, authSession.token)) {
          setProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [
    authEmail,
    authLoading,
    authSession.token,
    authUserId,
    isSessionCurrent,
    usersRepository,
  ]);

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
  const profileVisible = Boolean(
    !authLoading &&
      user &&
      profileOwner?.userId === user.id &&
      profileOwner.sessionToken === authSession.token,
  );
  const profileReady =
    profileVisible && Boolean(profileSnapshot) && !profileLoading;
  const visibleValues = React.useMemo(
    () => ({
      email: profileVisible
        ? email
        : !authLoading && user
          ? sanitizeEmail(user.email || "")
          : "",
      firstName: profileVisible ? firstName : "",
      handle: profileVisible ? handle : "",
      lastName: profileVisible ? lastName : "",
      phone: profileVisible ? phone : "",
    }),
    [
      authLoading,
      email,
      firstName,
      handle,
      lastName,
      phone,
      profileVisible,
      user,
    ],
  );
  const currentProfile = React.useMemo<ProfileSnapshot>(
    () => ({
      ...visibleValues,
      avatarUrl: profileVisible ? avatarUrl : null,
    }),
    [avatarUrl, profileVisible, visibleValues],
  );
  const displayName = React.useMemo(
    () => buildDisplayName(visibleValues),
    [visibleValues],
  );
  const profileHandle = React.useMemo(
    () => buildProfileHandle(visibleValues),
    [visibleValues],
  );
  const initials = React.useMemo(
    () => buildInitials(visibleValues),
    [visibleValues],
  );
  const userIdPreview = React.useMemo(
    () => formatUserIdPreview(profileVisible ? user?.id : undefined),
    [profileVisible, user?.id],
  );
  const avatarDisplayUrl = React.useMemo(
    () =>
      profileVisible
        ? avatarPreviewUrl || buildAvatarDisplayUrl(avatarUrl, avatarVersion)
        : null,
    [avatarPreviewUrl, avatarUrl, avatarVersion, profileVisible],
  );
  const pendingEmail = sanitizeEmail(
    !authLoading && user
      ? user.new_email || (profileVisible ? pendingEmailOverride : "")
      : "",
  );
  const hasPendingEmailChange = Boolean(
    pendingEmail && (user?.email_change_sent_at || pendingEmailOverride),
  );
  const emailVerified =
    Boolean(user?.email_confirmed_at) && !hasPendingEmailChange;

  const updateProfileField = React.useCallback(
    (field: ProfileFieldKey, value: string) => {
      if (!profileReady) return;
      const sanitizedValue = sanitizeProfileField(field, value);

      if (field === "firstName") setFirstName(sanitizedValue);
      if (field === "handle") setHandle(sanitizedValue);
      if (field === "lastName") setLastName(sanitizedValue);
      if (field === "email") setEmail(sanitizedValue);
      if (field === "phone") setPhone(sanitizedValue);

      setErrors((current) => ({ ...current, [field]: undefined }));
    },
    [profileReady],
  );

  const clearFeedback = React.useCallback(() => {
    setErrors({});
    setMessage(null);
  }, []);

  const saveIdentity = React.useCallback(
    async (nextIdentity: ProfileIdentityValues) => {
      if (!user || !profileReady) return false;
      const ownerId = user.id;
      const ownerToken = authSession.token;

      const result = validateIdentity(nextIdentity);
      setErrors(result.errors);

      if (!result.valid) {
        setMessage({
          tone: "error",
          text: "Fix the highlighted fields before saving your profile.",
        });
        return false;
      }

      setSavingDetails(true);
      setMessage(null);

      try {
        await usersRepository.saveIdentity({
          ...result.values,
          userId: ownerId,
        });
      } catch {
        if (isSessionCurrent(ownerId, ownerToken)) {
          setSavingDetails(false);
          setMessage({
            tone: "error",
            text: "Profile save failed. Try again.",
          });
        }
        return false;
      }

      if (!isSessionCurrent(ownerId, ownerToken)) return false;
      setSavingDetails(false);
      setFirstName(result.values.firstName);
      setHandle(result.values.handle);
      setLastName(result.values.lastName);
      setProfileSnapshot((current) =>
        current ? { ...current, ...result.values } : current,
      );
      setMessage({ tone: "success", text: "Profile identity updated." });
      return true;
    },
    [isSessionCurrent, profileReady, authSession.token, user, usersRepository],
  );

  const saveEmail = React.useCallback(
    async (nextEmail: ProfileEmailValues) => {
      if (!user || !profileReady) return false;
      const ownerId = user.id;
      const ownerToken = authSession.token;

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

      let emailChange;
      try {
        emailChange = await accountClient.requestEmailChange({
          email: result.values.email,
          redirectTo: `${window.location.origin}/Profile`,
        });
      } catch {
        if (isSessionCurrent(ownerId, ownerToken)) {
          setSavingContact(false);
          setEmail(previousEmail);
          setProfileSnapshot((current) =>
            current ? { ...current, email: previousEmail } : current,
          );
          setMessage({
            tone: "error",
            text: "Email change could not be started. Please try again.",
          });
        }
        return false;
      }

      if (!isSessionCurrent(ownerId, ownerToken)) return false;
      setSavingContact(false);
      setEmail(previousEmail);
      setProfileSnapshot((current) =>
        current ? { ...current, email: previousEmail } : current,
      );
      const nextPendingEmail = sanitizeEmail(emailChange.pendingEmail || "");
      setPendingEmailOverride(
        emailChange.sentAt || nextPendingEmail
          ? nextPendingEmail || result.values.email
          : "",
      );
      setMessage({
        tone: "success",
        text: "Email change started. Check your inbox to confirm it.",
      });
      return true;
    },
    [
      accountClient,
      isSessionCurrent,
      profileSnapshot?.email,
      profileReady,
      authSession.token,
      user,
    ],
  );

  const savePhone = React.useCallback(
    async (nextPhone: ProfilePhoneValues) => {
      if (!user || !profileReady) return false;
      const ownerId = user.id;
      const ownerToken = authSession.token;

      const result = validatePhoneDetails(nextPhone);
      setErrors(result.errors);

      if (!result.valid) {
        setMessage({
          tone: "error",
          text: "Fix the highlighted phone number before saving.",
        });
        return false;
      }

      setSavingContact(true);
      setMessage(null);

      try {
        await usersRepository.savePhone({
          phone: result.values.phone,
          userId: ownerId,
        });
      } catch {
        if (isSessionCurrent(ownerId, ownerToken)) {
          setSavingContact(false);
          setMessage({ tone: "error", text: "Phone save failed. Try again." });
        }
        return false;
      }

      if (!isSessionCurrent(ownerId, ownerToken)) return false;
      setSavingContact(false);
      setPhone(result.values.phone);
      setProfileSnapshot((current) =>
        current ? { ...current, phone: result.values.phone } : current,
      );
      setMessage({ tone: "success", text: "Phone updated." });
      return true;
    },
    [isSessionCurrent, profileReady, authSession.token, user, usersRepository],
  );

  const changeAvatar = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!user || !profileReady) return false;
      const ownerId = user.id;
      const ownerToken = authSession.token;

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
      setSavingAvatar(true);
      setAvatarPreviewUrl(previewUrl);

      let uploadedAvatar: Awaited<
        ReturnType<ProfileControllerDependencies["avatarStorage"]["upload"]>
      > | null = null;
      let profileSaved = false;
      const previousAvatarPath = avatarStoragePath;

      try {
        uploadedAvatar = await avatarStorage.upload({ file, userId: ownerId });

        if (!isSessionCurrent(ownerId, ownerToken)) {
          if (previousAvatarPath !== uploadedAvatar.path) {
            await removeAvatarObject(avatarStorage, {
              path: uploadedAvatar.path,
              userId: ownerId,
            });
          }
          uploadedAvatar = null;
          return false;
        }

        const profileAlreadyReferencesAvatar = Boolean(
          avatarUrl && previousAvatarPath === uploadedAvatar.path,
        );
        if (!profileAlreadyReferencesAvatar) {
          await usersRepository.saveAvatar({
            avatarPath: uploadedAvatar.path,
            avatarUrl: uploadedAvatar.publicUrl,
            userId: ownerId,
          });
        }
        profileSaved = true;

        const previousAvatarRemoved =
          !previousAvatarPath || previousAvatarPath === uploadedAvatar.path
            ? true
            : await removeAvatarObject(avatarStorage, {
                path: previousAvatarPath,
                userId: ownerId,
              });

        if (!isSessionCurrent(ownerId, ownerToken)) return false;

        const nextAvatarUrl = uploadedAvatar.publicUrl;
        setAvatarStoragePath(uploadedAvatar.path);
        setAvatarUrl(nextAvatarUrl);
        setAvatarVersion(Date.now());
        setProfileSnapshot((current) =>
          current ? { ...current, avatarUrl: nextAvatarUrl } : current,
        );
        setMessage(
          previousAvatarRemoved
            ? { tone: "success", text: "Profile photo updated." }
            : {
                tone: "info",
                text: "Profile photo updated, but the previous file could not be removed.",
              },
        );
        return true;
      } catch (error) {
        let uploadedAvatarRemoved = true;
        if (
          uploadedAvatar &&
          !profileSaved &&
          uploadedAvatar.path !== previousAvatarPath
        ) {
          uploadedAvatarRemoved = await removeAvatarObject(avatarStorage, {
            path: uploadedAvatar.path,
            userId: ownerId,
          });
        }

        if (isSessionCurrent(ownerId, ownerToken)) {
          const bucketMissing =
            error instanceof ProfileAvatarStorageError &&
            error.code === "bucket_missing";
          setMessage({
            tone: bucketMissing ? "info" : "error",
            text: bucketMissing
              ? "Avatar storage is not available yet."
              : uploadedAvatar
                ? uploadedAvatarRemoved
                  ? "Avatar save failed. Try again."
                  : "Avatar save failed, and the uploaded file could not be removed."
                : "Avatar upload failed. Please try another supported image.",
          });
        }
        return false;
      } finally {
        URL.revokeObjectURL(previewUrl);
        if (isSessionCurrent(ownerId, ownerToken)) {
          setSavingAvatar(false);
          setAvatarPreviewUrl(null);
        }
      }
    },
    [
      avatarStorage,
      avatarStoragePath,
      avatarUrl,
      isSessionCurrent,
      profileReady,
      authSession.token,
      user,
      usersRepository,
    ],
  );

  const changePassword = React.useCallback(
    async (newPassword: string, confirmPassword: string) => {
      if (!user || !profileReady) return false;
      const ownerId = user.id;
      const ownerToken = authSession.token;

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

      try {
        await accountClient.updatePassword(newPassword);
      } catch {
        if (isSessionCurrent(ownerId, ownerToken)) {
          setUpdatingPassword(false);
          setMessage({
            tone: "error",
            text: "Password update failed. Please sign in again and retry.",
          });
        }
        return false;
      }

      if (!isSessionCurrent(ownerId, ownerToken)) return false;
      setUpdatingPassword(false);
      setMessage({ tone: "success", text: "Password updated successfully." });
      return true;
    },
    [accountClient, isSessionCurrent, profileReady, authSession.token, user],
  );

  const resendVerification = React.useCallback(async () => {
    if (!user || !profileReady) return;
    const ownerId = user.id;
    const ownerToken = authSession.token;

    const targetEmail = sanitizeEmail(
      pendingEmail || profileSnapshot?.email || user.email || "",
    );
    const resendType = pendingEmail ? "email_change" : "signup";

    if (!validateEmail({ email: targetEmail }).valid) {
      setErrors((current) => ({
        ...current,
        email: "Save a valid email address before sending verification.",
      }));
      return;
    }

    setSendingVerification(true);
    setMessage(null);

    try {
      await accountClient.resendVerification({
        email: targetEmail,
        kind: resendType,
        redirectTo: `${window.location.origin}/Profile`,
      });
    } catch {
      if (isSessionCurrent(ownerId, ownerToken)) {
        setSendingVerification(false);
        setMessage({
          tone: "error",
          text: "Verification email could not be sent. Please try again.",
        });
      }
      return;
    }

    if (!isSessionCurrent(ownerId, ownerToken)) return;
    setSendingVerification(false);
    setMessage({
      tone: "success",
      text: pendingEmail
        ? "Email change verification sent. Check the confirmation email."
        : "Verification email sent. Check your inbox.",
    });
  }, [
    accountClient,
    isSessionCurrent,
    pendingEmail,
    profileReady,
    profileSnapshot?.email,
    authSession.token,
    user,
  ]);

  return {
    authLoading,
    avatarDisplayUrl,
    avatarUrl: profileVisible ? avatarUrl : null,
    changeAvatar,
    changePassword,
    clearFeedback,
    currentProfile,
    displayName,
    email: visibleValues.email,
    emailVerified,
    errors: profileVisible ? errors : {},
    firstName: visibleValues.firstName,
    handle: visibleValues.handle,
    hasPendingEmailChange,
    initials,
    lastName: visibleValues.lastName,
    message: profileVisible ? message : null,
    phone: visibleValues.phone,
    pendingEmail,
    profileHandle,
    profileLoading: Boolean(
      !authLoading && user && (!profileVisible || profileLoading),
    ),
    profileSnapshot: profileVisible ? profileSnapshot : null,
    resendVerification,
    saveEmail,
    saveIdentity,
    savePhone,
    savingAvatar: profileVisible ? savingAvatar : false,
    savingContact: profileVisible ? savingContact : false,
    savingDetails: profileVisible ? savingDetails : false,
    sendingVerification: profileVisible ? sendingVerification : false,
    updateProfileField,
    updatingPassword: profileVisible ? updatingPassword : false,
    user,
    userIdPreview,
  };
}
