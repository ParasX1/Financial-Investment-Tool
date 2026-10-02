import { createServer } from "node:http";
import next from "next";
import { createTestServerShutdown } from "./shutdown-server.mjs";

const hostname = "127.0.0.1";
const port = 3000;
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://watchlist-e2e.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "watchlist-e2e-anon-key";
const app = next({ dev: true, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((request, response) => {
  void handle(request, response);
});
const close = createTestServerShutdown(server, app);

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, hostname, resolve);
});

function terminate() {
  void close().then(
    () => process.exit(0),
    (error) => {
      console.error("Playwright server cleanup failed:", error.message);
      process.exit(1);
    },
  );
}

process.once("SIGINT", terminate);
process.once("SIGTERM", terminate);
