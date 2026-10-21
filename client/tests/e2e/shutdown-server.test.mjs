import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, get } from "node:http";
import { connect } from "node:net";
import { test } from "node:test";
import { createTestServerShutdown } from "./shutdown-server.mjs";

async function fixture(t, app, options) {
  const sockets = new Set();
  const server = createServer((_request, response) => {
    response.writeHead(200);
    response.write("held response");
  });
  server.on("connection", (socket) => sockets.add(socket));
  server.on("upgrade", (_request, socket) => {
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n",
    );
  });
  const close = createTestServerShutdown(server, app, options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    for (const socket of sockets) socket.destroy();
    if (server.listening) server.close();
  });
  return { close, port: server.address().port, server };
}

async function within(promise, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Shutdown did not complete")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

test("closes held HTTP responses and upgraded WebSocket sockets before awaiting Next cleanup", async (t) => {
  let nextClosed = false;
  const { close, port, server } = await fixture(t, {
    close: async () => {
      nextClosed = true;
    },
  });
  const request = get(`http://127.0.0.1:${port}/held`);
  request.on("error", () => {});
  t.after(() => request.destroy());
  const [response] = await once(request, "response");
  response.on("error", () => {});
  await once(response, "data");
  const upgraded = connect(port, "127.0.0.1");
  t.after(() => upgraded.destroy());
  await once(upgraded, "connect");
  upgraded.write(
    "GET /hmr HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n",
  );
  await once(upgraded, "data");
  await within(close(), 250);
  assert.equal(nextClosed, true);
  assert.equal(server.listening, false);
});

test("returns the same cleanup promise when both termination signals arrive", async (t) => {
  let calls = 0;
  const { close } = await fixture(t, {
    close: async () => {
      calls += 1;
    },
  });
  const first = close();
  assert.equal(close(), first);
  await first;
  assert.equal(calls, 1);
});

test("preserves a Next cleanup failure", async (t) => {
  const { close } = await fixture(t, {
    close: async () => {
      throw new Error("cleanup failed");
    },
  });
  await assert.rejects(close(), /cleanup failed/);
});

test("bounds a stalled Next cleanup instead of hanging the test runner", async (t) => {
  const { close } = await fixture(
    t,
    { close: () => new Promise(() => {}) },
    { timeoutMs: 25 },
  );
  await assert.rejects(close(), /Test server shutdown timed out/);
});
