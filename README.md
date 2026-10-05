# Web-Proxy

A small Scramjet-powered web proxy with a Node.js/Wisp server.

## Run locally

Requirements: Node.js 20.11 or newer and npm.

```sh
npm install
npm start
```

Open `http://localhost:3030`. The first startup downloads the Scramjet browser
assets from npm, so the server needs internet access. To use another port, set
the `PORT` environment variable. The server listens on `127.0.0.1` by default;
set `HOST=0.0.0.0` only when your deployment requires external access.

Deploy behind HTTPS: Scramjet uses a service worker, which browsers only enable
on secure origins (localhost is allowed for local development). This app is an
open web proxy; add authentication and review the hosting provider's
acceptable-use rules before exposing it publicly.