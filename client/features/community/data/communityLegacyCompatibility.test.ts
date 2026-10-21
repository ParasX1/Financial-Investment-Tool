import {
  isLegacyCommunityCommentSchemaError,
  isLegacyCommunityPostSchemaError,
  isMissingAtomicCommunityPostFunction,
} from "./communityLegacyCompatibility";

describe("Community legacy compatibility policy", () => {
  it.each([
    {
      code: "42703",
      message: 'column "body" does not exist',
    },
    {
      code: "PGRST204",
      message:
        "Could not find the 'image_path' column of 'posts' in the schema cache",
    },
    {
      code: "PGRST200",
      message: "Could not find a relationship between posts and post_tickers",
    },
  ])("recognizes a supported legacy post schema error", (error) => {
    expect(isLegacyCommunityPostSchemaError(error)).toBe(true);
  });

  it.each([
    {
      code: "42501",
      message: 'permission denied for column "body"',
    },
    {
      code: "23514",
      message: 'new row violates check constraint for column "body"',
    },
    {
      code: "PGRST204",
      message:
        "Could not find the 'display_name' column of 'profiles' in the schema cache",
    },
  ])("does not downgrade on non-schema or unrelated errors", (error) => {
    expect(isLegacyCommunityPostSchemaError(error)).toBe(false);
  });

  it("limits comment fallback to the historical image_path column", () => {
    expect(
      isLegacyCommunityCommentSchemaError({
        code: "42703",
        message: 'column "image_path" does not exist',
      }),
    ).toBe(true);
    expect(
      isLegacyCommunityCommentSchemaError({
        code: "42703",
        message: 'column "author_id" does not exist',
      }),
    ).toBe(false);
  });

  it("only treats a missing atomic RPC as a compatibility signal", () => {
    expect(
      isMissingAtomicCommunityPostFunction({
        code: "PGRST202",
        message: "Could not find create_community_post_with_tickers",
      }),
    ).toBe(true);
    expect(
      isMissingAtomicCommunityPostFunction({
        code: "42501",
        message: "permission denied for create_community_post_with_tickers",
      }),
    ).toBe(false);
  });
});
