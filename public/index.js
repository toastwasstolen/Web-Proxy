const form = document.querySelector("#address-form");
const address = document.querySelector("#address");
const subjectPicker = document.querySelector("#subject-picker");
const browserScreen = document.querySelector("#browser");
const tabsElement = document.querySelector("#tabs");
const pagesElement = document.querySelector("#pages");
const newTabButton = document.querySelector("#new-tab");
const removeAllTabsButton = document.querySelector("#remove-all-tabs");
const subjectsButton = document.querySelector("#subjects-button");
const gamesButton = document.querySelector("#games-subject");
const browserButton = document.querySelector("#browser-subject");
const panicButton = document.querySelector("#panic-button");
const panicSettingsButton = document.querySelector("#panic-settings");
const panicDialog = document.querySelector("#panic-dialog");
const panicKeyForm = document.querySelector("#panic-key-form");
const panicKeyInput = document.querySelector("#panic-key-input");
const panicKeySaveButton = document.querySelector("#panic-key-save");
const panicKeyCancelButton = document.querySelector("#panic-key-cancel");
const status = document.querySelector("#status");
const backButton = document.querySelector("#back");
const forwardButton = document.querySelector("#forward");
const reloadButton = document.querySelector("#reload");

let controller;
let controllerPromise;
let httpCachePlugin;
let blockedSitePlugin;
let tabs = [];
let activeTab = null;
let nextTabId = 1;
let nextPopupTabId = 1;
const observedDocuments = new WeakSet();
const blockedSiteHost = "profitableratecpmnetwork.com";
const panicKeyStorageKey = "web-proxy-panic-key";
let panicKeyBinding = loadPanicKeyBinding();
let pendingPanicKeyBinding = null;

function loadPanicKeyBinding() {
  try {
    const stored = localStorage.getItem(panicKeyStorageKey);
    if (!stored) return null;
    const binding = JSON.parse(stored);
    if (typeof binding.key !== "string" || !binding.key) return null;
    return {
      key: binding.key,
      ctrl: binding.ctrl === true,
      alt: binding.alt === true,
      shift: binding.shift === true,
      meta: binding.meta === true,
    };
  } catch (error) {
    console.warn("Could not load the Panic key binding:", error);
    return null;
  }
}

function formatPanicKeyBinding(binding) {
  return [
    binding.ctrl && "Ctrl",
    binding.alt && "Alt",
    binding.shift && "Shift",
    binding.meta && "Meta",
    binding.key.length === 1 ? binding.key.toUpperCase() : binding.key,
  ].filter(Boolean).join(" + ");
}

function isEditableTarget(target) {
  return target?.nodeType === 1
    && (target.matches("input, textarea, select") || target.isContentEditable);
}

function updatePanicKeyTitle() {
  panicSettingsButton.title = panicKeyBinding
    ? `Change Panic key binding (${formatPanicKeyBinding(panicKeyBinding)})`
    : "Choose a key bind";
}

function handlePanicShortcut(event) {
  if (!panicKeyBinding || event.repeat || isEditableTarget(event.target)) return false;
  const matches = event.key.toLowerCase() === panicKeyBinding.key.toLowerCase()
    && event.ctrlKey === panicKeyBinding.ctrl
    && event.altKey === panicKeyBinding.alt
    && event.shiftKey === panicKeyBinding.shift
    && event.metaKey === panicKeyBinding.meta;
  if (!matches) return false;

  event.preventDefault();
  event.stopPropagation();
  window.location.replace("https://classroom.google.com/");
  return true;
}

function getController() {
  if (!controllerPromise) {
    controllerPromise = initBootstrap()
      .then((initializedController) => {
        controller = initializedController;
        return controller;
      })
      .catch((error) => {
        controllerPromise = null;
        throw error;
      });
  }
  return controllerPromise;
}

function updateActiveTabUi() {
  for (const tab of tabs) {
    const selected = tab === activeTab;
    tab.element.classList.toggle("active", selected);
    tab.selectButton.setAttribute("aria-selected", String(selected));
    tab.frameElement.classList.toggle("active", selected);
  }
  const activeHostname = activeTab?.url ? new URL(activeTab.url).hostname : "";
  subjectsButton.textContent = activeHostname === "gn-math.dev"
    || activeHostname.endsWith(".gn-math.dev")
    ? "Browser"
    : "Games";
  address.value = activeTab?.url ?? "";
  status.textContent = activeTab?.status ?? "";
  backButton.disabled = !activeTab?.frame;
  forwardButton.disabled = !activeTab?.frame;
  reloadButton.disabled = !activeTab?.frame;
}

function updateTabTitle(tab) {
  let title = tab.url ? new URL(tab.url).hostname : "New tab";
  try {
    const pageTitle = tab.frameElement.contentDocument?.title.trim();
    if (pageTitle) title = pageTitle;
  } catch (error) {
    console.warn("Could not read proxied page title:", error);
  }
  tab.title = title;
  tab.selectButton.textContent = title;
  tab.selectButton.title = tab.url || "New tab";
}

function activateTab(tab) {
  activeTab = tab;
  updateActiveTabUi();
}

function createTab() {
  const element = document.createElement("div");
  element.className = "browser-tab";
  element.setAttribute("role", "presentation");
  const selectButton = document.createElement("button");
  selectButton.className = "tab-select";
  selectButton.type = "button";
  selectButton.setAttribute("role", "tab");
  selectButton.addEventListener("click", () => activateTab(tab));
  const closeButton = document.createElement("button");
  closeButton.className = "tab-close";
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Close tab");
  closeButton.addEventListener("click", () => closeTab(tab));
  element.append(selectButton, closeButton);

  const frameElement = document.createElement("iframe");
  frameElement.className = "tab-page";
  frameElement.title = "Proxied website";
  frameElement.referrerPolicy = "no-referrer";

  const tab = {
    element,
    selectButton,
    frameElement,
    frame: null,
    framePromise: null,
    url: "",
    title: "New tab",
    status: "Enter a website address or search term to get started.",
  };
  frameElement.addEventListener("load", () => {
    updateTabTitle(tab);
    if (tab === activeTab) updateActiveTabUi();
  });
  tabs.push(tab);
  tabsElement.append(element);
  pagesElement.append(frameElement);
  updateTabTitle(tab);
  activateTab(tab);
  address.focus();
  return tab;
}

function closeTab(tab) {
  const index = tabs.indexOf(tab);
  if (index < 0) return;
  if (tabs.length === 1) createTab();
  const activeIndex = tabs.indexOf(activeTab);
  tabs.splice(index, 1);
  tab.element.remove();
  tab.frameElement.remove();
  if (tab === activeTab) {
    activateTab(tabs[Math.min(index, tabs.length - 1)]);
  } else if (activeIndex > index) {
    updateActiveTabUi();
  }
}

function closeAllTabs() {
  for (const tab of tabs) {
    tab.element.remove();
    tab.frameElement.remove();
  }
  tabs = [];
  activeTab = null;
  createTab();
}

function showSubjectPicker() {
  subjectPicker.hidden = false;
  browserScreen.hidden = true;
}

function showBrowser() {
  subjectPicker.hidden = true;
  browserScreen.hidden = false;
}

function openGames() {
  showBrowser();
  const tab = activeTab ?? createTab();
  void navigate("https://gn-math.dev", tab);
}

function returnToBrowser() {
  showBrowser();
  const tab = activeTab ?? createTab();
  void navigate("https://www.google.com", tab);
}

function openBrowser(initialUrl = "https://www.google.com") {
  showBrowser();
  if (tabs.length === 0) {
    const tab = createTab();
    void navigate(initialUrl, tab);
  }
}

function openLinkInProxyTab(url) {
  const tab = createTab();
  void navigate(url, tab);
}

function observeTabDocument(tab) {
  try {
    const proxiedDocument = tab.frameElement.contentDocument;
    if (!proxiedDocument || observedDocuments.has(proxiedDocument)) return;
    observedDocuments.add(proxiedDocument);
    const proxiedWindow = proxiedDocument.defaultView;
    proxiedDocument.addEventListener("keydown", handlePanicShortcut);

    const handleNewTabLink = (event) => {
      const target = event.target;
      const ElementConstructor = proxiedWindow?.Element;
      if (!ElementConstructor || !(target instanceof ElementConstructor)) return;
      const link = target.closest("a[href], area[href]");
      if (!link || link.hasAttribute("download")) return;

      const targetName = link.target.toLowerCase();
      const opensNewTab = targetName && !["_self", "_parent", "_top"].includes(targetName)
        || event.type === "auxclick" && event.button === 1
        || event.type === "click" && (event.ctrlKey || event.metaKey || event.shiftKey);
      if (!opensNewTab) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      openLinkInProxyTab(link.href);
    };

    proxiedDocument.addEventListener("click", handleNewTabLink, true);
    proxiedDocument.addEventListener("auxclick", handleNewTabLink, true);
    proxiedDocument.addEventListener("submit", (event) => {
      const form = event.target;
      if (form?.tagName !== "FORM") return;

      const submitterTarget = event.submitter?.getAttribute("formtarget");
      const targetName = (submitterTarget || form.target).toLowerCase();
      if (!targetName || ["_self", "_parent", "_top"].includes(targetName)) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const popupTab = createTab();
      const frameName = `proxy-popup-${nextPopupTabId++}`;
      popupTab.frameElement.name = frameName;
      form.target = frameName;
      if (submitterTarget) event.submitter.setAttribute("formtarget", frameName);

      void getFrame(popupTab).then(() => {
        const submitterName = event.submitter?.name;
        let submitterValue;
        if (submitterName && !event.submitter.disabled) {
          submitterValue = proxiedDocument.createElement("input");
          submitterValue.type = "hidden";
          submitterValue.name = submitterName;
          submitterValue.value = event.submitter.value;
          form.append(submitterValue);
        }
        proxiedWindow.HTMLFormElement.prototype.submit.call(form);
        submitterValue?.remove();
      }).catch((error) => {
        popupTab.status = error instanceof Error ? error.message : String(error);
        if (popupTab === activeTab) updateActiveTabUi();
      });
    }, true);

    if (proxiedWindow) {
      proxiedWindow.open = (url, target) => {
        const targetName = String(target ?? "_blank").toLowerCase();
        if (["_self", "_top", "_parent"].includes(targetName)) {
          if (!url) return proxiedWindow;
          const destination = new URL(String(url), proxiedWindow.location.href);
          if (destination.protocol !== "http:" && destination.protocol !== "https:") return null;
          void navigate(destination.href, tab);
          return proxiedWindow;
        }

        const popupTab = createTab();
        popupTab.frameElement.name = `proxy-popup-${nextPopupTabId++}`;
        if (url) {
          void navigate(String(url), popupTab);
        } else {
          void getFrame(popupTab);
        }
        return popupTab.frameElement.contentWindow;
      };
    }
  } catch (error) {
    console.warn("Could not route new-tab links into the proxy:", error);
  }
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

function isBlockedSiteUrl(value) {
  const hostname = new URL(value).hostname;
  return hostname === blockedSiteHost || hostname.endsWith(`.${blockedSiteHost}`);
}

function createBlockedSitePlugin() {
  return new class extends $scramjetUtils.ManagedPlugin {
    constructor() {
      super("web-proxy-blocked-site", []);
    }

    install(frame) {
      super.install(frame);
      this.tap(frame.fetchHandler.hooks.fetch.request, (context, props) => {
        if (!isBlockedSiteUrl(context.parsed.url.href)) return;
        props.earlyResponse = window.$scramjet.BareResponse.fromNativeResponse(
          new Response(null, { status: 204 })
        );
      });
    }
  }();
}

async function getFrame(tab) {
  if (tab.frame) return tab.frame;
  if (!tab.framePromise) {
    tab.framePromise = (async () => {
      tab.status = "Starting the proxy...";
      controller = await getController();
      httpCachePlugin ??= new $scramjetUtils.HttpCachePlugin();
      blockedSitePlugin ??= createBlockedSitePlugin();
      tab.frame = controller.createFrame(tab.frameElement, {
        plugins: [blockedSitePlugin, httpCachePlugin],
      });
      tab.frameElement.addEventListener("load", () => observeTabDocument(tab));
      observeTabDocument(tab);
      return tab.frame;
    })().catch((error) => {
      tab.framePromise = null;
      throw error;
    });
  }
  if (tab === activeTab) updateActiveTabUi();
  return tab.framePromise;
}

async function navigate(value, tab = activeTab) {
  if (!tab) return;
  try {
    const url = resolveAddress(value);
    if (isBlockedSiteUrl(url)) {
      closeTab(tab);
      return;
    }
    tab.url = url;
    tab.status = "Loading...";
    updateTabTitle(tab);
    if (tab === activeTab) updateActiveTabUi();
    await (await getFrame(tab)).go(url);
    tab.status = url;
    updateTabTitle(tab);
  } catch (error) {
    tab.status = error instanceof Error ? error.message : String(error);
  }
  if (tab === activeTab) {
    updateActiveTabUi();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void navigate(address.value);
});

gamesButton.addEventListener("click", openGames);
browserButton.addEventListener("click", () => openBrowser());
panicButton.addEventListener("click", () => {
  window.location.replace("https://classroom.google.com/");
});
panicSettingsButton.addEventListener("click", () => {
  pendingPanicKeyBinding = null;
  panicKeyInput.value = panicKeyBinding ? formatPanicKeyBinding(panicKeyBinding) : "";
  panicKeySaveButton.disabled = true;
  panicDialog.showModal();
  panicKeyInput.focus();
});
panicKeyCancelButton.addEventListener("click", () => panicDialog.close());
panicDialog.addEventListener("cancel", () => {
  pendingPanicKeyBinding = null;
});
panicDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape" || ["Control", "Alt", "Shift", "Meta"].includes(event.key)) return;

  event.preventDefault();
  event.stopPropagation();
  pendingPanicKeyBinding = {
    key: event.key,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  };
  panicKeyInput.value = formatPanicKeyBinding(pendingPanicKeyBinding);
  panicKeySaveButton.disabled = false;
});
panicKeyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!pendingPanicKeyBinding) return;
  panicKeyBinding = pendingPanicKeyBinding;
  pendingPanicKeyBinding = null;
  try {
    localStorage.setItem(panicKeyStorageKey, JSON.stringify(panicKeyBinding));
  } catch (error) {
    console.warn("Could not save the Panic key binding:", error);
  }
  updatePanicKeyTitle();
  panicDialog.close();
});
subjectsButton.addEventListener("click", () => {
  if (subjectsButton.textContent === "Browser") {
    returnToBrowser();
  } else {
    openGames();
  }
});
backButton.addEventListener("click", () => activeTab?.frame?.back());
forwardButton.addEventListener("click", () => activeTab?.frame?.forward());
reloadButton.addEventListener("click", () => activeTab?.frame?.reload());
newTabButton.addEventListener("click", () => createTab());
removeAllTabsButton.addEventListener("click", closeAllTabs);
document.addEventListener("keydown", (event) => {
  if (handlePanicShortcut(event)) return;
  if (!(event.ctrlKey || event.metaKey)) return;

  if (event.key.toLowerCase() === "t") {
    event.preventDefault();
    showBrowser();
    createTab();
  } else if (event.key.toLowerCase() === "w") {
    event.preventDefault();
    if (activeTab) closeTab(activeTab);
  } else if (event.key === "Tab" && tabs.length > 1) {
    event.preventDefault();
    const currentIndex = tabs.indexOf(activeTab);
    const offset = event.shiftKey ? -1 : 1;
    activateTab(tabs[(currentIndex + offset + tabs.length) % tabs.length]);
  }
});

updatePanicKeyTitle();

if ("requestIdleCallback" in window) {
  window.requestIdleCallback(() => {
    void getController().catch((error) => {
      console.warn("Could not prepare the proxy while idle:", error);
    });
  }, { timeout: 2000 });
}

const initialUrl = new URL(window.location.href).searchParams.get("goto");
history.replaceState(null, "", window.location.pathname);
if (initialUrl) openBrowser(initialUrl);
