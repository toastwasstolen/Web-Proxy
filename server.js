import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { bootstrap } from "@mercuryworkshop/proxy-bootstrap";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3030);
const host = process.env.HOST ?? "127.0.0.1";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

const { routeRequest, routeUpgrade } = await bootstrap();
const app = express();

app.use((req, res, next) => {
  if (!routeRequest(req, res)) next();
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(root, "index.html"));
});

app.use(express.static(path.join(root, "public"), {
  dotfiles: "deny",
  fallthrough: true,
  index: false,
}));
app.use((_req, res) => {
  res.sendStatus(404);
});

const server = http.createServer(app);
server.on("upgrade", routeUpgrade);
server.listen(port, host, () => {
  console.log(`Scramjet proxy listening at http://${host}:${port}`);
});
