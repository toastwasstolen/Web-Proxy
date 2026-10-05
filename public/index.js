const form = document.querySelector("#address-form");
const address = document.querySelector("#address");
const frameElement = document.querySelector("#page");
const status = document.querySelector("#status");
const backButton = document.querySelector("#back");
const forwardButton = document.querySelector("#forward");
const reloadButton = document.querySelector("#reload");

let controller;
let frame;

function setNavigationEnabled(enabled) {
  backButton.disabled = !enabled;
  forwardButton.disabled = !enabled;
  reloadButton.disabled = !enabled;
}

function resolveAddress(value) {
  const input = value.trim();
  if (!input) throw new Error("Enter a URL or search term.");

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(input)
    ? input
    : /\s/.test(input) || !input.includes(".")
      ? `https://www.google.com/search?q=${encodeURIComponent(input)}`
      : `https://${input}`;

  const url = new URL(candidate);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS addresses are supported.");
  }
  return url.href;
}

async function getFrame() {
  if (frame) return frame;
  status.textContent = "Starting the proxy...";
  controller = await initBootstrap();
  frame = controller.createFrame(frameElement);
  setNavigationEnabled(true);
  return frame;
}

async function navigate(value) {
  try {
    const url = resolveAddress(value);
    address.value = url;
    status.textContent = "Loading...";
    await (await getFrame()).go(url);
    status.textContent = url;
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void navigate(address.value);
});

backButton.addEventListener("click", () => frame?.back());
forwardButton.addEventListener("click", () => frame?.forward());
reloadButton.addEventListener("click", () => frame?.reload());

const initialUrl = new URL(window.location.href).searchParams.get("goto");
if (initialUrl) {
  history.replaceState(null, "", window.location.pathname);
  void navigate(initialUrl);
}
