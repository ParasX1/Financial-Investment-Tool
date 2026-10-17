import { describe, expect, it } from "@jest/globals";
import { createLatestWriteQueue } from "./latestWriteQueue";

type Request = {
  scopeKey: string;
  value: string;
  onSuccess: (isLatest: boolean) => void;
  onError: (isLatest: boolean) => void;
};

const flushWrites = async () => {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
};

describe("latest write queue", () => {
  it("preserves a new write enqueued by the previous success callback", async () => {
    const writes: string[] = [];
    const queue = createLatestWriteQueue<Request>(async ({ value }) => {
      writes.push(value);
    });
    const onError = jest.fn();
    const latestSuccess = jest.fn();
    queue.enqueue({
      scopeKey: "owner",
      value: "first",
      onSuccess: (isLatest) => {
        expect(isLatest).toBe(true);
        queue.enqueue({
          scopeKey: "owner",
          value: "latest",
          onSuccess: latestSuccess,
          onError,
        });
      },
      onError,
    });

    await flushWrites();
    expect(writes).toEqual(["first", "latest"]);
    expect(latestSuccess).toHaveBeenCalledWith(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it("handles synchronous write failures and releases the scope for a later retry", async () => {
    const onError = jest.fn();
    const onSuccess = jest.fn();
    const write = jest
      .fn<Promise<void>, [Request]>()
      .mockImplementationOnce(() => {
        throw new Error("write failed");
      })
      .mockResolvedValueOnce(undefined);
    const queue = createLatestWriteQueue(write);
    const request = { scopeKey: "owner", value: "latest", onSuccess, onError };

    queue.enqueue(request);
    await flushWrites();
    expect(onError).toHaveBeenCalledWith(true);
    expect(onSuccess).not.toHaveBeenCalled();
    queue.enqueue(request);
    await flushWrites();
    expect(write).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenCalledWith(true);
  });
});
