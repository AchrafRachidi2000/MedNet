const $ = (selector, root = document) => root.querySelector(selector);
const escapeHtml = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const esc = escapeHtml;
const icons = {
  activity:
    '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 12 3 3 7-7"/>',
  decision: '<path d="m12 2 10 10-10 10L2 12z"/>',
  outcome: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  map: '<rect x="8" y="2" width="8" height="5" rx="1"/><rect x="1" y="17" width="8" height="5" rx="1"/><rect x="15" y="17" width="8" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/>',
  fields:
    '<path d="M4 5h16M4 12h16M4 19h16"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="19" r="2"/>',
  source: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  agent:
    '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
  human: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  sub_workflow:
    '<rect x="3" y="3" width="14" height="14" rx="2"/><path d="M8 17v4h13V8h-4M7 10h6m-3-3 3 3-3 3"/>',
  integration: '<path d="M8 3v5m8-5v5M5 8h14v3a7 7 0 0 1-14 0zM12 18v4"/>',
  input: '<path d="M14 3h7v18h-7M2 12h14m-5-5 5 5-5 5"/>',
  output: '<path d="M10 3H3v18h7m0-9h12m-5-5 5 5-5 5"/>',
  alert: '<path d="m12 3 10 18H2zM12 9v5m0 3v1"/>',
  book: '<path d="M12 5c-3-2-6-2-10-1v16c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1zm0 0v16"/>',
  link: '<path d="m9 15 6-6M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0) scale(.9)"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  expand: '<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>',
  shield:
    '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6z"/><path d="m8 12 3 3 5-6"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.code}</svg>`;
let catalog,
  technicalCatalog,
  technicalLayouts,
  businessCatalog,
  businessLayout,
  businessPhases,
  layouts,
  byId,
  selectedField = null;
const state = {
  view: "map",
  audience: "business",
  query: "",
  selected: null,
  inspectorExpanded: false,
  mobileControlsOpen: false,
  mapKeyOpen: false,
  inspectorWidth: 560,
  tab: "overview",
  prompt: "system_prompt",
  promptFind: "",
  codeFind: "",
  edgeMode: "control",
  route: null,
  arrival: null,
  zoom: 0.75,
  camera: { x: 0, y: 0 },
  mapStage: "all",
  matchIndex: 0,
  history: [],
};
let toastTimer;
const PHONE_LAYOUT =
  "(max-width: 700px), (max-width: 1000px) and (max-height: 500px) and (orientation: landscape)";
function setMobileControls(open) {
  state.mobileControlsOpen = open;
  document.body.classList.toggle("mobile-controls-open", open);
  $(".mobile-controls-toggle")?.setAttribute("aria-expanded", String(open));
  if (!open && $("#map-controls")?.contains(document.activeElement))
    $(".mobile-controls-toggle")?.focus({ preventScroll: true });
}
let viewportSize = null;
function setMapKey(open, returnFocus = false) {
  state.mapKeyOpen = open;
  document.body.classList.toggle("map-key-open", open);
  $(".map-key-toggle")?.setAttribute("aria-expanded", String(open));
  if (open) {
    setMobileControls(false);
    $(".map-key-close")?.focus({ preventScroll: true });
  } else if (returnFocus) {
    const toggle = $(".map-key-toggle");
    (toggle?.getClientRects().length
      ? toggle
      : $(".mobile-controls-toggle")
    )?.focus({ preventScroll: true });
  }
}
document.addEventListener(
  "pointerdown",
  (event) => {
    if (
      state.mapKeyOpen &&
      !event.target.closest(".map-legend,.map-key-toggle")
    )
      setMapKey(false);
  },
  true,
);
try {
  const savedWidth = Number(localStorage.getItem("mednet-inspector-width"));
  if (savedWidth >= 420 && savedWidth <= 1000)
    state.inspectorWidth = savedWidth;
} catch {
  // Resizing still works when browser storage is unavailable.
}
document.documentElement.style.setProperty(
  "--inspector-width",
  `${state.inspectorWidth}px`,
);

function inspectorWidthLimits() {
  return { min: 420, max: Math.min(1000, window.innerWidth - 48) };
}
function syncInspectorResizeHandle() {
  const handle = $(".inspector-resize");
  if (!handle) return;
  const { min, max } = inspectorWidthLimits();
  const width = Math.round($("#inspector").getBoundingClientRect().width);
  handle.setAttribute("aria-valuemin", min);
  handle.setAttribute("aria-valuemax", max);
  handle.setAttribute("aria-valuenow", width);
  handle.setAttribute("aria-valuetext", `${width} pixels wide`);
}
function setInspectorWidth(width) {
  const { min, max } = inspectorWidthLimits();
  state.inspectorWidth = Math.round(Math.max(min, Math.min(max, width)));
  document.documentElement.style.setProperty(
    "--inspector-width",
    `${state.inspectorWidth}px`,
  );
  syncInspectorResizeHandle();
}
function saveInspectorWidth() {
  try {
    localStorage.setItem("mednet-inspector-width", state.inspectorWidth);
  } catch {
    // Keep the current width for this session without requiring storage.
  }
}
function initInspectorResize(host) {
  host.insertAdjacentHTML(
    "afterbegin",
    '<div class="inspector-resize" role="separator" tabindex="0" aria-label="Resize details panel" aria-orientation="vertical" aria-controls="inspector" title="Drag to resize · arrow keys adjust width · double-click to reset"></div>',
  );
  const handle = $(".inspector-resize", host);
  let drag = null;
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || state.inspectorExpanded) return;
    event.preventDefault();
    handle.focus({ preventScroll: true });
    drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      width: host.getBoundingClientRect().width,
    };
    handle.setPointerCapture(event.pointerId);
    document.body.classList.add("resizing-inspector");
  });
  handle.addEventListener("pointermove", (event) => {
    if (drag?.pointerId === event.pointerId)
      setInspectorWidth(drag.width + drag.x - event.clientX);
  });
  const finish = () => {
    if (!drag) return;
    drag = null;
    document.body.classList.remove("resizing-inspector");
    saveInspectorWidth();
  };
  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", finish);
  handle.addEventListener("lostpointercapture", finish);
  handle.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const { min, max } = inspectorWidthLimits();
    const delta = event.shiftKey ? 80 : 20;
    const width = host.getBoundingClientRect().width;
    setInspectorWidth(
      event.key === "Home"
        ? min
        : event.key === "End"
          ? max
          : width + (event.key === "ArrowLeft" ? delta : -delta),
    );
    saveInspectorWidth();
  });
  handle.addEventListener("dblclick", () => {
    setInspectorWidth(560);
    saveInspectorWidth();
  });
  syncInspectorResizeHandle();
}
window.addEventListener("resize", syncInspectorResizeHandle);
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 2800);
}
const nodeCode = (n) =>
  n.name === "Claim Submission"
    ? "START"
    : n.name.match(
        /^[A-Z]+(?:-[A-Z]+)?[- ]?\d+[A-Za-z]?(?:-[A-Z]+)?|^A-PROV|^A-SEL|^C-PROV|^C-OPR/,
      )?.[0] || n.name.split(" - ")[0];
const sorted = (nodes) => [...nodes].sort((a, b) => a.order - b.order);
const stageOf = (id) => catalog.stages.find((s) => s.id === id);
function badge(n) {
  return `<span class="badge type-${esc(n.type)}">${icon(n.type)}${esc(n.role)}</span>`;
}
function miniNode(id, label) {
  const n = byId.get(id);
  return n
    ? `<button class="node-link" data-select="${esc(id)}">${icon(n.type)}<span>${esc(label || n.name)}</span>${icon("arrow")}</button>`
    : `<span class="muted">Source unavailable: ${esc(id)}</span>`;
}
function highlight(text, q) {
  if (!q?.trim()) return esc(text);
  let result = "",
    rest = String(text),
    pos;
  while ((pos = rest.toLowerCase().indexOf(q.toLowerCase())) >= 0) {
    result +=
      esc(rest.slice(0, pos)) +
      "<mark>" +
      esc(rest.slice(pos, pos + q.length)) +
      "</mark>";
    rest = rest.slice(pos + q.length);
  }
  return result + esc(rest);
}

function audienceFromHash(hash) {
  return hash.get("audience") === "business"
    ? "business"
    : hash.get("audience") === "technical" ||
        hash.has("view") ||
        technicalCatalog.nodes.some((n) => n.id === hash.get("node"))
      ? "technical"
      : "business";
}
function activateAudience(audience) {
  setMapKey(false);
  state.arrival = null;
  state.audience = audience;
  catalog = audience === "business" ? businessCatalog : technicalCatalog;
  layouts =
    audience === "business"
      ? { control: businessLayout, phases: businessPhases }
      : technicalLayouts;
  state.edgeMode = "control";
  state.route = null;
  state.query = "";
  byId = new Map(catalog.nodes.map((n) => [n.id, n]));
}
function renderBusinessInspector(host, n) {
  const incoming = catalog.edges.filter((e) => e.target === n.id),
    outgoing = catalog.edges.filter((e) => e.source === n.id);
  host.innerHTML = `<div class="inspector-top"><span class="eyebrow">BUSINESS STEP</span><div><button class="button inspector-expand" data-action="expand-inspector" aria-pressed="${state.inspectorExpanded}" aria-label="${state.inspectorExpanded ? "Restore inspector size" : "Expand node inspector"}">${icon("expand")}<span>${state.inspectorExpanded ? "Restore" : "Expand"}</span></button><button class="icon-button" data-action="close-inspector" aria-label="Close node inspector">${icon("close")}</button></div></div><div class="inspector-title"><div class="inspector-label">${badge(n)}</div><h2>${esc(n.title)}</h2><p>${esc(stageOf(n.stage).name)}</p></div><div class="inspector-content">${renderBusinessExplanation(n)}<section class="detail-section"><h3>Before this step</h3>${incoming.length ? [...new Set(incoming.map((e) => e.source))].map((id) => miniNode(id)).join("") : "<p>This is where the claim process begins.</p>"}</section><section class="detail-section"><h3>What happens next</h3>${outgoing.length ? outgoing.map((e) => `<div class="route-link"><span>${esc(e.label)}</span>${miniNode(e.target)}</div>`).join("") : "<p>The processing outcome is returned. This is not final payment approval.</p>"}</section><div class="footnote">Business-level interpretation of the documented process. This map describes possible paths, not a live claim.</div></div>`;
}

function explainFacts(title, entries) {
  return `<section class="detail-section reader-facts"><h3>${esc(title)}</h3><dl>${entries.map(([label, detail]) => `<div><dt>${esc(label)}</dt><dd>${readableDetail(detail)}</dd></div>`).join("")}</dl></section>`;
}
function detailSentences(text) {
  // Separate complete sentences only: never split identifiers, numeric lists,
  // field names, or comma-separated rule conditions heuristically.
  return String(text).split(/(?<=[.!?])\s+(?=[A-Z])/);
}
function readableDetail(text) {
  const parts = detailSentences(text);
  return parts.length > 1
    ? `<ul class="detail-bullets">${parts.map((part) => `<li>${esc(part)}</li>`).join(" ")}</ul>`
    : esc(text);
}
function explainList(title, items, ordered = false) {
  const tag = ordered ? "ol" : "ul";
  return `<section class="detail-section reader-list"><h3>${esc(title)}</h3><${tag}${ordered ? ' class="numbered-actions"' : ""}>${items
    .map((item) => {
      if (!ordered) return `<li>${esc(item)}</li>`;
      const parts = typeof item === "string" ? detailSentences(item) : null;
      const action = parts ? { title: parts[0], items: parts.slice(1) } : item;
      return `<li><div class="action-title">${esc(action.title)}</div> ${action.items?.length ? `<ul class="action-bullets">${action.items.map((detail) => `<li>${esc(detail)}</li>`).join(" ")}</ul>` : ""}${action.note ? `<p class="action-note">${esc(action.note)}</p>` : ""}</li>`;
    })
    .join(" ")}</${tag}></section>`;
}
function renderBusinessExplanation(n) {
  const d = n.businessDetails;
  return `<section class="explanation"><span class="section-label">WHAT HAPPENS</span><p>${esc(d.purpose)}</p></section>
    ${explainFacts("What comes in", d.inputs)}
    ${explainList("What gets checked or done", d.checks, true)}
    ${explainFacts("What comes out", d.outputs)}
    ${explainList("How the next path is decided", d.outcomes)}
    ${explainList("Important distinctions", d.caveats)}`;
}
function sourceSection(n, key, title) {
  const open = state.tab === key;
  const renderer = { prompts, logic, config, evidence }[key];
  return `<details class="reader-source" data-detail-section="${key}" ${open ? "open" : ""}><summary>${esc(title)}</summary><div id="source-${key}">${open ? renderer(n) : ""}</div></details>`;
}
function technicalExplanation(n) {
  const d = n.explanation;
  const external = d.external;
  const next = catalog.edges.filter((e) => e.source === n.id);
  return `<section class="explanation"><span class="section-label">WHAT THIS NODE DOES</span><p>${esc(n.summary)}</p></section>
    ${explainList("What gets checked or done", d.actions, true)}
    ${
      external
        ? `<section class="detail-section external-service"><span class="section-label">EXTERNAL SERVICE / CONNECTED WORKFLOW</span><h3>${esc(external.service)}</h3><p>${esc(external.purpose)}</p>${explainFacts(
            "Information exchanged",
            [
              ["Sent to the service", external.sends],
              ["Returned by the service", external.returns],
            ],
          )}<p class="muted">Describes the supplied workflow. This viewer makes no external calls.</p></section>`
        : `<p class="reader-local">${n.type === "agent" ? "Prompt-driven AI processing; no separate business-system API call is shown for this node." : n.type === "human" ? "A human-review task, not an automatic insurance decision." : "No external service call is shown in this node's supplied definition."}</p>`
    }
    ${d.caveats.length ? explainList("Important limitations", d.caveats) : ""}
    <section data-reader-section="fields"><h3>Information in and out</h3>${nodeFields(n)}</section>
    <section class="detail-section"><h3>Where the result goes</h3>${next.length ? next.map((e) => `<div class="route-link"><span>${esc(e.label)}</span>${miniNode(e.target)}</div>`).join("") : "<p>This is the workflow output; no next node is declared.</p>"}</section>
    <div class="reader-evidence"><h3>Original definitions, if needed</h3><p class="muted">Optional evidence on this same page. Configured values are not live claim values.</p>
    ${n.type === "agent" || n.type === "human" ? sourceSection(n, "prompts", n.type === "human" ? "Original review instructions" : "Original prompts") : ""}
    ${sourceSection(n, "logic", n.missingInternal ? "Connected workflow boundary" : "Original logic")}
    ${sourceSection(n, "config", "Execution settings")}
    ${sourceSection(n, "evidence", "Source evidence")}
    </div>`;
}
function initSourceSections(n) {
  document
    .querySelectorAll("#inspector [data-detail-section]")
    .forEach((section) => {
      section.addEventListener("toggle", () => {
        if (!section.open) return;
        const key = section.dataset.detailSection;
        const body = section.querySelector("#source-" + key);
        if (!body.innerHTML)
          body.innerHTML = { prompts, logic, config, evidence }[key](n);
        state.tab = key;
        updateHash();
      });
    });
}

function shell() {
  $("#app").innerHTML =
    `<div class="application"><header class="topbar"><h1 class="mobile-map-title" id="mobile-map-title"></h1><div class="topbar-right"><button class="icon-button mobile-controls-toggle" data-action="mobile-controls" aria-label="Map controls" aria-controls="map-controls" aria-expanded="false">${icon("fields")}</button><button class="text-button map-help-button" data-action="map-help" aria-label="How to read this map">${icon("book")}<span>How to read this map</span></button></div></header><div class="body-grid"><main id="main"></main><aside id="inspector" aria-label="Node inspector"></aside></div></div><div id="dialog-root"></div>`;
  render();
}
function render() {
  document.body.classList.add("map-mode");
  $(".body-grid").classList.toggle("has-inspector", !!state.selected);
  renderMain();
  renderInspector();
}
function renderMain() {
  if (state.view === "map") {
    $("#main").innerHTML =
      `<header class="map-heading" id="map-controls"><button class="icon-button mobile-controls-close" data-action="mobile-controls" aria-label="Close map controls">${icon("close")}</button><div><h1>${state.mapStage !== "all" ? esc(stageOf(state.mapStage).name) : state.audience === "business" ? "Business workflow" : "Claim workflow"}</h1><span>${currentDiagram().nodes.filter((n) => !n.isBoundary).length} ${state.audience === "business" ? "business steps" : "nodes"} <i>·</i> ${currentDiagram().edges.length} paths <i>·</i> UC1</span></div><div class="segmented audience-toggle" role="group" aria-label="Map view"><button data-audience="business" class="${state.audience === "business" ? "active" : ""}" aria-pressed="${state.audience === "business"}">Business map</button><button data-audience="technical" class="${state.audience === "technical" ? "active" : ""}" aria-pressed="${state.audience === "technical"}">Technical map</button></div><label class="search-box map-search">${icon("search")}<input id="search" aria-label="${state.audience === "business" ? "Search business steps" : "Search nodes prompts fields or code"}" placeholder="${state.audience === "business" ? "Find a business step…" : "Find a node, field or prompt…"}" value="${esc(state.query)}"><kbd>/</kbd></label><select id="edge-mode" aria-label="Connection type" ${state.audience === "business" ? "hidden" : ""}><option value="control">Process flow</option><option value="data" ${state.edgeMode === "data" ? "selected" : ""}>Data mappings</option></select><div class="map-heading-tools"><button class="button fullscreen-button" data-action="fullscreen" aria-label="Toggle fullscreen map">${icon("expand")}<span>Fullscreen</span></button><button class="button map-key-toggle" data-action="map-key" aria-label="Map key and context" aria-controls="map-key" aria-expanded="${state.mapKeyOpen}" title="Map key & context">${icon("grid")}<span>Map key</span></button><button class="icon-button desktop-help" data-action="map-help" aria-label="How to read this map" title="How to read this map">${icon("book")}</button><button class="icon-button desktop-glossary" data-action="glossary" aria-label="Open terminology guide" title="Terminology guide">${icon("source")}</button></div><div class="mobile-map-guidance"><span>Drag to explore · pinch to zoom<br>Turn your phone sideways for a wider view.</span><button class="text-button" data-action="glossary">Terminology guide</button></div></header><nav class="map-stages" aria-label="Workflow phase views"><button class="${state.mapStage === "all" ? "active" : ""}" data-map-stage="all">${icon("map")}Entire flow</button>${catalog.stages.map((s) => `<button class="stage-${s.id} ${state.mapStage === s.id ? "active" : ""}" data-map-stage="${s.id}" title="Open ${esc(s.name)} workflow"><span>${String(s.number).padStart(2, "0")}</span>${esc(s.name)}</button>`).join("")}</nav><div id="results" class="map-results">${renderMap()}</div>`;
    $("#mobile-map-title").textContent =
      state.mapStage !== "all"
        ? stageOf(state.mapStage).name
        : state.audience === "business"
          ? "Business workflow"
          : "Claim workflow";
    initMapPan();
    revealActivePhase();
    return;
  }
}
function revealActivePhase() {
  const nav = $(".map-stages"),
    active = $(".map-stages .active");
  if (!nav || !active) return;
  const frame = nav.getBoundingClientRect(),
    tab = active.getBoundingClientRect();
  if (tab.left < frame.left || tab.right > frame.right)
    nav.scrollLeft += tab.left - frame.left - (frame.width - tab.width) / 2;
}
function renderInspector() {
  const host = $("#inspector"),
    n = byId.get(state.selected);
  host.hidden = !n;
  $(".body-grid").classList.toggle(
    "inspector-expanded",
    !!n && state.inspectorExpanded,
  );
  if (host.hidden) return;
  host.setAttribute(
    "aria-label",
    state.audience === "business" ? "Business step details" : "Node inspector",
  );
  if (state.audience === "business") {
    renderBusinessInspector(host, n);
    initInspectorResize(host);
    return;
  }
  host.innerHTML = `<div class="inspector-top"><span class="eyebrow">NODE INSPECTOR</span><div>${state.history.length ? `<button class="icon-button" data-action="back" aria-label="Previous inspected node">${icon("back")}</button>` : ""}<button class="button inspector-expand" data-action="expand-inspector" aria-pressed="${state.inspectorExpanded}" aria-label="${state.inspectorExpanded ? "Restore inspector size" : "Expand node inspector"}">${icon("expand")}<span>${state.inspectorExpanded ? "Restore" : "Expand"}</span></button><button class="icon-button" data-action="copy-link" aria-label="Copy link to this node">${icon("link")}</button><button class="icon-button" data-action="close-inspector" aria-label="Close node inspector">${icon("close")}</button></div></div><div class="inspector-title"><div class="inspector-label"><span class="node-code">${esc(nodeCode(n))}</span>${badge(n)}</div><h2>${esc(n.title)}</h2><div class="source-name">${esc(n.name)}</div><p>${esc(stageOf(n.stage)?.name || "Unassigned")}</p></div><div class="inspector-content" aria-label="Node explanation">${technicalExplanation(n)}</div>`;
  initSourceSections(n);
  initInspectorResize(host);
}
function fieldTree(fields, n, direction) {
  return fields
    .map(
      (f) =>
        `<div class="field-tree-row depth-${Math.min(f.depth, 3)}"><button class="field-open" data-field-node="${n.id}" data-field-path="${esc(f.path)}" data-direction="${direction}"><span><strong>${esc(f.name)}</strong><code>${esc(f.path)}</code></span><span class="field-type">${esc(f.types.join(" | "))}${icon("chevron")}</span></button>${f.description ? `<p>${esc(f.description)}</p>` : ""}${f.children.length ? `<details><summary>${f.children.length} nested declarations</summary>${fieldTree(f.children, n, direction)}</details>` : ""}</div>`,
    )
    .join("");
}
function nodeFields(n) {
  return `<div class="notice compact">${icon("fields")}<p>Declared contract, not live values. Select a field to inspect its source and consumers. Nested definitions are expandable.</p></div>${["inputs", "outputs"].map((direction) => `<section class="detail-section"><div class="section-heading"><h3>${direction === "inputs" ? "Inputs" : "Outputs"}</h3><span>${n[direction].length}</span></div>${fieldTree(n[direction], n, direction) || '<p class="muted">No fields declared.</p>'}</section>`).join("")}<div class="footnote">Nullability and nested-shape enforcement come from the export. They do not prove that a value is populated during execution.</div>`;
}
function prompts(n) {
  if (n.type === "human")
    return `<div class="section-heading"><h3>Original review instructions</h3><button class="icon-button" data-copy="instructions" aria-label="Copy review instructions">${icon("copy")}</button></div><pre class="source-text">${esc(n.process.instructions || "No instructions supplied.")}</pre>`;
  const key = state.prompt,
    text = n.process[key] || "",
    vars = n.promptVariables;
  return `<div class="model-info"><div><span>Configured model</span><strong>${esc(n.process.model || "Not declared")}</strong></div><div><span>Fallback</span><strong>${esc(n.process.backup_model || "Not declared")}</strong></div></div><div class="notice compact warning">${icon("alert")}<p>Original supplied instructions, including later override sections. This is a template, not the populated prompt from a run. Internal case examples may appear.</p></div><div class="segmented"><button data-prompt="system_prompt" class="${key === "system_prompt" ? "active" : ""}">System prompt</button><button data-prompt="user_prompt" class="${key === "user_prompt" ? "active" : ""}">User template</button></div><div class="source-toolbar"><label class="search-box small">${icon("search")}<input id="prompt-find" aria-label="Find in prompt" placeholder="Find in this prompt…" value="${esc(state.promptFind)}"></label><button class="icon-button" data-copy="${key}" aria-label="Copy prompt">${icon("copy")}</button></div><div class="source-meta">${text.length.toLocaleString()} characters · ${text.split("\n").length} lines <span>Source text${text.includes("[REDACTED") ? " · credential redactions" : ""}</span></div><div id="prompt-content">${sourceLines(text, state.promptFind)}</div>${
    vars.length
      ? `<section class="detail-section"><h3>Template variables</h3><p class="muted">Matched by declared key or display name where possible. Unresolved names require platform verification.</p><div class="variables">${vars
          .map((v) => {
            const f = n.inputs.find(
              (f) =>
                f.key === v ||
                f.name.toLowerCase().replaceAll(" ", "_") === v.toLowerCase(),
            );
            return f
              ? `<button data-field-node="${n.id}" data-field-path="${esc(f.path)}" data-direction="inputs">{{${esc(v)}}} ${icon("arrow")}</button>`
              : `<span class="unresolved-variable">{{${esc(v)}}}<small>not resolved to a declared input</small></span>`;
          })
          .join("")}</div></section>`
      : ""
  }`;
}
function sourceLines(text, q = "") {
  const lines = String(text).split("\n"),
    matches = q
      ? lines
          .map((line, i) =>
            line.toLowerCase().includes(q.toLowerCase()) ? i : -1,
          )
          .filter((i) => i >= 0)
      : [];
  return `${q ? `<div class="find-count">${matches.length} matching lines ${matches.length ? '<button class="text-button" data-action="jump-match">Jump to first</button>' : ""}</div>` : ""}<div class="code-lines">${lines.map((line, i) => `<div class="source-line ${q && line.toLowerCase().includes(q.toLowerCase()) ? "line-match" : ""}" id="source-line-${i + 1}"><span class="line-number">${i + 1}</span><code>${highlight(line, q) || " "}</code></div>`).join("")}</div>`;
}
function logic(n) {
  if (n.missingInternal)
    return `<div class="notice warning">${icon("sub_workflow")}<div><strong>This call is a boundary, not an embedded workflow.</strong><p>No internal code or prompts are included. The inspector does not invent them.</p></div></div>${referenceIds(n)}<h3>Other calls to this workflow</h3>${
      catalog.nodes
        .filter((other) => other.id !== n.id && other.handlerId === n.handlerId)
        .map((other) => miniNode(other.id))
        .join("") || '<p class="muted">No other call site in this export.</p>'
    }`;
  if (!n.process.code)
    return `<div class="explanation"><h3>${n.type === "agent" ? "Prompt-driven processing" : n.type === "integration" ? "Integration definition" : "Exported process definition"}</h3><p>${n.type === "agent" ? "This node is governed by its prompt templates. Expand Original prompts on this page, then follow its outputs to downstream rules." : "The process configuration is shown below. This viewer never executes it."}</p></div><pre class="source-text">${esc(JSON.stringify(n.process, null, 2))}</pre>`;
  return `<div class="notice compact">${icon("code")}<p>Read-only source code. Comments can describe older behavior; inspect the implementation. No code is executed in this inspector.</p></div><details class="symbol-list"><summary>${n.symbols.length} functions and classes</summary>${n.symbols.map((s) => `<button data-line="${s.line}"><span>L${s.line}</span><code>${esc(s.text)}</code></button>`).join("")}</details><div class="source-toolbar"><label class="search-box small">${icon("search")}<input id="code-find" aria-label="Find in code" placeholder="Find a rule, field or error code…" value="${esc(state.codeFind)}"></label><button class="icon-button" data-copy="code" aria-label="Copy code">${icon("copy")}</button></div><div class="source-meta">${n.process.code.split("\n").length.toLocaleString()} lines <span>Source text${n.process.code.includes("[REDACTED") ? " · credential redactions" : ""}</span></div><div id="code-content">${sourceLines(n.process.code, state.codeFind)}</div>`;
}
function routes(n) {
  const ins = catalog.edges.filter((e) => e.target === n.id),
    outs = catalog.edges.filter((e) => e.source === n.id),
    maps = catalog.mappings.filter((m) => m.target === n.id);
  return `<div class="notice compact">${icon("map")}<p>Control connections describe where processing can go. Field mappings describe where data comes from, for both inputs and mapped outputs. They are different graphs.</p></div><section class="detail-section"><h3>Incoming control connections · ${ins.length}</h3>${ins.map((e) => `<div class="route-card">${miniNode(e.source)}<div><span class="tag">${esc(e.label)}</span><span class="muted">${esc(e.type)} connection</span></div></div>`).join("") || '<p class="muted">None declared.</p>'}</section><section class="detail-section"><h3>Outgoing control connections · ${outs.length}</h3>${outs.map((e) => `<div class="route-card"><span class="route-condition">${esc(e.label)}</span>${miniNode(e.target)}<small>${esc(e.type)} · ${esc(e.sourcePointer)}</small></div>`).join("") || '<p class="muted">None declared.</p>'}</section><details class="detail-section"><summary>All declared routes (including unconnected routes)</summary><pre class="source-text">${esc(JSON.stringify(n.routes, null, 2))}</pre></details><section class="detail-section"><h3>Field mappings · ${maps.length}</h3>${maps.map((m) => `<div class="mapping-card"><div><code>${esc(m.input)}</code><span class="tag">${m.targetDirection} · ${m.kind}</span></div>${miniNode(m.source)}<code>${esc(m.origin)}.${esc(m.path)}</code>${!m.declared || !m.sourceDeclared ? '<small class="warning-text">Static contract mismatch · verify in source</small>' : ""}</div>`).join("") || '<p class="muted">No field mappings declared. Inspect configured values and the entry contract.</p>'}</section>`;
}
function config(n) {
  return `<div class="notice compact">${icon("shield")}<p>Configuration, not actual run behavior. Credentials and unreviewed sample/default values are withheld.</p></div><section class="detail-section"><h3>Execution settings</h3><div class="setting-grid"><div><span>Timeout</span><b>${esc(n.settings.timeout ?? "Not declared")} ${esc(n.settings.timeout_unit || "")}</b></div><div><span>SLA (raw setting)</span><b>${esc(n.settings.sla ?? "Not declared")}</b></div><div><span>Max retries</span><b>${esc(n.settings.retry_config?.max_retries ?? "Not declared")}</b></div><div><span>Backoff</span><b>${esc(n.settings.retry_config?.backoff_strategy || "Not declared")}</b></div></div><details><summary>All execution settings</summary><pre class="source-text">${esc(JSON.stringify(n.settings, null, 2))}</pre></details></section><section class="detail-section"><h3>Configured field values · ${n.configuration.length}</h3>${n.configuration.map((c) => `<details class="config-entry"><summary><span>${esc(c.name)}<small>${esc(c.direction)} · ${esc(c.key)}</small></span><span class="tag ${c.withheld ? "withheld" : ""}">${c.withheld ? "Withheld" : "Reference / control"}</span></summary>${c.withheld ? `<p class="muted">${esc(c.reason)}</p>` : `<pre class="source-text">${esc(typeof c.value === "string" ? c.value : JSON.stringify(c.value, null, 2))}</pre>`}</details>`).join("") || '<p class="muted">No set-value entries declared.</p>'}</section>${referenceIds(n)}`;
}
function referenceIds(n) {
  return `<section class="detail-section"><h3>Definition identifiers</h3><dl class="identifier-list"><dt>Node ID</dt><dd>${esc(n.id)}</dd><dt>Handler ID</dt><dd>${esc(n.handlerId || "Not declared")}</dd><dt>Handler version</dt><dd>${esc(n.handlerVersion || "Not declared")}</dd><dt>Source locator</dt><dd>${esc(n.sourcePointer)}</dd></dl></section>`;
}
function evidence(n) {
  const issues = catalog.issues.filter((i) => i.node === n.id),
    fs = catalog.findings.filter((f) =>
      f.nodes.some((p) => n.name.startsWith(p)),
    );
  return `<div class="evidence-key"><span class="tag">Exported definition</span><p>Fields, mappings, prompts, code and settings are drawn from the JSON export.</p><span class="tag">Editorial explanation</span><p>Plain-language summaries and stage groupings are interpretations of the supplied material, not additional execution rules.</p></div>${referenceIds(n)}${issues.map((issue) => `<div class="finding-card"><span class="eyebrow">STATIC CONSISTENCY CHECK</span><h3>${esc(issue.title)}</h3><p>${esc(issue.detail)}</p><code>${esc(issue.pointer)}</code></div>`).join("")}${fs.map((f) => `<div class="finding-card"><span class="eyebrow">SOURCE REVIEW</span><h3>${esc(f.title)}</h3><p>${esc(f.detail)}</p><small>${esc(f.evidence)}</small></div>`).join("")}<button class="button full" data-action="map-help">${icon("book")}How to interpret this map</button>`;
}

function openField(nodeId, path, direction) {
  selectedField = { nodeId, path, direction };
  const n = byId.get(nodeId),
    f = catalog.allFields.find(
      (f) =>
        f.nodeId === nodeId && f.direction === direction && f.path === path,
    );
  if (!f) return;
  const root = path.split(/[.\[]/)[0];
  const producers = catalog.mappings.filter(
    (m) =>
      m.target === nodeId &&
      m.input === root &&
      m.targetDirection === direction,
  );
  const consumers = catalog.mappings.filter(
    (m) =>
      m.source === nodeId &&
      m.origin === (direction === "inputs" ? "input" : "output") &&
      (m.path === path ||
        m.path?.startsWith(path + ".") ||
        m.path?.startsWith(path + "[") ||
        path.startsWith(m.path + ".") ||
        path.startsWith(m.path + "[")),
  );
  const configured = n.configuration.filter(
    (c) =>
      c.direction === (direction === "inputs" ? "input" : "output") &&
      c.key === root,
  );
  showDialog(
    `<div class="dialog-eyebrow">FIELD INSPECTOR <span class="tag">Declared schema</span></div><h2>${esc(f.name)}</h2><code class="field-path">${esc(path)}</code><p>${esc(f.description || "No field description is supplied in the export.")}</p><div class="setting-grid"><div><span>Direction</span><b>${direction === "inputs" ? "Input" : "Output"}</b></div><div><span>Accepted types</span><b>${esc(f.types.join(" | "))}</b></div><div><span>Nullability</span><b>${f.nullable === null ? "Not declared" : f.nullable ? "Null allowed" : "Null not allowed"}</b></div><div><span>Schema default</span><b>${f.hasDefault ? "Present · value withheld" : "Not supplied"}</b></div></div><h3>Declared by</h3>${miniNode(nodeId)}<h3>Where it comes from</h3>${direction === "outputs" ? `<p>Declared output of ${esc(n.name)}. Inspect its prompt or implementation to understand how it is produced.</p>` : producers.length ? producers.map((m) => `<div class="mapping-card"><span class="tag">${m.kind} mapping ${path !== root ? "· inherited from parent object" : ""}</span>${miniNode(m.source)}<button class="text-button mono" data-trace-source="${m.id}">${esc(m.origin)}.${esc(m.path)} ${icon("arrow")}</button>${!m.sourceDeclared ? '<p class="warning-text">Source output is not in the declared schema.</p>' : ""}</div>`).join("") : configured.length ? "<p>This input has a configured set-value entry. See the Settings tab for permitted reference/control values.</p>" : '<p class="muted">No explicit source mapping or set-value entry is declared here. The contract alone does not establish a runtime value.</p>'}<h3>Where it is used</h3>${consumers.length ? consumers.map((m) => `<div class="mapping-card">${miniNode(m.target)}<button class="text-button mono" data-trace-target="${m.id}">${esc(m.input)} ${icon("arrow")}</button><span class="tag">${m.kind}</span></div>`).join("") : '<p class="muted">No explicit downstream field mapping found. Code or prompts may still reference this field; this is not proof that it is unused.</p>'}<div class="notice compact">${icon("link")}<p>Tracing follows exported mappings, including alternatives and parent-object mappings. It does not infer arbitrary code transformations or represent actual run values.</p></div><button class="button" data-field-logic="${nodeId}">${icon("code")}Inspect how this node processes data</button>`,
    "field-dialog",
  );
  if (direction === "outputs" && producers.length)
    $(".field-dialog").insertAdjacentHTML(
      "beforeend",
      `<section class="detail-section"><h3>Configured output mappings</h3><p class="muted">This output has mapped sources in addition to its handler definition. The output-value prioritization in Settings determines how these sources are used.</p>${producers.map((m) => `<div class="mapping-card"><span class="tag">${m.kind} output mapping</span>${miniNode(m.source)}<button class="text-button mono" data-trace-source="${m.id}">${esc(m.origin)}.${esc(m.path)} ${icon("arrow")}</button></div>`).join("")}</section>`,
    );
  const locate = (list) =>
    list.find((item) => item.path === path) ||
    list
      .flatMap((item) => item.children)
      .map((item) => locate([item]))
      .find(Boolean);
  const declared = locate(n[direction]);
  if (declared)
    $(".field-dialog").insertAdjacentHTML(
      "beforeend",
      `<details class="detail-section"><summary>Inspect the full exported field definition</summary><p class="muted">Includes nested type definitions, options and enforcement flags. Default values are withheld.</p><pre class="source-text">${esc(JSON.stringify(declared.schema, null, 2))}</pre></details>`,
    );
}
function routePath(edge) {
  return edge.sections
    .map((section) =>
      [section.startPoint, ...(section.bendPoints || []), section.endPoint]
        .map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`)
        .join(" "),
    )
    .join(" ");
}
function fitDiagram() {
  const viewport = $("#graph-viewport"),
    diagram = currentDiagram();
  if (!viewport) return;
  const inspector = $("#inspector");
  const width = Math.max(
    280,
    viewport.clientWidth -
      (inspector && !inspector.hidden
        ? inspector.getBoundingClientRect().width + 28
        : 0),
  );
  state.zoom = Math.max(
    0.025,
    Math.min(
      0.95,
      (width - 60) / diagram.width,
      (viewport.clientHeight - 100) / diagram.height,
    ),
  );
  setCamera(
    (diagram.width * state.zoom - width) / 2,
    (diagram.height * state.zoom - viewport.clientHeight + 60) / 2,
  );
}
function rememberPhaseArrival(stage, nodeId = null, edgeId = null) {
  if (stage === state.mapStage) return;
  state.arrival = null;
  const from = state.mapStage;
  if (stage === "all" || from === "all") return;
  let edges = currentDiagram().edges.filter((edge) => {
    const source = byId.get(edge.source)?.stage;
    const target = byId.get(edge.target)?.stage;
    return (
      ((source === from && target === stage) ||
        (source === stage && target === from)) &&
      (!nodeId || edge.source === nodeId || edge.target === nodeId) &&
      (!edgeId || edge.id === edgeId)
    );
  });
  // A node/inspector link retains the exact starting step when it is known.
  // A phase tab alone retains every declared connection to the prior phase.
  if (nodeId && !edgeId && state.selected) {
    const exact = edges.filter(
      (edge) =>
        edge.source === state.selected || edge.target === state.selected,
    );
    if (exact.length) edges = exact;
  }
  if (edges.length)
    state.arrival = { from, to: stage, edgeIds: edges.map((edge) => edge.id) };
}
function arrivalEdges() {
  return state.arrival?.to === state.mapStage
    ? currentDiagram().edges.filter((edge) =>
        state.arrival.edgeIds.includes(edge.id),
      )
    : [];
}
function renderPhaseArrival() {
  const edges = arrivalEdges();
  if (!edges.length) return "";
  const detail =
    edges.length === 1
      ? `${byId.get(edges[0].source).title} → ${byId.get(edges[0].target).title}`
      : `${edges.length} connections highlighted`;
  return `<div class="phase-arrival" role="status" data-arrival-from="${esc(state.arrival.from)}"><span>${icon("link")}<strong>From ${esc(stageOf(state.arrival.from).name)}</strong><span>${esc(detail)}</span></span><button class="icon-button" data-action="clear-arrival" aria-label="Clear previous phase highlight">${icon("close")}</button></div>`;
}
function openPhase(stage, nodeId = null) {
  setMapKey(false);
  rememberPhaseArrival(stage, nodeId);
  setMobileControls(false);
  state.mapStage = stage;
  state.selected = null;
  state.route = null;
  state.query = "";
  state.tab = "overview";
  updateHash();
  render();
  fitDiagram();
}
function currentDiagram() {
  return state.mapStage !== "all"
    ? layouts.phases[state.mapStage][state.edgeMode]
    : layouts[state.edgeMode];
}
function matchingNodes() {
  const query = state.query.trim().toLowerCase();
  if (!query) return [];
  return sorted(
    currentDiagram()
      .nodes.map((n) => byId.get(n.id))
      .filter((n) => n.searchText.includes(query)),
  );
}
function syncSearchPosition() {
  const matches = matchingNodes();
  state.matchIndex = Math.min(
    Math.max(0, state.matchIndex),
    Math.max(0, matches.length - 1),
  );
  const current = matches[state.matchIndex];
  const counter = $(".map-match-count");
  if (counter) {
    counter.textContent = `${current ? state.matchIndex + 1 : 0}/${matches.length}`;
    counter.setAttribute(
      "aria-label",
      current
        ? `Match ${state.matchIndex + 1} of ${matches.length}: ${current.title}`
        : "No matches",
    );
    counter.title = current?.title || "No matches";
  }
  document.querySelectorAll(".graph-node").forEach((node) => {
    const active =
      !!current &&
      (node.dataset.select || node.dataset.boundaryNode) === current.id;
    node.classList.toggle("search-current", active);
    if (active) node.setAttribute("aria-current", "true");
    else node.removeAttribute("aria-current");
  });
  return matches;
}
function renderMap() {
  const diagram = currentDiagram();
  const visible = sorted(
      diagram.nodes.map((p) => ({
        ...byId.get(p.id),
        isBoundary: !!p.isBoundary,
      })),
    ),
    center = byId.get(state.selected);
  const hasQuery = !!state.query.trim();
  const matches = new Set(matchingNodes().map((node) => node.id));
  const edges = diagram.edges;
  const pos = new Map(diagram.nodes.map((n) => [n.id, n]));
  const { width, height } = diagram;
  const clusterRegions = (diagram.clusters || [])
    .map(
      (c) =>
        `<div class="stage-cluster stage-${c.stage}" data-cluster="${c.id}" role="img" aria-label="${esc(stageOf(c.stage).name)}: ${c.nodeIds.length} nodes" style="left:${c.x}px;top:${c.y}px;width:${c.width}px;height:${c.height}px"><span class="cluster-label">${String(stageOf(c.stage).number).padStart(2, "0")} · ${esc(stageOf(c.stage).name)} <small>${c.nodeIds.length}</small></span></div>`,
    )
    .join("");
  const connected = new Set(
    center
      ? [
          center.id,
          ...edges
            .filter((e) => e.source === center.id || e.target === center.id)
            .flatMap((e) => [e.source, e.target]),
        ]
      : [],
  );
  const lines = edges
    .map((e) => {
      const exitRail =
        state.edgeMode === "control" &&
        byId.get(e.target)?.name.startsWith("EXIT-01");
      const path = routePath(e);
      return `<path class="edge-casing" d="${path}" aria-hidden="true"/><path class="edge-hit" d="${path}" data-edge="${e.id}" aria-hidden="true"/><path class="graph-edge ${exitRail ? "exit-connection" : ""} ${e.source === center?.id || e.target === center?.id ? "relevant" : center ? "muted-edge" : ""}" d="${path}" marker-end="url(#arrowhead)" tabindex="0" role="button" aria-label="${esc(byId.get(e.source)?.name + " to " + byId.get(e.target)?.name + ": " + e.label)}" data-edge="${e.id}"><title>${esc(e.label)}</title></path>`;
    })
    .join("");
  return `<div class="map-toolbar">${state.query.trim() ? `<span class="map-match-count" role="status" aria-live="polite" aria-atomic="true">${matches.size ? Math.min(state.matchIndex + 1, matches.size) : 0}/${matches.size}</span><button class="button" data-action="previous-match" aria-label="Previous match" ${matches.size > 1 ? "" : "disabled"}>${icon("back")}<span>Previous<span class="match-word"> match</span></span></button><button class="button" data-action="next-match" aria-label="Next match" ${matches.size > 1 ? "" : "disabled"}><span>Next<span class="match-word"> match</span></span>${icon("arrow")}</button><button class="icon-button" data-action="clear-map-search" aria-label="Clear map search">${icon("close")}</button>` : ""}</div>${renderPhaseArrival()}<div class="map-legend" id="map-key" role="region" aria-label="Map key and context"><div class="map-key-heading"><strong>Map key & context</strong><button class="icon-button map-key-close" data-action="map-key" aria-label="Close map key">${icon("close")}</button></div><span class="map-node-count">${visible.filter((n) => !n.isBoundary).length} ${state.audience === "business" ? "steps" : "nodes"} · ${visible.filter((n) => n.isBoundary).length} phase links · ${edges.length} connections${diagram.hiddenNodeIds?.length ? " · scenario setup hidden" : ""}</span>${(state.audience ===
  "business"
    ? [
        ["activity", "Business step"],
        ["decision", "Decision"],
        ["human", "Human review"],
        ["outcome", "Outcome"],
      ]
    : [
        ["agent", "AI agent"],
        ["code", "Code / rules"],
        ["human", "Human review"],
        ["sub_workflow", "Sub-workflow"],
        ["integration", "Integration"],
        ["input", "Input"],
        ["output", "Output"],
      ]
  )
    .map(
      ([type, label]) =>
        `<span class="legend-item">${icon(type, `type-${type}`)}${label}</span>`,
    )
    .join(
      "",
    )}<span class="legend-guide">${center ? `Highlighted: immediate connections of ${esc(nodeCode(center))}` : state.edgeMode === "data" ? "Arrows = declared data dependencies, not execution order" : "Click an arrow to go to its destination · click a label for route details"}</span><span class="map-context-note">${icon("shield")}${catalog.hosted ? "Protected" : "Local"} configuration snapshot · UC1<br>Documented workflow, not a live claim.</span></div><div class="graph-viewport" id="graph-viewport" tabindex="0" aria-label="Unlimited workflow canvas. Drag or scroll to pan; Control or Command and scroll to zoom. Arrow keys pan; Home fits the workflow."><div class="graph-spacer"><div class="graph-world" style="width:${width}px;height:${height}px;transform:translate(${-state.camera.x}px, ${-state.camera.y}px) scale(${state.zoom})">${clusterRegions}<svg class="graph-lines" width="${width}" height="${height}" aria-label="Workflow connections"><defs><marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="context-stroke"/></marker></defs>${lines}</svg>${edges.flatMap((e) => e.labels.map((label) => `<button class="edge-label ${e.source === center?.id || e.target === center?.id ? "relevant" : ""}" data-edge="${e.id}" style="left:${label.x}px;top:${label.y}px;width:${label.width}px;height:${label.height}px" aria-label="Inspect route ${esc(e.label)} from ${esc(byId.get(e.source)?.name)} to ${esc(byId.get(e.target)?.name)}">${esc(label.text)}</button>`)).join("")}${visible
    .map((n) => {
      const p = pos.get(n.id);
      return `<button class="graph-node ${n.isBoundary ? "phase-boundary" : ""} type-border-${n.type} ${n.id === state.selected ? "selected" : ""} ${center && !connected.has(n.id) ? "unrelated-node" : ""} ${hasQuery ? (matches.has(n.id) ? "search-match" : "search-dimmed") : ""}" style="left:${p.x}px;top:${p.y}px;width:${p.width}px;height:${p.height}px" ${n.isBoundary ? `data-open-phase="${n.stage}" data-boundary-node="${n.id}"` : `data-select="${n.id}"`} aria-label="${n.isBoundary ? `Open ${esc(stageOf(n.stage).name)} phase, connected step: ${esc(n.name)}` : `Inspect ${esc(n.name)}`}" title="${esc(n.summary)}"><div><span class="node-symbol type-${n.type}">${icon(n.type)}</span>${n.isBoundary ? `<span class="business-card-kind">${boundaryDirection(n.id, edges)}</span>${state.audience === "technical" ? `<span class="boundary-code">${esc(nodeCode(n))}</span>` : ""}` : state.audience === "business" ? `<span class="business-card-kind">${esc(n.role)}</span>` : `<span class="node-code">${esc(nodeCode(n))}</span><small>${n.inputs.length} in · ${n.outputs.length} out</small>`}</div><strong>${esc(n.title)}</strong><p class="node-description">${esc(n.summary)}</p><div class="graph-node-foot"><span>${n.isBoundary ? `<span class="boundary-phase stage-${n.stage}" title="${esc(stageOf(n.stage).name)}">${esc(stageOf(n.stage).name)}</span>` : state.audience === "business" ? esc(stageOf(n.stage).name) : esc(n.role)}</span>${n.isBoundary ? `<span class="boundary-jump" aria-hidden="true">↗</span>` : n.missingInternal ? '<span class="missing-internals">Internals missing</span>' : catalog.edges.filter((e) => e.source === n.id).length > 1 ? `<span class="branch-count">${catalog.edges.filter((e) => e.source === n.id).length} outgoing routes ↗</span>` : ""}</div></button>`;
    })
    .join(
      "",
    )}</div></div></div><div class="map-footer"><div><button class="icon-button" data-zoom="out" aria-label="Zoom out">−</button><span id="zoom-value">${Math.round(state.zoom * 100)}%</span><button class="icon-button" data-zoom="in" aria-label="Zoom in">+</button><button class="button" data-zoom="fit" aria-label="Fit map to view">${icon("expand")}Fit all</button><button class="text-button" data-zoom="actual">100%</button><button class="text-button" data-action="go-start">${state.mapStage === "all" ? "Go to start" : "Fit phase"}</button></div><span>Drag or scroll to pan · Ctrl / ⌘ + scroll to zoom · Home to fit</span></div><div class="minimap"><span id="minimap-label">FLOW OVERVIEW</span><svg id="minimap" viewBox="0 0 ${width} ${height}" role="img" aria-label="Workflow overview. Click to navigate." preserveAspectRatio="xMidYMid meet">${(diagram.clusters || []).map((c) => `<rect class="minimap-cluster stage-${c.stage}" x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" rx="20"/>`).join("")}${edges.map((e) => `<path d="${routePath(e)}" fill="none" stroke="#8ba89b" stroke-width="10"/>`).join("")}${visible
    .map((n) => {
      const p = pos.get(n.id);
      return `<rect x="${p.x}" y="${p.y}" width="${diagram.nodeWidth}" height="${diagram.nodeHeight}" rx="10" fill="${n.id === state.selected ? "#176c50" : n.type === "agent" ? "#a693bb" : n.type === "human" ? "#bb995c" : "#afc3b8"}"/>`;
    })
    .join(
      "",
    )}<rect id="minimap-window" x="0" y="0" width="0" height="0" fill="#176c5014" stroke="#176c50" stroke-width="10"/></svg></div><div id="edge-description" class="edge-description" role="status"></div>`;
}
function boundaryDirection(id, edges) {
  const incoming = edges.some((e) => e.source === id);
  const outgoing = edges.some((e) => e.target === id);
  if (incoming && outgoing) return "Connected step";
  if (state.edgeMode === "data")
    return incoming ? "Provides data" : "Receives data";
  return incoming ? "Previous step" : "Next step";
}
function highlightEdge(id) {
  const edge = currentDiagram().edges.find((e) => e.id === id);
  document
    .querySelectorAll(".graph-edge,.edge-label")
    .forEach((el) =>
      el.classList.toggle("path-highlight", el.dataset.edge === id),
    );
  document
    .querySelectorAll(".graph-node")
    .forEach((el) =>
      el.classList.toggle(
        "path-endpoint",
        !!edge &&
          [edge.source, edge.target].includes(
            el.dataset.select || el.dataset.boundaryNode,
          ),
      ),
    );
}
function setCamera(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  state.camera = { x, y };
  applyCamera();
}
function applyCamera() {
  const viewport = $("#graph-viewport"),
    world = $(".graph-world");
  if (!viewport || !world) return;
  viewportSize = {
    width: viewport.clientWidth,
    height: viewport.clientHeight,
    windowWidth: window.innerWidth,
  };
  world.style.transform = `translate(${-state.camera.x}px, ${-state.camera.y}px) scale(${state.zoom})`;
  viewport.dataset.cameraX = state.camera.x;
  viewport.dataset.cameraY = state.camera.y;
  viewport.dataset.cameraZoom = state.zoom;
  // Keep the dotted background anchored to the world, with readable spacing
  // even at the very small zoom used to fit the complete technical workflow.
  const base = 20 * state.zoom;
  const spacing =
    base * Math.pow(2, Math.max(0, Math.ceil(Math.log2(12 / base))));
  viewport.style.backgroundSize = `${spacing}px ${spacing}px`;
  viewport.style.backgroundPosition = `${-state.camera.x % spacing}px ${-state.camera.y % spacing}px`;
  $("#zoom-value").textContent = Math.round(state.zoom * 100) + "%";
  updateMinimap();
}
function initMapPan() {
  const el = $("#graph-viewport");
  if (!el) return;
  syncSearchPosition();
  applyCamera();
  el.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? el.clientHeight
            : 1;
      if (event.ctrlKey || event.metaKey) {
        const box = el.getBoundingClientRect();
        zoomMap(state.zoom * Math.exp(-event.deltaY * unit * 0.005), {
          x: event.clientX - box.left,
          y: event.clientY - box.top,
        });
      } else {
        const dx =
          event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
        const dy = event.shiftKey && !event.deltaX ? 0 : event.deltaY;
        setCamera(state.camera.x + dx * unit, state.camera.y + dy * unit);
      }
    },
    { passive: false },
  );
  const minimap = $("#minimap");
  if (minimap)
    minimap.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        minimap.getScreenCTM().inverse(),
      );
      setCamera(
        point.x * state.zoom - el.clientWidth / 2,
        point.y * state.zoom - el.clientHeight / 2,
      );
    });
  highlightEdge(state.route);
  const arrival = arrivalEdges();
  const arrivalIds = new Set(arrival.map((edge) => edge.id));
  const endpoints = new Set(
    arrival.flatMap((edge) => [edge.source, edge.target]),
  );
  el.classList.toggle("has-arrival", arrival.length > 0);
  el.querySelectorAll(".graph-edge,.edge-label").forEach((element) =>
    element.classList.toggle(
      "arrival-path",
      arrivalIds.has(element.dataset.edge),
    ),
  );
  el.querySelectorAll(".graph-node").forEach((element) =>
    element.classList.toggle(
      "arrival-node",
      endpoints.has(element.dataset.select || element.dataset.boundaryNode),
    ),
  );
  const pointers = new Map();
  let gesture = null,
    moved = false,
    suppressClick = false;
  const beginGesture = () => {
    const points = [...pointers.values()];
    if (!points.length) {
      gesture = null;
      return;
    }
    const a = points[0],
      b = points[1] || a;
    const box = el.getBoundingClientRect();
    gesture = {
      x: (a.x + b.x) / 2 - box.left,
      y: (a.y + b.y) / 2 - box.top,
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      zoom: state.zoom,
      camera: { ...state.camera },
    };
  };
  el.addEventListener("pointerdown", (event) => {
    if (
      event.button !== 0 ||
      (event.pointerType !== "touch" &&
        event.target.closest("button,path[data-edge]"))
    )
      return;
    if (!pointers.size) {
      moved = false;
      suppressClick = false;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (event.pointerType !== "touch") {
      event.preventDefault();
      el.focus({ preventScroll: true });
      el.setPointerCapture(event.pointerId);
    }
    if (pointers.size > 1) moved = suppressClick = true;
    beginGesture();
  });
  el.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId) || !gesture) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.values()],
      a = points[0],
      b = points[1] || a;
    const box = el.getBoundingClientRect();
    const x = (a.x + b.x) / 2 - box.left,
      y = (a.y + b.y) / 2 - box.top;
    if (!moved && Math.hypot(x - gesture.x, y - gesture.y) < 6) return;
    moved = suppressClick = true;
    el.classList.add("panning");
    if (points.length > 1 && gesture.distance > 0)
      state.zoom = Math.min(
        1.8,
        Math.max(
          0.025,
          (gesture.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / gesture.distance,
        ),
      );
    setCamera(
      ((gesture.camera.x + gesture.x) * state.zoom) / gesture.zoom - x,
      ((gesture.camera.y + gesture.y) * state.zoom) / gesture.zoom - y,
    );
  });
  const finish = (event) => {
    if (!pointers.delete(event.pointerId)) return;
    beginGesture();
    if (!pointers.size) el.classList.remove("panning");
  };
  // Touch capture stays on the original card: a tap still selects it, but
  // a drag/pinch must never activate that card or an arrow on release.
  el.addEventListener(
    "click",
    (event) => {
      if (!suppressClick || event.detail === 0) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    },
    true,
  );
  el.addEventListener("pointerup", finish);
  el.addEventListener("pointercancel", finish);
  el.addEventListener("lostpointercapture", finish);
  el.addEventListener("keydown", (event) => {
    if (event.target !== el) return;
    const step = event.shiftKey ? 240 : 80;
    const delta = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[event.key];
    if (delta) {
      event.preventDefault();
      setCamera(state.camera.x + delta[0], state.camera.y + delta[1]);
    } else if (event.key === "Home") {
      event.preventDefault();
      fitDiagram();
    }
  });
}
function updateMinimap() {
  const viewport = $("#graph-viewport"),
    frame = $("#minimap-window");
  if (!viewport || !frame) return;
  const x = state.camera.x / state.zoom,
    y = state.camera.y / state.zoom;
  const width = viewport.clientWidth / state.zoom,
    height = viewport.clientHeight / state.zoom;
  for (const [key, value] of Object.entries({ x, y, width, height }))
    frame.setAttribute(key, value);
  const diagram = currentDiagram();
  const outside =
    x > diagram.width || y > diagram.height || x + width < 0 || y + height < 0;
  const label = $("#minimap-label");
  if (label)
    label.textContent = outside
      ? "Outside map · click to return"
      : "Flow overview";
}
window.addEventListener("resize", () =>
  requestAnimationFrame(() => {
    const viewport = $("#graph-viewport");
    if (!viewport) return;
    // Rotation reveals more canvas around the same world point. A soft keyboard
    // changes only height, so it must not disturb the user's map position.
    if (viewportSize && viewportSize.windowWidth !== window.innerWidth) {
      state.camera.x += (viewportSize.width - viewport.clientWidth) / 2;
      state.camera.y += (viewportSize.height - viewport.clientHeight) / 2;
    }
    applyCamera();
  }),
);
function zoomMap(next, anchor) {
  const viewport = $("#graph-viewport");
  if (!viewport) return;
  const point = anchor || {
    x: viewport.clientWidth / 2,
    y: viewport.clientHeight / 2,
  };
  const x = (state.camera.x + point.x) / state.zoom,
    y = (state.camera.y + point.y) / state.zoom;
  state.zoom = Math.min(1.8, Math.max(0.025, next));
  setCamera(x * state.zoom - point.x, y * state.zoom - point.y);
}
function focusMapNode(id, changeZoom = true) {
  const node = $(
      `.graph-node[data-select="${id}"], .graph-node[data-boundary-node="${id}"]`,
    ),
    viewport = $("#graph-viewport");
  if (!node || !viewport) return;
  if (changeZoom) zoomMap(0.95);
  const inspector = $("#inspector");
  const availableWidth = Math.max(
    280,
    viewport.clientWidth -
      (inspector && !inspector.hidden
        ? inspector.getBoundingClientRect().width + 28
        : 0),
  );
  setCamera(
    parseFloat(node.style.left) * state.zoom - availableWidth * 0.35,
    parseFloat(node.style.top) * state.zoom - viewport.clientHeight * 0.35,
  );
}
function updateHash() {
  const p = new URLSearchParams({ view: state.view, audience: state.audience });
  if (state.selected) p.set("node", state.selected);
  if (state.mapStage !== "all") p.set("phase", state.mapStage);
  if (state.tab !== "overview") p.set("tab", state.tab);
  history.replaceState(null, "", "#" + p.toString());
}
function focusStart() {
  if (state.mapStage !== "all") {
    fitDiagram();
    return;
  }
  const start =
    sorted(catalog.nodes).find((n) => n.type === "input") ||
    sorted(catalog.nodes)[0];
  const point = layouts[state.edgeMode].nodes.find((n) => n.id === start.id);
  const viewport = $("#graph-viewport");
  zoomMap(0.75);
  setCamera(point.x * state.zoom - 60, point.y * state.zoom - 85);
}
function selectNode(id, tab, edgeId = null) {
  if (!byId.has(id)) return;
  setMapKey(false);
  setMobileControls(false);
  state.route = null;
  if (state.selected && state.selected !== id)
    state.history.push(state.selected);
  if (state.mapStage !== "all" && byId.get(id).stage !== state.mapStage) {
    rememberPhaseArrival(byId.get(id).stage, id, edgeId);
    state.mapStage = byId.get(id).stage;
  }
  state.selected = id;
  const matchIndex = matchingNodes().findIndex((node) => node.id === id);
  if (matchIndex >= 0) state.matchIndex = matchIndex;
  state.tab = tab || "overview";
  state.promptFind = "";
  state.codeFind = "";

  closeDialog();
  updateHash();
  render();
}
let previousFocus;
function showDialog(content, cls = "") {
  previousFocus = document.activeElement;
  $("#dialog-root").innerHTML =
    `<div class="dialog-overlay"><section class="dialog ${cls}" role="dialog" aria-modal="true" aria-label="${cls === "field-dialog" ? "Field details" : cls === "map-help" ? "How to read this map" : "Terminology guide"}"><button class="icon-button dialog-close" data-action="close-dialog" aria-label="Close dialog">${icon("close")}</button>${content}</section></div>`;
  $(".dialog-close").focus();
  document.body.classList.add("dialog-open");
}
function closeDialog() {
  if (!$("#dialog-root")?.innerHTML) return;
  $("#dialog-root").innerHTML = "";
  document.body.classList.remove("dialog-open");
  previousFocus?.focus();
}
function mapHelpDialog() {
  if (state.audience === "business") {
    showDialog(
      `<div class="dialog-eyebrow">THE CLAIM IN PLAIN LANGUAGE</div><h2>How to read this map</h2><p>Follow the arrows from receiving a claim to its processing outcome. The 28 steps group related work into business activities and decisions.</p><h3>Colors show the part of the process</h3><p>Background colors match the nine phase tabs. Select a phase to open its focused workflow; connected-phase cards link to the surrounding process. Entire flow restores the complete map. Steps stay arranged around their connections; a stage can occupy several regions.</p><h3>Branches show possible paths</h3><p>Labels explain why the process takes a path. Inpatient and outpatient coding may both apply. A human-review branch handles document corrections. Checkpoints may exit processing.</p><h3>Click a step to understand it</h3><p>Read what happens, what information comes in, what comes out and what follows. Selecting a step does not change your zoom. Click an arrow to go to its next step; click a route label for its details. Use Expand for more reading space.</p><div class="notice warning"><p>The workflow prepares claims and invoices for review. An assessment suggestion is not final approval or a payment decision. This is a documented process, not a live claim.</p></div>`,
      "map-help",
    );
    return;
  }
  showDialog(
    `<div class="dialog-eyebrow">ONE MAP · EVERY EXPORTED STEP</div><h2>How to read this map</h2><p>Follow the arrowheads, not the position of the cards. Nodes are arranged by their actual connections. Branches fan out and rejoin; sequences progress from left to right. Colored background regions identify the nine workflow stages and match the stage shortcuts above. A stage may appear in several regions where the flow splits. These colors do not change execution order or card positions.</p><div class="map-help-grid"><section><h3>1. Find your bearings</h3><p>Use <strong>Entire flow</strong> or <strong>Fit all</strong> to see the whole graph. Select a phase tab to open its own workflow. Phase-link cards show where it receives work from or continues next. Entire flow returns to the complete map. Pan without boundaries in any direction by dragging or scrolling. The minimap stays anchored to the workflow so you can return from empty space. When the canvas has keyboard focus, arrow keys pan and Home fits the workflow. Ctrl/⌘ + scroll zooms; / opens search.</p></section><section><h3>2. Follow a connection</h3><p>Arrowheads show direction. Conditions printed on paths come directly from the export. Multiple outgoing arrows represent routes; do not assume all branches execute. Crossing lines are not junctions: paths only connect at node cards. Click an arrow to open its destination without changing your zoom. Click a printed route label to inspect its condition and both endpoints. Dashed lines lead to the shared exit. Unlabeled process arrows mean “Continue”.</p></section><section><h3>3. Open any node</h3><p>Its type and input/output counts are printed on the card. Read its actions, external-service exchanges and declared inputs/outputs on one page. Original prompts, logic, settings and evidence are expandable below. A field opens its full schema and declared producer/consumer mappings.</p></section><section><h3>4. Simplify a busy branch</h3><p>Select a node to highlight its immediate connections. The full map always stays visible. Hover or select a path to emphasize its source and destination; use the connection card to jump to either end. Switch to <strong>Data mappings</strong> to inspect data dependencies, which are not execution order.</p></section></div><div class="notice warning">${icon("alert")}<div><strong>A documented configuration, not a live claim</strong><p>The map shows 87 nodes and 110 process connections, with scenario setup omitted. The original export is unchanged. Six sub-workflow calls refer to four external workflows whose internal nodes and prompts were not supplied; those cards are marked “Internals missing”.</p><p>AI outputs are intermediate suggestions. UC1 prepares review-ready invoices; this is not a final payment or approval trace.</p></div></div><h3>Where the explanation comes from</h3><p>Exact definitions come from the JSON export. Plain-language summaries and stage groupings interpret the supplied PDD and visual guide. Node-specific differences and static mapping checks remain in each node’s <strong>Source evidence</strong> section. No production calls are made.</p>${catalog.sourceDocumentsAvailable === false ? '<p class="muted">Original source documents are kept offline and are not included in this hosted snapshot.</p>' : `<div class="map-help-links"><a class="button" href="/sources/pdd.pdf" target="_blank" rel="noopener">Open source PDD ${icon("arrow")}</a><a class="button" href="/sources/guide.docx">Source visual guide ${icon("download")}</a></div>`}`,
    "map-help",
  );
}
function glossaryDialog() {
  showDialog(
    `<div class="dialog-eyebrow">A SHARED LANGUAGE</div><h2>Terminology guide</h2><p>Business meanings used throughout this inspector.</p><dl class="glossary">${catalog.glossary.map(([term, meaning]) => `<div><dt>${esc(term)}</dt><dd>${esc(meaning)}</dd></div>`).join("")}</dl>`,
  );
}
async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast("Copied to clipboard");
  } catch {
    toast("Clipboard unavailable. Select and copy the source text manually.");
  }
}
document.addEventListener("click", (event) => {
  const b = event.target.closest("button,a,path[data-edge]");
  if (event.target.classList.contains("dialog-overlay")) {
    closeDialog();
    return;
  }
  if (!b) return;
  if (b.closest(".brand")) {
    state.arrival = null;
    event.preventDefault();
    state.view = "map";
    state.selected = null;
    state.query = "";
    state.mapStage = "all";
    updateHash();
    render();
    focusStart();
    return;
  }
  if (b.dataset.audience) {
    if (state.audience === b.dataset.audience) return;
    activateAudience(b.dataset.audience);
    state.selected = null;
    state.tab = "overview";
    state.query = "";
    state.route = null;
    state.history = [];
    state.mapStage = "all";
    updateHash();
    render();
    focusStart();
    return;
  }
  if (b.dataset.select) {
    selectNode(b.dataset.select);
    if (!b.classList.contains("graph-node"))
      focusMapNode(b.dataset.select, false);
    return;
  }
  if (b.dataset.mapStage || b.dataset.openPhase) {
    openPhase(
      b.dataset.mapStage || b.dataset.openPhase,
      b.dataset.boundaryNode,
    );
    return;
  }
  if (b.dataset.tab) {
    state.tab = b.dataset.tab;
    updateHash();
    renderInspector();
    return;
  }
  if (b.dataset.prompt) {
    state.prompt = b.dataset.prompt;
    state.promptFind = "";
    $("#source-prompts").innerHTML = prompts(byId.get(state.selected));
    return;
  }
  if (b.dataset.fieldNode) {
    openField(b.dataset.fieldNode, b.dataset.fieldPath, b.dataset.direction);
    return;
  }
  if (b.dataset.fieldLogic) {
    selectNode(b.dataset.fieldLogic, "logic");
    return;
  }
  if (b.dataset.traceSource) {
    const m = catalog.mappings.find((m) => m.id === b.dataset.traceSource);
    const direction = m.origin === "input" ? "inputs" : "outputs";
    if (
      catalog.allFields.some(
        (f) =>
          f.nodeId === m.source &&
          f.path === m.path &&
          f.direction === direction,
      )
    )
      openField(m.source, m.path, direction);
    else {
      const root = m.path.split(/[.\[]/)[0];
      if (
        catalog.allFields.some(
          (f) =>
            f.nodeId === m.source &&
            f.path === root &&
            f.direction === direction,
        )
      )
        openField(m.source, root, direction);
      else toast("That source field is not declared in the export.");
    }
    return;
  }
  if (b.dataset.traceTarget) {
    const m = catalog.mappings.find((m) => m.id === b.dataset.traceTarget);
    if (m.declared) openField(m.target, m.input, m.targetDirection);
    else toast("That target field is not declared in the export.");
    return;
  }
  if (b.dataset.copy) {
    copy(byId.get(state.selected)?.process[b.dataset.copy] || "");
    return;
  }
  if (b.dataset.line) {
    $("#source-line-" + b.dataset.line)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    return;
  }
  if (b.dataset.zoom) {
    if (b.dataset.zoom === "fit") {
      fitDiagram();
      return;
    }
    const vp = $("#graph-viewport");
    const next =
      b.dataset.zoom === "actual"
        ? 1
        : b.dataset.zoom === "in"
          ? Math.min(1.8, state.zoom * 1.25)
          : b.dataset.zoom === "out"
            ? Math.max(0.025, state.zoom / 1.25)
            : Math.max(
                0.025,
                Math.min(
                  1,
                  (vp.clientWidth - 40) /
                    parseFloat($(".graph-world").style.width),
                  (vp.clientHeight - 85) /
                    parseFloat($(".graph-world").style.height),
                ),
              );
    zoomMap(next);
    return;
  }
  if (b.dataset.edge) {
    const e = currentDiagram().edges.find((e) => e.id === b.dataset.edge);
    if (!e) return;
    if (b.matches("path")) {
      selectNode(e.target, undefined, e.id);
      focusMapNode(e.target, false);
      return;
    }
    state.route = e.id;
    highlightEdge(e.id);
    $("#edge-description").innerHTML =
      `<button class="icon-button edge-close" data-action="close-edge" aria-label="Close connection details">${icon("close")}</button><span class="section-label">${e.hiddenNodeIds?.length ? "SIMPLIFIED VIEW CONNECTION" : state.edgeMode === "control" ? "EXPORTED ROUTE" : "DECLARED DATA CONNECTION"}</span><div class="edge-endpoints"><button class="text-button" data-select="${e.source}">${esc(nodeCode(byId.get(e.source)))}</button>${icon("arrow")}<button class="text-button" data-select="${e.target}">${esc(nodeCode(byId.get(e.target)))}</button></div><strong>${esc(e.label)}</strong>${e.hiddenNodeIds?.length ? "<p>Scenario setup is omitted from the viewer. This connector represents the two original source connections through it.</p>" : ""}${
        state.edgeMode === "data"
          ? e.mappingIds
              .map((id) => {
                const m = catalog.mappings.find((m) => m.id === id);
                return `<div class="edge-mapping"><code>${esc(m.path)} → ${esc(m.input)}</code><button class="text-button" data-trace-target="${m.id}">Inspect field</button></div>`;
              })
              .join("")
          : `<p>${esc(byId.get(e.source).title)} → ${esc(byId.get(e.target).title)}</p>`
      }`;
    return;
  }
  switch (b.dataset.action) {
    case "map-key":
      setMapKey(!state.mapKeyOpen, state.mapKeyOpen);
      break;
    case "clear-arrival":
      state.arrival = null;
      renderMain();
      break;
    case "mobile-controls":
      setMobileControls(!state.mobileControlsOpen);
      break;
    case "close-edge":
      $("#edge-description").innerHTML = "";
      state.route = null;
      highlightEdge(null);
      break;
    case "reset":
      state.query = "";
      render();
      break;
    case "expand-inspector": {
      state.inspectorExpanded = !state.inspectorExpanded;
      $(".body-grid").classList.toggle(
        "inspector-expanded",
        state.inspectorExpanded,
      );
      b.setAttribute("aria-pressed", String(state.inspectorExpanded));
      b.setAttribute(
        "aria-label",
        state.inspectorExpanded
          ? "Restore inspector size"
          : "Expand node inspector",
      );
      $("span", b).textContent = state.inspectorExpanded ? "Restore" : "Expand";
      break;
    }
    case "close-inspector":
      state.selected = null;
      updateHash();
      render();
      break;
    case "back": {
      const id = state.history.pop();
      if (!byId.has(id)) break;
      if (state.mapStage !== "all" && byId.get(id).stage !== state.mapStage) {
        rememberPhaseArrival(byId.get(id).stage, id);
        state.mapStage = byId.get(id).stage;
      }
      state.selected = id;
      state.tab = "overview";
      updateHash();
      render();
      focusMapNode(id, false);
      break;
    }
    case "copy-link":
      copy(location.href);
      break;
    case "go-start":
      state.selected = null;
      state.route = null;
      updateHash();
      render();
      focusStart();
      break;
    case "fullscreen":
      if (document.fullscreenElement)
        document
          .exitFullscreen()
          .catch(() => toast("Unable to exit fullscreen"));
      else
        document.documentElement
          .requestFullscreen()
          .catch(() => toast("Fullscreen is unavailable in this browser"));
      break;
    case "previous-match":
    case "next-match": {
      const matches = matchingNodes();
      if (matches.length) {
        const direction = b.dataset.action === "previous-match" ? -1 : 1;
        state.matchIndex =
          (state.matchIndex + direction + matches.length) % matches.length;
        syncSearchPosition();
        focusMapNode(matches[state.matchIndex].id, false);
      }
      break;
    }
    case "clear-map-search":
      state.query = "";
      render();
      break;
    case "map-help":
      mapHelpDialog();
      break;
    case "glossary":
      glossaryDialog();
      break;
    case "close-dialog":
      closeDialog();
      break;
    case "jump-match":
      $(".line-match")?.scrollIntoView({ behavior: "smooth", block: "center" });
      break;
  }
});
let inputTimer;
document.addEventListener("pointerover", (event) => {
  const edge = event.target.closest("[data-edge]");
  if (edge) highlightEdge(edge.dataset.edge);
});
document.addEventListener("pointerout", (event) => {
  if (event.target.closest("[data-edge]")) highlightEdge(state.route);
});
let keyboardMapNavigation = false;
document.addEventListener(
  "pointerdown",
  () => {
    keyboardMapNavigation = false;
  },
  true,
);
document.addEventListener(
  "keydown",
  (event) => {
    keyboardMapNavigation = event.key === "Tab";
  },
  true,
);
document.addEventListener("focusin", (event) => {
  const edge = event.target.closest("[data-edge]");
  if (edge) highlightEdge(edge.dataset.edge);
  if (!keyboardMapNavigation || !event.target.closest(".graph-world")) return;
  const viewport = $("#graph-viewport");
  const bounds = viewport.getBoundingClientRect();
  const target = event.target.getBoundingClientRect();
  if (
    target.left < bounds.left ||
    target.top < bounds.top ||
    target.right > bounds.right ||
    target.bottom > bounds.bottom
  ) {
    const node = event.target.closest(".graph-node");
    if (node)
      focusMapNode(node.dataset.select || node.dataset.boundaryNode, false);
    else {
      // Bring a keyboard-focused route label/path into view without selecting it.
      setCamera(
        state.camera.x +
          target.x +
          target.width / 2 -
          bounds.x -
          bounds.width / 2,
        state.camera.y +
          target.y +
          target.height / 2 -
          bounds.y -
          bounds.height / 2,
      );
    }
  }
});
document.addEventListener("focusout", (event) => {
  if (event.target.closest("[data-edge]")) highlightEdge(state.route);
});
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.id === "search") {
    state.query = el.value;
    state.matchIndex = 0;
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
      const results = $("#results");
      if (results) {
        results.innerHTML = renderMap();
        if (state.view === "map") {
          $("#mobile-map-title").textContent =
            state.mapStage !== "all"
              ? stageOf(state.mapStage).name
              : state.audience === "business"
                ? "Business workflow"
                : "Claim workflow";
          initMapPan();
          const match = matchingNodes()[0];
          if (state.query.trim() && match) focusMapNode(match.id);
        }
      }
    }, 100);
  }
  if (el.id === "prompt-find") {
    state.promptFind = el.value;
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
      const target = $("#prompt-content");
      if (target)
        target.innerHTML = sourceLines(
          byId.get(state.selected).process[state.prompt] || "",
          state.promptFind,
        );
    }, 120);
  }
  if (el.id === "code-find") {
    state.codeFind = el.value;
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
      const target = $("#code-content");
      if (target)
        target.innerHTML = sourceLines(
          byId.get(state.selected).process.code || "",
          state.codeFind,
        );
    }, 150);
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "edge-mode") {
    state.arrival = null;
    state.edgeMode = e.target.value;
    state.route = null;
    renderMain();
    focusMapNode(
      state.selected ||
        sorted(catalog.nodes).find((n) => n.type === "input").id,
    );
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if ($(".dialog")) closeDialog();
    else if (state.mapKeyOpen) setMapKey(false, true);
    else if (state.mobileControlsOpen) setMobileControls(false);
    else if (state.view === "map" && state.selected) {
      state.selected = null;
      updateHash();
      render();
    }
    return;
  }
  const dialog = $(".dialog");
  if (dialog && e.key === "Tab") {
    const focusable = [
      ...dialog.querySelectorAll("button,a,input,select,summary"),
    ].filter((el) => el.getClientRects().length);
    const first = focusable[0],
      last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) {
    e.preventDefault();
    if (window.matchMedia(PHONE_LAYOUT).matches) setMobileControls(true);
    $("#search")?.focus();
  }
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.matches("path[data-edge]")
  ) {
    e.preventDefault();
    e.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
});
window.addEventListener("hashchange", () => {
  if (!catalog) return;
  const hash = new URLSearchParams(location.hash.slice(1));
  activateAudience(audienceFromHash(hash));
  state.mapStage = catalog.stages.some((s) => s.id === hash.get("phase"))
    ? hash.get("phase")
    : "all";
  state.selected = byId.has(hash.get("node")) ? hash.get("node") : null;
  state.tab = hash.get("tab") || "overview";
  render();
  updateHash();
  if (state.selected) focusMapNode(state.selected);
});
try {
  const response = await fetch("/api/catalog");
  if (!response.ok)
    throw new Error(`Catalogue request failed (${response.status})`);
  catalog = await response.json();
  const layoutResponse = await fetch("/api/layout");
  if (!layoutResponse.ok)
    throw new Error(
      "Unable to load the connection layout. Restart the local server.",
    );
  layouts = await layoutResponse.json();
  technicalCatalog = catalog;
  technicalLayouts = layouts;
  const businessResponse = await fetch("/api/business");
  if (!businessResponse.ok)
    throw new Error("Restart the server to load the business map.");
  const business = await businessResponse.json();
  businessCatalog = business.catalog;
  businessLayout = business.layout;
  businessPhases = business.phases;
  const hash = new URLSearchParams(location.hash.slice(1));
  activateAudience(audienceFromHash(hash));
  state.mapStage = catalog.stages.some((s) => s.id === hash.get("phase"))
    ? hash.get("phase")
    : "all";
  state.selected = byId.has(hash.get("node")) ? hash.get("node") : null;
  if (hash.get("tab")) state.tab = hash.get("tab");
  shell();
  updateHash();
  if (state.selected) focusMapNode(state.selected);
  else focusStart();
} catch (error) {
  $("#app").innerHTML =
    `<div class="boot"><h1>Unable to open the workflow</h1><p>${esc(error.message)}</p><p>Check that the local server is running and mednetstructure.json is beside the inspector folder.</p><button class="button" id="retry">Try again</button></div>`;
  $("#retry").addEventListener("click", () => location.reload());
}
