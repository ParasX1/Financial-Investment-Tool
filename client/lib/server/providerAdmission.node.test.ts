import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { createServer, type Server } from "node:http";
import { gzipSync } from "node:zlib";
import {
  fetchAdmittedProviderResponse,
  ProviderAdmission,
} from "./providerAdmission";

describe("provider admission with native fetch and a local HTTP fixture", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((request, response) => {
      if (request.url === "/stalled-headers") return;
      if (request.url === "/stalled-body") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.flushHeaders();
        response.write('{"partial":');
        return;
      }
      if (request.url === "/compressed-oversize") {
        const compressed = gzipSync(
          JSON.stringify({ padding: "x".repeat(2 * 1024 * 1024) }),
        );
        response.writeHead(200, {
          "Content-Encoding": "gzip",
          "Content-Length": compressed.byteLength,
          "Content-Type": "application/json",
        });
        response.end(compressed);
        return;
      }
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end('{"ok":true}');
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No fixture address");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it.each(["stalled-headers", "stalled-body"])(
    "times out native %s and allows the next request through the same permit",
    async (path) => {
      const admission = new ProviderAdmission(1, 1);
      await expect(
        fetchAdmittedProviderResponse(
          `${baseUrl}/${path}`,
          {},
          {
            admission,
            timeoutMs: 500,
          },
        ),
      ).rejects.toMatchObject({ code: "timeout" });
      const healthy = await fetchAdmittedProviderResponse(
        `${baseUrl}/ok`,
        {},
        { admission },
      );
      expect(await healthy.json()).toEqual({ ok: true });
    },
  );

  it("limits decompressed bytes even when gzip Content-Length is below the body limit", async () => {
    await expect(
      fetchAdmittedProviderResponse(`${baseUrl}/compressed-oversize`),
    ).rejects.toMatchObject({ code: "body-limit" });
    const healthy = await fetchAdmittedProviderResponse(`${baseUrl}/ok`);
    expect(await healthy.clone().json()).toEqual({ ok: true });
    expect(await healthy.text()).toBe('{"ok":true}');
  });
});
