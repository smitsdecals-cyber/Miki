/* eslint-disable */
/**
 * Configurateur SVG Miki
 *
 * Convention de nommage des calques Illustrator (l'export Illustrator
 * place le nom du calque dans l'attribut id du <g>):
 *   color_xxx  -> zone dont on peut modifier la couleur (fill)
 *   texte_xxx  -> zone de texte modifiable
 *   logo_xxx   -> emplacement de logo (clic / drag&drop)
 *
 * Tous les <g> dont l'id (ou data-name) commence par l'un de ces
 * préfixes sont détectés automatiquement et exposés dans l'UI.
 */

const API = (path) => `/api${path}`;

const state = {
  templates: [],
  logos: [],
  currentTemplateId: null,
  originalSvg: null,
  selectedEl: null,
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
function isText(node)  { return nameOf(node).toLowerCase().startsWith("texte") ||
                                nameOf(node).toLowerCase().startsWith("text"); }
function isLogo(node)  { return nameOf(node).toLowerCase().startsWith("logo"); }

function prettyLabel(rawId) {
  return rawId.replace(/^(color|texte|text|logo)_?/i, "").replace(/[_-]/g, " ") || rawId;
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

/**
 * Parcourt les <g> du SVG et ajoute :
 *   - data-editable + data-kind (color / text / logo)
 *   - listeners de sélection
 *   - drop zones pour les logos
 */
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
    });

    if (kind === "logo") {
      g.setAttribute("data-drop-target", "true");
      attachDropHandlers(g);
    }
  });
}

function selectElement(el) {
  $$(".stage [data-editable]").forEach(n => n.classList.remove("selected"));
  el.classList.add("selected");
  state.selectedEl = el;

  // Surligne la ligne correspondante dans le panneau de gauche
  $$("[data-control-for]").forEach(n => n.style.background = "");
  const id = nameOf(el);
  const ctl = document.querySelector(`[data-control-for="${cssEscape(id)}"]`);
  if (ctl) ctl.style.background = "#eef5ff";
}

// --------------------------------------------------------------------------
// Construction des contrôles à partir du SVG courant
// --------------------------------------------------------------------------

function buildControls() {
  const svg = $("#svgHost").querySelector("svg");
  if (!svg) return;
  const colorList = $("#colorList");
  const textList = $("#textList");
  colorList.innerHTML = "";
  textList.innerHTML = "";

  svg.querySelectorAll("g[data-editable]").forEach(g => {
    const kind = g.getAttribute("data-kind");
    const id = nameOf(g);
    const label = prettyLabel(id);
    if (kind === "color") colorList.appendChild(buildColorControl(g, id, label));
    else if (kind === "text") textList.appendChild(buildTextControl(g, id, label));
  });
}

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
    hex.value = c;
    picker.value = normalizeColor(c);
  };
  picker.addEventListener("input", (e) => apply(e.target.value));
  hex.addEventListener("change", (e) => apply(e.target.value));
  wrap.addEventListener("click", () => selectElement(g));
  return wrap;
}

function buildTextControl(g, id, label) {
  const textNode = g.querySelector("text");
  const current = textNode ? textNode.textContent.trim() : "";
  const fill = textNode ? (textNode.getAttribute("fill") || "#000000") : "#000000";

  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.setAttribute("data-control-for", id);
  wrap.innerHTML = `
    <label>${escapeHtml(label)}</label>
    <input type="text" value="${escapeHtml(current)}" placeholder="Saisir le texte…">
    <div class="row" style="margin-top:6px;">
      <input type="color" value="${normalizeColor(fill)}" title="Couleur du texte">
      <input type="number" min="6" max="200" value="${textNode ? +(textNode.getAttribute('font-size')||24) : 24}"
             style="width:80px;" title="Taille">
    </div>`;
  const [textInput, colorInput, sizeInput] = wrap.querySelectorAll("input");
  textInput.addEventListener("input", () => {
    if (textNode) textNode.textContent = textInput.value;
  });
  colorInput.addEventListener("input", () => {
    if (textNode) textNode.setAttribute("fill", colorInput.value);
  });
  sizeInput.addEventListener("input", () => {
    if (textNode) textNode.setAttribute("font-size", sizeInput.value);
  });
  wrap.addEventListener("click", () => selectElement(g));

  // Permettre le drag du groupe texte
  if (textNode) makeDraggable(g, textNode);
  return wrap;
}

// --------------------------------------------------------------------------
// Couleurs
// --------------------------------------------------------------------------

function getCurrentFill(g) {
  // On prend le fill du premier élément peint trouvé
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
  // best-effort fallback
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillStyle = c;
  return ctx.fillStyle;
}

// --------------------------------------------------------------------------
// Logos : bibliothèque, click, drag & drop
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
      // Si une zone logo est sélectionnée, on l'y place
      if (state.selectedEl && state.selectedEl.getAttribute("data-kind") === "logo") {
        const logo = state.logos.find(l => l.id == tile.dataset.logoId);
        if (logo) placeLogoInto(state.selectedEl, logo);
      } else {
        showToast("Cliquez d'abord sur un emplacement « logo_… » du visuel");
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
    if (logo) placeLogoInto(slot, logo);
  });
}

/**
 * Remplace le contenu d'une zone "logo_*" par le logo choisi, en
 * conservant la position/taille de la boîte d'origine.
 */
function placeLogoInto(slot, logo) {
  // Mesurer la boîte d'origine AVANT de toucher au DOM
  const bbox = slot.getBBox();

  // Parser le SVG du logo pour récupérer ses éléments enfants
  const parser = new DOMParser();
  const doc = parser.parseFromString(logo.svgContent, "image/svg+xml");
  const inner = doc.documentElement;
  if (!inner || inner.tagName.toLowerCase() !== "svg") {
    showToast("Logo invalide");
    return;
  }

  // viewBox du logo source pour calculer l'échelle
  const vb = (inner.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
  let srcW = vb[2] || parseFloat(inner.getAttribute("width")) || 100;
  let srcH = vb[3] || parseFloat(inner.getAttribute("height")) || 100;

  const scale = Math.min(bbox.width / srcW, bbox.height / srcH);
  const tx = bbox.x + (bbox.width  - srcW * scale) / 2;
  const ty = bbox.y + (bbox.height - srcH * scale) / 2;

  // Vide la zone et y insère un nouveau <g> contenant le logo
  while (slot.firstChild) slot.removeChild(slot.firstChild);
  slot.removeAttribute("transform"); // on recompose le transform via l'enfant
  const inner_g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  inner_g.setAttribute("transform", `translate(${tx} ${ty}) scale(${scale})`);
  inner_g.setAttribute("data-logo-id", logo.id);

  // Copier les enfants du SVG source
  Array.from(inner.childNodes).forEach(n => {
    if (n.nodeType === 1) inner_g.appendChild(document.importNode(n, true));
  });
  slot.appendChild(inner_g);

  // Le drag du logo dans le SVG une fois posé
  makeDraggable(slot, inner_g);

  // Bouton "supprimer le logo" via clic + touche Suppr
  selectElement(slot);
  showToast(`Logo « ${logo.name} » placé`);
}

// --------------------------------------------------------------------------
// Drag à l'intérieur du SVG (déplacement de texte ou de logo posé)
// --------------------------------------------------------------------------

function makeDraggable(slot, movable) {
  let dragging = false, startX = 0, startY = 0, baseX = 0, baseY = 0;
  movable.style.cursor = "move";

  const svg = $("#svgHost").querySelector("svg");

  function getMouseSvgPoint(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function parseTranslate(node) {
    const t = node.getAttribute("transform") || "";
    const m = t.match(/translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/);
    return m ? { x: +m[1], y: +m[2], rest: t.replace(m[0] + ")", "").trim() } :
               { x: 0, y: 0, rest: t };
  }
  function setTranslate(node, x, y) {
    const cur = node.getAttribute("transform") || "";
    if (cur.includes("translate")) {
      node.setAttribute("transform",
        cur.replace(/translate\([^)]*\)/, `translate(${x} ${y})`));
    } else {
      node.setAttribute("transform", `translate(${x} ${y}) ${cur}`.trim());
    }
  }

  movable.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    dragging = true;
    const p = getMouseSvgPoint(e);
    startX = p.x; startY = p.y;
    const tr = parseTranslate(movable);
    baseX = tr.x; baseY = tr.y;
    movable.style.opacity = .85;
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const p = getMouseSvgPoint(e);
    setTranslate(movable, baseX + (p.x - startX), baseY + (p.y - startY));
  });
  document.addEventListener("mouseup", () => {
    if (dragging) { dragging = false; movable.style.opacity = 1; }
  });
}

// --------------------------------------------------------------------------
// Touches : Suppr efface le logo de la zone sélectionnée
// --------------------------------------------------------------------------

document.addEventListener("keydown", (e) => {
  if ((e.key === "Delete" || e.key === "Backspace") && state.selectedEl &&
      state.selectedEl.getAttribute("data-kind") === "logo") {
    // Repose un placeholder vide
    while (state.selectedEl.firstChild) state.selectedEl.removeChild(state.selectedEl.firstChild);
    const ph = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const bbox = state.selectedEl.getBBox?.() || { x: 0, y: 0, width: 80, height: 80 };
    ph.setAttribute("x", bbox.x); ph.setAttribute("y", bbox.y);
    ph.setAttribute("width", bbox.width || 80); ph.setAttribute("height", bbox.height || 80);
    ph.setAttribute("fill", "#ffffff");
    ph.setAttribute("stroke", "#999"); ph.setAttribute("stroke-dasharray", "4 4");
    state.selectedEl.appendChild(ph);
    showToast("Logo retiré");
  }
});

// --------------------------------------------------------------------------
// Export / panier
// --------------------------------------------------------------------------

function currentSvgString() {
  const svg = $("#svgHost").querySelector("svg");
  if (!svg) return "";
  const clone = svg.cloneNode(true);
  // retire les attributs d'édition
  clone.querySelectorAll("[data-editable]").forEach(n => {
    n.removeAttribute("data-editable");
    n.removeAttribute("data-kind");
    n.removeAttribute("data-drop-target");
    n.classList.remove("selected");
  });
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

/**
 * Hook Shopify : envoie la config au store parent. Côté Shopify, écouter
 * `window.addEventListener('message', ...)` sur la page produit pour
 * récupérer le SVG/PNG et l'attacher comme propriété de ligne du panier.
 */
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
// Utils
// --------------------------------------------------------------------------

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

function cssEscape(s) {
  return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/"/g, '\\"');
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
  $("#logoSearch").addEventListener("input", renderLogosGrid);
  $("#categoryFilter").addEventListener("change", renderLogosGrid);

  // Clic dans la scène hors d'une zone : désélectionner
  $("#stage").addEventListener("click", (e) => {
    if (!e.target.closest("[data-editable]")) {
      $$(".stage [data-editable]").forEach(n => n.classList.remove("selected"));
      state.selectedEl = null;
    }
  });

  await Promise.all([loadTemplates(), loadLogos()]);
});
