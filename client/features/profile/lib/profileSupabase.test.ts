import {
  fetchProfileDetails,
  isMissingHandleColumnError,
} from "./profileSupabase";

function createProfileClient(
  results: Array<{ data: Record<string, unknown> | null; error: unknown }>,
) {
  const calls: string[] = [];

  return {
    calls,
    client: {
      from(table: string) {
        calls.push(`from:${table}`);
        return {
          select(columns: string) {
            calls.push(`select:${columns}`);
            return {
              eq(column: string, value: string) {
                calls.push(`eq:${column}:${value}`);
                return {
                  async maybeSingle() {
                    const nextResult = results.shift();
                    if (!nextResult) throw new Error("No mock result queued");
                    return nextResult;
                  },
                };
              },
            };
          },
        };
      },
    },
  };
}

describe("profileSupabase", () => {
  it("detects Supabase schema-cache errors for the handle column", () => {
    expect(
      isMissingHandleColumnError({
        code: "PGRST204",
        message:
          "Could not find the 'handle' column of 'Users' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isMissingHandleColumnError({
        code: "42703",
        message: 'column "handle" does not exist',
      }),
    ).toBe(true);
    expect(
      isMissingHandleColumnError({
        code: "PGRST116",
        message: "JSON object requested, multiple rows returned",
      }),
    ).toBe(false);
  });

  it("falls back to the legacy profile query when handle has not been migrated", async () => {
    const { calls, client } = createProfileClient([
      {
        data: null,
        error: {
          code: "PGRST204",
          message:
            "Could not find the 'handle' column of 'Users' in the schema cache",
        },
      },
      {
        data: {
          avatar_url: null,
          first_name: "Nathan",
          last_name: "Li",
          phone: "+61 2 5555 1234",
        },
        error: null,
      },
    ]);

    const result = await fetchProfileDetails(client, "user-1");

    expect(result).toEqual({
      data: {
        avatar_url: null,
        first_name: "Nathan",
        handle: null,
        last_name: "Li",
        phone: "+61 2 5555 1234",
      },
      error: null,
      supportsHandle: false,
    });
    expect(calls).toEqual([
      "from:Users",
      "select:first_name,last_name,handle,phone,avatar_url",
      "eq:id:user-1",
      "from:Users",
      "select:first_name,last_name,phone,avatar_url",
      "eq:id:user-1",
    ]);
  });

  it("does not retry unrelated profile load failures", async () => {
    const { calls, client } = createProfileClient([
      {
        data: null,
        error: {
          code: "PGRST116",
          message: "JSON object requested, multiple rows returned",
        },
      },
    ]);

    const result = await fetchProfileDetails(client, "user-1");

    expect(result.error).toEqual({
      code: "PGRST116",
      message: "JSON object requested, multiple rows returned",
    });
    expect(result.supportsHandle).toBe(true);
    expect(calls).toEqual([
      "from:Users",
      "select:first_name,last_name,handle,phone,avatar_url",
      "eq:id:user-1",
    ]);
  });
});
