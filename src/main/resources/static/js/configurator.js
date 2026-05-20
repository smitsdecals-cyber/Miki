/* eslint-disable */
/**
 * Configurateur SVG Miki
 *
 * Convention de nommage des calques Illustrator :
 *   color_xxx  -> zone couleur (fill)
 *   texte_xxx  -> texte (contenu, police, taille, position, gras, couleur)
 *   logo_xxx   -> emplacement de logo (clic / drag&drop / drag)
 *
 * Les calques nommés "numero_*" sont traités comme du texte avec des
 * contrôles étendus (taille, police, position) — c'est le cas typique
 * d'un numéro de course.
 */

const API = (path) => `/api${path}`;

const FONT_FAMILIES = [
  { label: "Bebas Neue (racing)",   value: "'Bebas Neue', Impact, sans-serif" },
  { label: "Oswald",                value: "'Oswald', sans-serif" },
  { label: "Anton",                 value: "'Anton', Impact, sans-serif" },
  { label: "Racing Sans One",       value: "'Racing Sans One', sans-serif" },
  { label: "Russo One",             value: "'Russo One', sans-serif" },
  { label: "Black Ops One",         value: "'Black Ops One', sans-serif" },
  { label: "Teko",                  value: "'Teko', sans-serif" },
  { label: "Audiowide",             value: "'Audiowide', sans-serif" },
  { label: "Roboto Condensed",      value: "'Roboto Condensed', Arial, sans-serif" },
  { label: "Impact",                value: "Impact, Charcoal, sans-serif" },
  { label: "Arial Black",           value: "'Arial Black', Gadget, sans-serif" },
  { label: "Arial",                 value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica",             value: "Helvetica, Arial, sans-serif" },
  { label: "Times New Roman",       value: "'Times New Roman', Times, serif" },
  { label: "Georgia",               value: "Georgia, serif" },
  { label: "Courier New",           value: "'Courier New', Courier, monospace" },
];

const state = {
  templates: [],
  logos: [],
  currentTemplateId: null,
  originalSvg: null,
  selectedEl: null,
  freeLogoCounter: 0,
};

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showToast(msg, ms = 2500) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), ms);
}

function nameOf(node) {
  return (node.getAttribute("id") || node.getAttribute("data-name") || "").trim();
}

function isColor(node) { return nameOf(node).toLowerCase().startsWith("color"); }
function isText(node)  {
  const n = nameOf(node).toLowerCase();
  return n.startsWith("texte") || n.startsWith("text") || n.startsWith("numero");
}
function isLogo(node)  { return nameOf(node).toLowerCase().startsWith("logo"); }

function prettyLabel(rawId) {
  return rawId.replace(/^(color|texte|text|logo|numero)_?/i, "").replace(/[_-]/g, " ") || rawId;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

function cssEscape(s) {
  return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/"/g, '\\"');
}

// --------------------------------------------------------------------------
// User-offset helpers (déplacement utilisateur sans détruire le transform AI)
// --------------------------------------------------------------------------

function getUserOffset(g) {
  return { x: +(g.dataset.uoX || 0), y: +(g.dataset.uoY || 0) };
}
function setUserOffset(g, x, y) {
  g.dataset.uoX = x; g.dataset.uoY = y;
  if (g.dataset.baseTransform === undefined) {
    g.dataset.baseTransform = g.getAttribute("transform") || "";
  }
  const base = g.dataset.baseTransform;
  const tr = `translate(${x} ${y}) ${base}`.trim();
  g.setAttribute("transform", tr);
  // Synchronise les inputs X/Y du panneau
  syncPositionInputs(g);
}

function syncPositionInputs(g) {
  const id = nameOf(g);
  const xInp = document.querySelector(`[data-pos-x-for="${cssEscape(id)}"]`);
  const yInp = document.querySelector(`[data-pos-y-for="${cssEscape(id)}"]`);
  const off = getUserOffset(g);
  if (xInp) xInp.value = off.x;
  if (yInp) yInp.value = off.y;
}

// --------------------------------------------------------------------------
// Chargement initial
// --------------------------------------------------------------------------

async function loadTemplates() {
  const r = await fetch(API("/templates"));
  state.templates = await r.json();
  const sel = $("#templateSelect");
  sel.innerHTML = state.templates.map(t =>
    `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("");
  if (state.templates.length) {
    sel.value = state.templates[0].id;
    await loadTemplate(state.templates[0].id);
  } else {
    $("#svgHost").innerHTML = `<p style="color:#888;padding:24px;">
      Aucun template. Ajoutez-en un dans <a href="admin.html">l'admin</a>.</p>`;
  }
}

async function loadTemplate(id) {
  const r = await fetch(API(`/templates/${id}`));
  if (!r.ok) return showToast("Template introuvable");
  const t = await r.json();
  state.currentTemplateId = id;
  state.originalSvg = t.svgContent;
  state.freeLogoCounter = 0;
  renderSvg(t.svgContent);
  buildControls();
}

async function loadLogos() {
  const r = await fetch(API("/logos?full=true"));
  state.logos = await r.json();
  renderLogosGrid();
  populateCategories();
}

function populateCategories() {
  const cats = [...new Set(state.logos.map(l => l.category).filter(Boolean))];
  $("#categoryFilter").innerHTML =
    `<option value="">Toutes</option>` +
    cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

// --------------------------------------------------------------------------
// Rendu du SVG dans la scène
// --------------------------------------------------------------------------

function renderSvg(svgString) {
  const host = $("#svgHost");
  host.innerHTML = svgString;
  const svg = host.querySelector("svg");
  if (!svg) return;
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  decorateEditableElements(svg);
}

function decorateEditableElements(svg) {
  svg.querySelectorAll("g").forEach(g => {
    if (!nameOf(g)) return;
    let kind = null;
    if (isColor(g)) kind = "color";
    else if (isText(g)) kind = "text";
    else if (isLogo(g)) kind = "logo";
    if (!kind) return;

    g.setAttribute("data-editable", kind);
    g.setAttribute("data-kind", kind);

    g.addEventListener("click", (e) => {
      e.stopPropagation();
      selectElement(g);
      // Active automatiquement l'onglet correspondant
      switchTab(kind === "color" ? "colors" : kind === "text" ? "texts" : "logos");
    });

    if (kind === "logo") {
      g.setAttribute("data-drop-target", "true");
      attachDropHandlers(g);
    }
    if (kind === "text") {
      const t = g.querySelector("text");
      if (t) makeGroupDraggable(g);
    }
  });
}

function selectElement(el) {
  $$(".stage [data-editable]").forEach(n => n.classList.remove("selected"));
  el.classList.add("selected");
  state.selectedEl = el;
  $$("[data-control-for]").forEach(n => n.style.background = "");
  const id = nameOf(el);
  const ctl = document.querySelector(`[data-control-for="${cssEscape(id)}"]`);
  if (ctl) ctl.style.background = "#eef5ff";
}

// --------------------------------------------------------------------------
// Construction des contrôles
// --------------------------------------------------------------------------

function buildControls() {
  const svg = $("#svgHost").querySelector("svg");
  if (!svg) return;
  buildColorControls(svg);
  buildTextControls(svg);
  buildLogoControls(svg);
}

function buildColorControls(svg) {
  const list = $("#colorList");
  list.innerHTML = "";
  svg.querySelectorAll('g[data-kind="color"]').forEach(g => {
    list.appendChild(buildColorControl(g, nameOf(g), prettyLabel(nameOf(g))));
  });
  if (!list.children.length) {
    list.innerHTML = `<p class="muted-note">Aucun calque "color_…" dans ce template.</p>`;
  }
}

function buildTextControls(svg) {
  const list = $("#textList");
  list.innerHTML = "";
  svg.querySelectorAll('g[data-kind="text"]').forEach(g => {
    list.appendChild(buildTextControl(g, nameOf(g), prettyLabel(nameOf(g))));
  });
  if (!list.children.length) {
    list.innerHTML = `<p class="muted-note">Aucun calque "texte_…" ou "numero_…" dans ce template.</p>`;
  }
}

function buildLogoControls(svg) {
  const list = $("#logoZonesList");
  list.innerHTML = "";
  const zones = svg.querySelectorAll('g[data-kind="logo"]');
  zones.forEach(g => list.appendChild(buildLogoZoneControl(g)));
  if (!zones.length) {
    list.innerHTML = `<p class="muted-note">Aucun emplacement "logo_…" dans ce template.
      Utilisez « + Ajouter un logo libre » pour en créer un.</p>`;
  }
}

// ---- Color control ----

function buildColorControl(g, id, label) {
  const current = getCurrentFill(g) || "#000000";
  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.setAttribute("data-control-for", id);
  wrap.innerHTML = `
    <label>${escapeHtml(label)}</label>
    <div class="row">
      <input type="color" value="${normalizeColor(current)}">
      <input type="text" value="${escapeHtml(current)}" style="flex:1;">
    </div>`;
  const [picker, hex] = wrap.querySelectorAll("input");
  const apply = (c) => {
    applyFillToGroup(g, c);
    hex.value = c; picker.value = normalizeColor(c);
  };
  picker.addEventListener("input", (e) => apply(e.target.value));
  hex.addEventListener("change", (e) => apply(e.target.value));
  wrap.addEventListener("click", () => selectElement(g));
  return wrap;
}

// ---- Text control (with font, size, weight, position) ----

function buildTextControl(g, id, label) {
  const textNode = g.querySelector("text");
  const current = textNode ? textNode.textContent.trim() : "";
  const fill = textNode ? (textNode.getAttribute("fill") || "#000000") : "#000000";
  const size = textNode ? +(textNode.getAttribute("font-size") || 24) : 24;
  const family = textNode ? (textNode.getAttribute("font-family") || "") : "";
  const weight = textNode ? (textNode.getAttribute("font-weight") || "normal") : "normal";
  const off = getUserOffset(g);

  const wrap = document.createElement("div");
  wrap.className = "field text-block";
  wrap.setAttribute("data-control-for", id);
  wrap.innerHTML = `
    <label class="block-title">${escapeHtml(label)}</label>
    <input type="text" class="text-content" value="${escapeHtml(current)}" placeholder="Saisir le texte…">

    <div class="row" style="margin-top:6px;">
      <select class="font-family" style="flex:1;">
        ${FONT_FAMILIES.map(f =>
          `<option value="${escapeHtml(f.value)}" ${family === f.value ? "selected" : ""}>${escapeHtml(f.label)}</option>`
        ).join("")}
      </select>
    </div>

    <div class="row" style="margin-top:6px;">
      <input type="color" class="text-color" value="${normalizeColor(fill)}" title="Couleur">
      <input type="number" class="text-size" min="6" max="400" value="${size}" style="width:80px;" title="Taille">
      <button type="button" class="ghost small text-bold ${weight === 'bold' || +weight >= 600 ? 'active' : ''}"
              title="Gras">B</button>
    </div>

    <div class="row" style="margin-top:6px;">
      <label class="mini">X</label>
      <input type="number" class="pos-x" value="${off.x}" data-pos-x-for="${escapeHtml(id)}" style="width:70px;">
      <label class="mini">Y</label>
      <input type="number" class="pos-y" value="${off.y}" data-pos-y-for="${escapeHtml(id)}" style="width:70px;">
      <button type="button" class="ghost small reset-pos" title="Recentrer">↺</button>
    </div>
    <p class="muted-note" style="margin:6px 0 0;">Astuce : on peut aussi déplacer le texte au clic-glissé sur le visuel.</p>
  `;

  const textInput  = wrap.querySelector(".text-content");
  const fontSelect = wrap.querySelector(".font-family");
  const colorInput = wrap.querySelector(".text-color");
  const sizeInput  = wrap.querySelector(".text-size");
  const boldBtn    = wrap.querySelector(".text-bold");
  const posX       = wrap.querySelector(".pos-x");
  const posY       = wrap.querySelector(".pos-y");
  const resetPos   = wrap.querySelector(".reset-pos");

  if (textNode) {
    textInput.addEventListener("input", () => textNode.textContent = textInput.value);
    fontSelect.addEventListener("change", () => textNode.setAttribute("font-family", fontSelect.value));
    colorInput.addEventListener("input", () => textNode.setAttribute("fill", colorInput.value));
    sizeInput.addEventListener("input", () => textNode.setAttribute("font-size", sizeInput.value));
    boldBtn.addEventListener("click", () => {
      const isBold = boldBtn.classList.toggle("active");
      textNode.setAttribute("font-weight", isBold ? "bold" : "normal");
    });
  }
  posX.addEventListener("input", () => setUserOffset(g, +posX.value || 0, getUserOffset(g).y));
  posY.addEventListener("input", () => setUserOffset(g, getUserOffset(g).x, +posY.value || 0));
  resetPos.addEventListener("click", () => setUserOffset(g, 0, 0));

  wrap.addEventListener("click", () => selectElement(g));
  return wrap;
}

// ---- Logo zone control (one row per zone) ----

function buildLogoZoneControl(g) {
  const id = nameOf(g);
  const label = prettyLabel(id);
  const placed = g.querySelector("[data-logo-id]");

  const wrap = document.createElement("div");
  wrap.className = "logo-zone-row";
  wrap.setAttribute("data-control-for", id);

  const previewSvg = placed ? new XMLSerializer().serializeToString(placed) : "";
  wrap.innerHTML = `
    <div class="zone-preview">${placed ? previewSvg :
      `<span class="empty">vide</span>`}</div>
    <div class="zone-meta">
      <div class="zone-name">${escapeHtml(label)}</div>
      <div class="zone-state">${placed ? "Logo posé" : "Emplacement vide"}</div>
    </div>
    <div class="zone-actions">
      <button class="ghost small zone-select" title="Sélectionner">◎</button>
      ${placed ? `<button class="danger small zone-remove" title="Retirer le logo">✕</button>` : ""}
      ${id.startsWith("logo_user_") ? `<button class="danger small zone-delete" title="Supprimer cet emplacement">🗑</button>` : ""}
    </div>
  `;

  wrap.querySelector(".zone-select").addEventListener("click", () => selectElement(g));
  const removeBtn = wrap.querySelector(".zone-remove");
  if (removeBtn) removeBtn.addEventListener("click", () => { removePlacedLogo(g); rebuildLogoControls(); });
  const deleteBtn = wrap.querySelector(".zone-delete");
  if (deleteBtn) deleteBtn.addEventListener("click", () => {
    if (confirm("Supprimer cet emplacement libre ?")) { g.remove(); rebuildLogoControls(); }
  });
  wrap.addEventListener("click", () => selectElement(g));
  return wrap;
}

function rebuildLogoControls() {
  const svg = $("#svgHost").querySelector("svg");
  if (svg) buildLogoControls(svg);
}

// --------------------------------------------------------------------------
// Couleurs
// --------------------------------------------------------------------------

function getCurrentFill(g) {
  const candidate = g.querySelector("[fill]") || g.querySelector("path,rect,circle,polygon,ellipse,polyline");
  if (!candidate) return null;
  return candidate.getAttribute("fill") || "#000000";
}

function applyFillToGroup(g, color) {
  g.setAttribute("fill", color);
  g.querySelectorAll("path,rect,circle,polygon,ellipse,polyline").forEach(node => {
    node.setAttribute("fill", color);
  });
}

function normalizeColor(c) {
  if (!c) return "#000000";
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    return "#" + c.slice(1).split("").map(ch => ch + ch).join("");
  }
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillStyle = c;
  return ctx.fillStyle;
}

// --------------------------------------------------------------------------
// Logos : bibliothèque
// --------------------------------------------------------------------------

function renderLogosGrid() {
  const grid = $("#logosGrid");
  const q = ($("#logoSearch").value || "").toLowerCase();
  const cat = $("#categoryFilter").value;
  const filtered = state.logos.filter(l => {
    const matchQ = !q || (l.name || "").toLowerCase().includes(q);
    const matchC = !cat || l.category === cat;
    return matchQ && matchC;
  });
  grid.innerHTML = filtered.map(l => `
    <div class="logo-tile" draggable="true" data-logo-id="${l.id}" title="${escapeHtml(l.name)}">
      ${l.svgContent}
      <span class="tile-name">${escapeHtml(l.name)}</span>
    </div>
  `).join("");

  grid.querySelectorAll(".logo-tile").forEach(tile => {
    tile.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("application/x-miki-logo", tile.dataset.logoId);
      e.dataTransfer.effectAllowed = "copy";
    });
    tile.addEventListener("click", () => {
      if (state.selectedEl && state.selectedEl.getAttribute("data-kind") === "logo") {
        const logo = state.logos.find(l => l.id == tile.dataset.logoId);
        if (logo) { placeLogoInto(state.selectedEl, logo); rebuildLogoControls(); }
      } else {
        showToast("Cliquez d'abord sur un emplacement « logo_… »");
      }
    });
  });
}

function attachDropHandlers(slot) {
  slot.addEventListener("dragover", (e) => {
    if (e.dataTransfer.types.includes("application/x-miki-logo")) {
      e.preventDefault();
      slot.classList.add("drag-over");
    }
  });
  slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
  slot.addEventListener("drop", (e) => {
    e.preventDefault();
    slot.classList.remove("drag-over");
    const id = e.dataTransfer.getData("application/x-miki-logo");
    const logo = state.logos.find(l => l.id == id);
    if (logo) { placeLogoInto(slot, logo); rebuildLogoControls(); }
  });
}

function placeLogoInto(slot, logo) {
  const bbox = slot.getBBox();
  const parser = new DOMParser();
  const doc = parser.parseFromString(logo.svgContent, "image/svg+xml");
  const inner = doc.documentElement;
  if (!inner || inner.tagName.toLowerCase() !== "svg") {
    showToast("Logo invalide"); return;
  }
  const vb = (inner.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
  let srcW = vb[2] || parseFloat(inner.getAttribute("width")) || 100;
  let srcH = vb[3] || parseFloat(inner.getAttribute("height")) || 100;
  const scale = Math.min(bbox.width / srcW, bbox.height / srcH);
  const tx = bbox.x + (bbox.width  - srcW * scale) / 2;
  const ty = bbox.y + (bbox.height - srcH * scale) / 2;

  while (slot.firstChild) slot.removeChild(slot.firstChild);
  // Le user-offset du slot doit être conservé : on ne touche pas à son transform.
  const inner_g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  inner_g.setAttribute("transform", `translate(${tx} ${ty}) scale(${scale})`);
  inner_g.setAttribute("data-logo-id", logo.id);
  Array.from(inner.childNodes).forEach(n => {
    if (n.nodeType === 1) inner_g.appendChild(document.importNode(n, true));
  });
  slot.appendChild(inner_g);
  makeDraggable(slot, inner_g);
  selectElement(slot);
  showToast(`Logo « ${logo.name} » placé`);
}

function removePlacedLogo(slot) {
  const placed = slot.querySelectorAll("[data-logo-id]");
  placed.forEach(p => p.remove());
  // Repose un placeholder visuel si le slot est maintenant vide
  if (!slot.firstChild) {
    const bbox = slot.dataset.placeholderBox ?
      JSON.parse(slot.dataset.placeholderBox) :
      { x: 0, y: 0, width: 80, height: 80 };
    const ph = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    ph.setAttribute("x", bbox.x); ph.setAttribute("y", bbox.y);
    ph.setAttribute("width", bbox.width || 80); ph.setAttribute("height", bbox.height || 80);
    ph.setAttribute("fill", "#ffffff");
    ph.setAttribute("stroke", "#999"); ph.setAttribute("stroke-dasharray", "4 4");
    ph.setAttribute("data-placeholder", "true");
    slot.appendChild(ph);
  }
  showToast("Logo retiré");
}

// --------------------------------------------------------------------------
// Logo libre (zone créée à la volée)
// --------------------------------------------------------------------------

function addFreeLogo() {
  const svg = $("#svgHost").querySelector("svg");
  if (!svg) { showToast("Chargez d'abord un template"); return; }
  const vb = (svg.getAttribute("viewBox") || "0 0 600 600").split(/[\s,]+/).map(Number);
  const cx = (vb[2] || 600) / 2, cy = (vb[3] || 600) / 2;
  const W = 100, H = 100;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(SVG_NS, "g");
  state.freeLogoCounter++;
  const id = `logo_user_${state.freeLogoCounter}`;
  g.setAttribute("id", id);
  g.setAttribute("data-name", id);

  const ph = document.createElementNS(SVG_NS, "rect");
  ph.setAttribute("x", cx - W / 2); ph.setAttribute("y", cy - H / 2);
  ph.setAttribute("width", W); ph.setAttribute("height", H);
  ph.setAttribute("fill", "#ffffff");
  ph.setAttribute("stroke", "#3498db");
  ph.setAttribute("stroke-dasharray", "5 5");
  ph.setAttribute("data-placeholder", "true");
  g.appendChild(ph);

  // Mémoriser la boîte initiale pour les futurs « retirer logo »
  g.dataset.placeholderBox = JSON.stringify({ x: cx - W/2, y: cy - H/2, width: W, height: H });

  svg.appendChild(g);
  // Décoration (data-kind=logo + handlers + drag)
  g.setAttribute("data-editable", "logo");
  g.setAttribute("data-kind", "logo");
  g.setAttribute("data-drop-target", "true");
  attachDropHandlers(g);
  g.addEventListener("click", (e) => { e.stopPropagation(); selectElement(g); });
  makeGroupDraggable(g);

  selectElement(g);
  switchTab("logos");
  rebuildLogoControls();
  showToast("Emplacement libre créé — glissez un logo dessus");
}

// --------------------------------------------------------------------------
// Drag intra-SVG
// --------------------------------------------------------------------------

/** Rend le groupe entier déplaçable (utilise setUserOffset, préserve le transform AI). */
function makeGroupDraggable(g) {
  let dragging = false, startX = 0, startY = 0, baseX = 0, baseY = 0;
  const svg = () => $("#svgHost").querySelector("svg");

  function pt(evt) {
    const s = svg(); const p = s.createSVGPoint();
    p.x = evt.clientX; p.y = evt.clientY;
    return p.matrixTransform(s.getScreenCTM().inverse());
  }

  g.addEventListener("mousedown", (e) => {
    // Ne pas démarrer un drag depuis un sous-élément déjà draggable (logo placé)
    if (e.target.closest("[data-logo-id]")) return;
    e.stopPropagation();
    dragging = true;
    const p = pt(e); startX = p.x; startY = p.y;
    const off = getUserOffset(g);
    baseX = off.x; baseY = off.y;
    g.style.opacity = .85;
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const p = pt(e);
    setUserOffset(g, baseX + (p.x - startX), baseY + (p.y - startY));
  });
  document.addEventListener("mouseup", () => {
    if (dragging) { dragging = false; g.style.opacity = 1; }
  });
}

/** Déplace un sous-élément (ex. le logo posé à l'intérieur d'un slot). */
function makeDraggable(slot, movable) {
  let dragging = false, startX = 0, startY = 0, baseX = 0, baseY = 0;
  movable.style.cursor = "move";
  const svg = $("#svgHost").querySelector("svg");

  function pt(evt) {
    const p = svg.createSVGPoint();
    p.x = evt.clientX; p.y = evt.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  function parseTr(node) {
    const t = node.getAttribute("transform") || "";
    const m = t.match(/translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/);
    return { x: m ? +m[1] : 0, y: m ? +m[2] : 0 };
  }
  function setTr(node, x, y) {
    const cur = node.getAttribute("transform") || "";
    if (cur.includes("translate")) {
      node.setAttribute("transform", cur.replace(/translate\([^)]*\)/, `translate(${x} ${y})`));
    } else {
      node.setAttribute("transform", `translate(${x} ${y}) ${cur}`.trim());
    }
  }

  movable.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    dragging = true;
    const p = pt(e); startX = p.x; startY = p.y;
    const tr = parseTr(movable); baseX = tr.x; baseY = tr.y;
    movable.style.opacity = .85;
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const p = pt(e);
    setTr(movable, baseX + (p.x - startX), baseY + (p.y - startY));
  });
  document.addEventListener("mouseup", () => {
    if (dragging) { dragging = false; movable.style.opacity = 1; }
  });
}

// --------------------------------------------------------------------------
// Tabs
// --------------------------------------------------------------------------

function switchTab(name) {
  $$("#leftTabs .tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  $$(".tab-panel").forEach(p => p.classList.toggle("active", p.dataset.tabPanel === name));
}

// --------------------------------------------------------------------------
// Keyboard
// --------------------------------------------------------------------------

document.addEventListener("keydown", (e) => {
  if ((e.key === "Delete" || e.key === "Backspace") && state.selectedEl &&
      state.selectedEl.getAttribute("data-kind") === "logo") {
    // Ne pas intercepter quand l'utilisateur tape dans un input
    if (["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) return;
    removePlacedLogo(state.selectedEl);
    rebuildLogoControls();
  }
});

// --------------------------------------------------------------------------
// Export / panier
// --------------------------------------------------------------------------

function currentSvgString() {
  const svg = $("#svgHost").querySelector("svg");
  if (!svg) return "";
  const clone = svg.cloneNode(true);
  clone.querySelectorAll("[data-editable]").forEach(n => {
    n.removeAttribute("data-editable");
    n.removeAttribute("data-kind");
    n.removeAttribute("data-drop-target");
    n.classList.remove("selected");
  });
  clone.querySelectorAll("[data-placeholder]").forEach(n => n.remove());
  return new XMLSerializer().serializeToString(clone);
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function exportPng() {
  const svgStr = currentSvgString();
  const svg = $("#svgHost").querySelector("svg");
  const vb = (svg.getAttribute("viewBox") || "0 0 600 600").split(/[\s,]+/).map(Number);
  const w = vb[2] || 600, h = vb[3] || 600;
  const img = new Image();
  const url = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w * 2; canvas.height = h * 2;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u; a.download = "configuration.png"; a.click();
      URL.revokeObjectURL(u);
    }, "image/png");
  };
  img.src = url;
}

function addToCart() {
  const svgStr = currentSvgString();
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: "miki:add-to-cart",
      templateId: state.currentTemplateId,
      svg: svgStr,
    }, "*");
    showToast("Configuration envoyée à Shopify");
  } else {
    downloadBlob(svgStr, "configuration.svg", "image/svg+xml");
    showToast("Hors Shopify : SVG téléchargé");
  }
}

// --------------------------------------------------------------------------
// Wiring
// --------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  $("#templateSelect").addEventListener("change", (e) => loadTemplate(e.target.value));
  $("#resetBtn").addEventListener("click", () => {
    if (state.originalSvg) { renderSvg(state.originalSvg); buildControls(); }
  });
  $("#exportBtn").addEventListener("click", () =>
    downloadBlob(currentSvgString(), "configuration.svg", "image/svg+xml"));
  $("#exportPngBtn").addEventListener("click", exportPng);
  $("#addToCartBtn").addEventListener("click", addToCart);
  $("#addFreeLogoBtn").addEventListener("click", addFreeLogo);
  $("#logoSearch").addEventListener("input", renderLogosGrid);
  $("#categoryFilter").addEventListener("change", renderLogosGrid);

  // Onglets
  $$("#leftTabs .tab").forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)));

  $("#stage").addEventListener("click", (e) => {
    if (!e.target.closest("[data-editable]")) {
      $$(".stage [data-editable]").forEach(n => n.classList.remove("selected"));
      state.selectedEl = null;
    }
  });

  await Promise.all([loadTemplates(), loadLogos()]);
});
