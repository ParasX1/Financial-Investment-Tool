import { afterEach, describe, expect, it, jest } from "@jest/globals";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const originalAnon = process.env.NEXT_PUBLIC_ANON;

function restoreEnvironment(
  name:
    | "NEXT_PUBLIC_SUPABASE_URL"
    | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    | "NEXT_PUBLIC_ANON",
  value: string | undefined,
) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  jest.resetModules();
  restoreEnvironment("NEXT_PUBLIC_SUPABASE_URL", originalUrl);
  restoreEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY", originalAnonKey);
  restoreEnvironment("NEXT_PUBLIC_ANON", originalAnon);
});

describe("Community Supabase client ownership", () => {
  it("reuses the application singleton when Supabase is configured", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = [
      "public",
      "test",
      "value",
    ].join("-");
    delete process.env.NEXT_PUBLIC_ANON;

    const sharedClient = require("@/lib/supabase").supabase;
    const { getCommunitySupabaseClient } = require("./communityClient");

    expect(getCommunitySupabaseClient()).toBe(sharedClient);
  });

  it("keeps Community in explicit demo mode when configuration is absent", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_ANON;

    const { getCommunitySupabaseClient } = require("./communityClient");

    expect(getCommunitySupabaseClient()).toBeNull();
  });
});
