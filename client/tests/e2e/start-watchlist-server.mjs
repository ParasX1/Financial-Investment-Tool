import { createServer } from "node:http";
import next from "next";

const hostname = "127.0.0.1";
const port = 3000;
process.env.NEXT_PUBLIC_SUPABASE_URL ??=
  "https://watchlist-e2e.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "watchlist-e2e-anon-key";
const app = next({ dev: true, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((request, response) => {
  void handle(request, response);
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, hostname, resolve);
});

let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await new Promise((resolve) => server.close(resolve));
  await app.close();
}

process.once("SIGINT", () => {
  void close().finally(() => process.exit(0));
});
process.once("SIGTERM", () => {
  void close().finally(() => process.exit(0));
});
