# Web-Proxy

A Scramjet-powered web proxy with a Node.js/Wisp server. The server uses
Scramjet's Epoxy transport by default.

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

The proxy uses a browser-side HTTP cache for fresh upstream responses, which can
speed up repeat visits to cacheable resources. First visits still depend on the
destination site's response time and the proxy server's network connection.
To use the Libcurl transport instead, set `TRANSPORT=libcurl` before starting
the server.

Navigation to `profitableratecpmnetwork.com` and requests to that domain from
proxied pages are blocked.

Links and scripts that request a new tab from a proxied page open in a tab
inside the proxy rather than a separate browser tab.

The Panic button replaces the current browser tab with Google Classroom; it
does not control other browser tabs. Use the arrow beside it to set an optional
keyboard shortcut; the shortcut is saved in the current browser.
