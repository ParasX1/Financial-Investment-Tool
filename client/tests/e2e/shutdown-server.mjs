/** Close a disposable test server, including HMR's upgraded sockets. */
export function createTestServerShutdown(
  server,
  app,
  { timeoutMs = 5_000 } = {},
) {
  const sockets = new Set();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  let closing;
  return () => {
    if (closing) return closing;
    let timer;
    const serverClosed = new Promise((resolve, reject) => {
      // Stop accepting connections before destroying those already accepted.
      server.close((error) => (error ? reject(error) : resolve()));
    });
    // Node's closeAllConnections excludes upgraded WebSocket connections.
    for (const socket of sockets) socket.destroy();
    closing = Promise.race([
      Promise.all([serverClosed, Promise.resolve().then(() => app.close())]),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Test server shutdown timed out")),
          timeoutMs,
        );
      }),
    ]).finally(() => clearTimeout(timer));
    return closing;
  };
}
