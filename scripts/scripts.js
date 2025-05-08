import {
  sampleRUM,
  // buildBlock,
  getAllMetadata,
  getMetadata,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
  loadScript,
  toCamelCase,
  toClassName,
} from "./aem.js";

function initWebSDK(path, config) {
  // Preparing the alloy queue
  if (!window.alloy) {
    // eslint-disable-next-line no-underscore-dangle
    (window.__alloyNS ||= []).push("alloy");
    window.alloy = (...args) =>
      new Promise((resolve, reject) => {
        window.setTimeout(() => {
          window.alloy.q.push([resolve, reject, args]);
        });
      });
    window.alloy.q = [];
  }
  // Loading and configuring the websdk
  return new Promise((resolve) => {
    import(path)
      .then(() => window.alloy("configure", config))
      .then(resolve);
  });
}

function onDecoratedElement(fn) {
  // Apply propositions to all already decorated blocks/sections
  if (
    document.querySelector(
      '[data-block-status="loaded"],[data-section-status="loaded"]'
    )
  ) {
    fn();
  }

  const observer = new MutationObserver((mutations) => {
    if (
      mutations.some(
        (m) =>
          m.target.tagName === "BODY" ||
          m.target.dataset.sectionStatus === "loaded" ||
          m.target.dataset.blockStatus === "loaded"
      )
    ) {
      fn();
    }
  });
  // Watch sections and blocks being decorated async
  observer.observe(document.querySelector("main"), {
    subtree: true,
    attributes: true,
    attributeFilter: ["data-block-status", "data-section-status"],
  });
  // Watch anything else added to the body
  observer.observe(document.querySelector("body"), { childList: true });
}

function toCssSelector(selector) {
  return selector.replace(
    /(\.\S+)?:eq\((\d+)\)/g,
    (_, clss, i) => `:nth-child(${Number(i) + 1}${clss ? ` of ${clss})` : ""}`
  );
}

async function getElementForProposition(proposition) {
  const selector =
    proposition.data.prehidingSelector ||
    toCssSelector(proposition.data.selector);
  return document.querySelector(selector);
}

async function getAndApplyRenderDecisions() {
  // Get the decisions, but don't render them automatically
  // so we can hook up into the AEM EDS page load sequence
  const response = await window.alloy("sendEvent", { renderDecisions: false });
  const { propositions } = response;
  onDecoratedElement(async () => {
    await window.alloy("applyPropositions", { propositions });
    // keep track of propositions that were applied
    propositions.forEach((p) => {
      p.items = p.items.filter(
        (i) =>
          i.schema !== "https://ns.adobe.com/personalization/dom-action" ||
          !getElementForProposition(i)
      );
    });
  });

  // Reporting is deferred to avoid long tasks
  window.setTimeout(() => {
    // Report shown decisions
    window.alloy("sendEvent", {
      xdm: {
        eventType: "decisioning.propositionDisplay",
        _experience: {
          decisioning: { propositions },
        },
      },
    });
  });
}

let alloyLoadedPromise = initWebSDK("./alloy.js", {
  datastreamId: "c457a178-33a5-4eae-a834-aea7fb5fed6f",
  orgId: "021654A663AF3D5A0A495FD4@AdobeOrg",
});
if (getMetadata("target")) {
  alloyLoadedPromise.then(() => getAndApplyRenderDecisions());
}

const LCP_BLOCKS = []; // add your LCP blocks to the list
const AUDIENCES = {
  mobile: () => window.innerWidth < 600,
  desktop: () => window.innerWidth >= 600,
  // define your custom audiences here as needed
};

// Define an execution context
const pluginContext = {
  getAllMetadata,
  getMetadata,
  loadCSS,
  loadScript,
  sampleRUM,
  toCamelCase,
  toClassName,
};

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter(
        (attr) =>
          attr.startsWith("data-aue-") || attr.startsWith("data-richtext-")
      )
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS("${window.hlx.codeBasePath}/styles/fonts.css");
  try {
    if (!window.location.hostname.includes("localhost"))
      sessionStorage.setItem("fonts-loaded", "true");
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Auto Blocking failed", error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  // Add below snippet early in the eager phase
  if (
    getMetadata("experiment") ||
    Object.keys(getAllMetadata("campaign")).length ||
    Object.keys(getAllMetadata("audience")).length
  ) {
    // eslint-disable-next-line import/no-relative-packages
    const { loadEager: runEager } = await import(
      "../plugins/experimentation/src/index.js"
    );
    await runEager(document, { audiences: AUDIENCES }, pluginContext);
  }
  document.documentElement.lang = "en";
  decorateTemplateAndTheme();
  const main = doc.querySelector("main");
  if (main) {
    decorateMain(main);
    document.body.classList.add("appear");
    await waitForLCP(LCP_BLOCKS);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem("fonts-loaded")) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }

  if (main) {
    decorateMain(main);
    // wait for alloy to finish loading
    await alloyLoadedPromise;
    // show the LCP block in a dedicated frame to reduce TBT
    await new Promise((res) => {
      window.requestAnimationFrame(async () => {
        await waitForLCP(LCP_BLOCKS);
        res();
      });
    });
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector("main");
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector("header"));
  loadFooter(doc.querySelector("footer"));

  loadCSS("${window.hlx.codeBasePath}/styles/lazy-styles.css");
  loadFonts();

  sampleRUM("lazy");
  sampleRUM.observe(main.querySelectorAll("div[data-block-name]"));
  sampleRUM.observe(main.querySelectorAll("picture > img"));

  // Add below snippet at the end of the lazy phase
  if (
    getMetadata("experiment") ||
    Object.keys(getAllMetadata("campaign")).length ||
    Object.keys(getAllMetadata("audience")).length
  ) {
    // eslint-disable-next-line import/no-relative-packages
    const { loadLazy: runLazy } = await import(
      "../plugins/experimentation/src/index.js"
    );
    await runLazy(document, { audiences: AUDIENCES }, pluginContext);
  }
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import("./delayed.js"), 3000);
  // load anything that can be postponed to the latest here
  // import('./sidekick.js').then(({ initSidekick }) => initSidekick());
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
