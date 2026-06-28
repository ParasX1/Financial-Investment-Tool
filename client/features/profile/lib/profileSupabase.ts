export const PROFILE_TABLE = "Users";
export const PROFILE_COLUMNS_WITH_HANDLE =
  "first_name,last_name,handle,phone,avatar_url";
export const PROFILE_COLUMNS_LEGACY = "first_name,last_name,phone,avatar_url";

export type ProfileDetailsRow = {
  avatar_url?: string | null;
  first_name?: string | null;
  handle?: string | null;
  last_name?: string | null;
  phone?: string | null;
};

export type ProfileQueryError = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

type ProfileQueryResult = {
  data: ProfileDetailsRow | null;
  error: ProfileQueryError | null;
};

type ProfileQuery = {
  maybeSingle(): PromiseLike<ProfileQueryResult>;
};

type ProfileFilter = {
  eq(column: string, value: string): ProfileQuery;
};

type ProfileSelect = {
  select(columns: string): ProfileFilter;
};

export type ProfileSupabaseClient = {
  from(table: string): ProfileSelect;
};

function getErrorText(error: unknown) {
  if (!error || typeof error !== "object") return "";

  const queryError = error as ProfileQueryError;
  return [
    queryError.code,
    queryError.message,
    queryError.details,
    queryError.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function isMissingHandleColumnError(error: unknown) {
  const text = getErrorText(error);

  return (
    text.includes("handle") &&
    (text.includes("pgrst204") ||
      text.includes("42703") ||
      text.includes("schema cache") ||
      text.includes("column") ||
      text.includes("does not exist"))
  );
}

async function fetchProfileRow(
  supabaseClient: ProfileSupabaseClient,
  userId: string,
  columns: string,
) {
  return supabaseClient
    .from(PROFILE_TABLE)
    .select(columns)
    .eq("id", userId)
    .maybeSingle();
}

export async function fetchProfileDetails(
  supabaseClient: ProfileSupabaseClient,
  userId: string,
) {
  const withHandle = await fetchProfileRow(
    supabaseClient,
    userId,
    PROFILE_COLUMNS_WITH_HANDLE,
  );

  if (!withHandle.error || !isMissingHandleColumnError(withHandle.error)) {
    return {
      data: withHandle.data,
      error: withHandle.error,
      supportsHandle: true,
    };
  }

  const legacy = await fetchProfileRow(
    supabaseClient,
    userId,
    PROFILE_COLUMNS_LEGACY,
  );

  return {
    data: legacy.data ? { ...legacy.data, handle: null } : legacy.data,
    error: legacy.error,
    supportsHandle: false,
  };
}
