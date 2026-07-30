import { describe, expect, it, jest } from "@jest/globals";
import { createProfileUsersRepository } from "./profileUsersRepository";

function createLoadClient(result: unknown) {
  const maybeSingle = jest.fn<any>().mockResolvedValue(result);
  const eq = jest.fn<any>(() => ({ maybeSingle }));
  const select = jest.fn<any>(() => ({ eq }));
  const from = jest.fn<any>(() => ({ select }));

  return { client: { from } as any, eq, from, maybeSingle, select };
}

describe("profileUsersRepository", () => {
  it("loads only the profile columns for the signed-in user", async () => {
    const query = createLoadClient({
      data: {
        avatar_path: "user-a/avatar-1.png",
        avatar_url: "https://cdn.example.com/alice.png",
        first_name: "Alice",
        handle: "alice_01",
        last_name: "Ng",
        phone: "+61 400 000 001",
      },
      error: null,
    });

    const repository = createProfileUsersRepository(query.client);

    await expect(repository.findByUserId("user-a")).resolves.toEqual({
      avatarPath: "user-a/avatar-1.png",
      avatarUrl: "https://cdn.example.com/alice.png",
      firstName: "Alice",
      handle: "alice_01",
      lastName: "Ng",
      phone: "+61 400 000 001",
    });
    expect(query.from).toHaveBeenCalledWith("Users");
    expect(query.select).toHaveBeenCalledWith(
      "first_name,last_name,handle,phone,avatar_path,avatar_url",
    );
    expect(query.eq).toHaveBeenCalledWith("id", "user-a");
    expect(query.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("returns null when the user has no persisted profile row", async () => {
    const query = createLoadClient({ data: null, error: null });
    const repository = createProfileUsersRepository(query.client);

    await expect(repository.findByUserId("user-a")).resolves.toBeNull();
  });

  it("updates field-specific patches without requesting id-column write access", async () => {
    const select = jest.fn<any>().mockResolvedValue({
      data: [{ id: "user-a" }],
      error: null,
    });
    const eq = jest.fn<any>(() => ({ select }));
    const update = jest.fn<any>(() => ({ eq }));
    const from = jest.fn<any>(() => ({ update }));
    const repository = createProfileUsersRepository({ from } as any);

    await repository.saveIdentity({
      firstName: "Alice",
      handle: "alice_01",
      lastName: "Ng",
      userId: "user-a",
    });
    await repository.savePhone({
      phone: "+61 400 000 001",
      userId: "user-a",
    });
    await repository.saveAvatar({
      avatarPath: "user-a/avatar-1.png",
      avatarUrl: "https://cdn.example.com/alice.png",
      userId: "user-a",
    });

    expect(update).toHaveBeenNthCalledWith(1, {
      first_name: "Alice",
      handle: "alice_01",
      last_name: "Ng",
    });
    expect(update).toHaveBeenNthCalledWith(2, {
      phone: "+61 400 000 001",
    });
    expect(update).toHaveBeenNthCalledWith(3, {
      avatar_path: "user-a/avatar-1.png",
      avatar_url: "https://cdn.example.com/alice.png",
    });
    expect(eq).toHaveBeenCalledTimes(3);
    expect(eq).toHaveBeenCalledWith("id", "user-a");
    expect(select).toHaveBeenCalledTimes(3);
    expect(select).toHaveBeenCalledWith("id");
    for (const [payload] of update.mock.calls) {
      expect(payload).not.toHaveProperty("email");
      expect(payload).not.toHaveProperty("id");
    }
  });

  it("fails explicitly when the auth trigger has not created a profile row", async () => {
    const select = jest.fn<any>().mockResolvedValue({ data: [], error: null });
    const eq = jest.fn<any>(() => ({ select }));
    const update = jest.fn<any>(() => ({ eq }));
    const repository = createProfileUsersRepository({
      from: jest.fn<any>(() => ({ update })),
    } as any);

    await expect(
      repository.savePhone({ phone: "+61 400 000 001", userId: "user-a" }),
    ).rejects.toMatchObject({
      name: "ProfileUsersRepositoryError",
      operation: "save",
    });
  });

  it("rejects invalid users before querying and hides database details", async () => {
    const from = jest.fn<any>();
    const repository = createProfileUsersRepository({ from } as any);

    await expect(repository.findByUserId(" ")).rejects.toMatchObject({
      name: "ProfileUsersRepositoryError",
      operation: "load",
    });
    expect(from).not.toHaveBeenCalled();

    const query = createLoadClient({
      data: null,
      error: new Error("postgres host and table details"),
    });
    await expect(
      createProfileUsersRepository(query.client).findByUserId("user-a"),
    ).rejects.toThrow("Profile details could not be loaded");
  });
});
