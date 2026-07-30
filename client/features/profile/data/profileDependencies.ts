import supabase from "@/components/supabase";
import {
  createProfileAccountClient,
  type ProfileAccountClient,
} from "./profileAccountClient";
import {
  createProfileAvatarStorage,
  type ProfileAvatarStorage,
} from "./profileAvatarStorage";
import {
  createProfileUsersRepository,
  type ProfileUsersRepository,
} from "./profileUsersRepository";

export function resolveProfileAvatarBucket(
  env: NodeJS.ProcessEnv = process.env,
) {
  return env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET?.trim() || "avatars";
}

const AVATAR_BUCKET = resolveProfileAvatarBucket();

export interface ProfileControllerDependencies {
  accountClient: ProfileAccountClient;
  avatarStorage: ProfileAvatarStorage;
  usersRepository: ProfileUsersRepository;
}

export const defaultProfileDependencies: ProfileControllerDependencies = {
  accountClient: createProfileAccountClient(supabase.auth),
  avatarStorage: createProfileAvatarStorage(supabase.storage, {
    bucket: AVATAR_BUCKET,
  }),
  usersRepository: createProfileUsersRepository(supabase),
};
