/* eslint-disable */
const API = (p) => `/api${p}`;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function showToast(msg, ms = 2500) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), ms);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

// -------------------- Tabs --------------------
$$(".tab").forEach(t => {
  t.addEventListener("click", () => {
    $$(".tab").forEach(x => x.classList.remove("active"));
    $$(".tab-panel").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    document.querySelector(`[data-tab-panel="${t.dataset.tab}"]`).classList.add("active");
  });
});

// -------------------- Logos --------------------
let logoState = [];

async function refreshLogos() {
  const r = await fetch(API("/logos?full=true"));
  logoState = await r.json();
  renderLogosAdmin();
}

function renderLogosAdmin() {
  const q = ($("#adminLogoSearch").value || "").toLowerCase();
  const items = logoState.filter(l => !q || (l.name || "").toLowerCase().includes(q));
  $("#logosAdmin").innerHTML = items.map(l => `
    <div class="admin-item" data-id="${l.id}">
      <div class="preview">${l.svgContent}</div>
      <div class="meta">
        <div class="name">${escapeHtml(l.name)}</div>
        <div class="cat">${escapeHtml(l.category || "—")}</div>
      </div>
      <div class="actions">
        <button class="ghost small" data-act="rename">Renommer</button>
        <button class="danger small" data-act="delete">Supprimer</button>
      </div>
    </div>`).join("") || `<p style="color:#888">Aucun logo</p>`;

  $$("#logosAdmin .admin-item").forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-act="delete"]').addEventListener("click", () => deleteLogo(id));
    row.querySelector('[data-act="rename"]').addEventListener("click", () => renameLogo(id));
  });
}

async function deleteLogo(id) {
  if (!confirm("Supprimer ce logo ?")) return;
  const r = await fetch(API(`/logos/${id}`), { method: "DELETE" });
  if (r.ok) { showToast("Logo supprimé"); refreshLogos(); }
  else showToast("Échec de la suppression");
}

async function renameLogo(id) {
  const cur = logoState.find(l => l.id == id);
  const name = prompt("Nouveau nom :", cur?.name || "");
  if (!name) return;
  const category = prompt("Catégorie :", cur?.category || "");
  const r = await fetch(API(`/logos/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, category }),
  });
  if (r.ok) { showToast("Logo modifié"); refreshLogos(); }
  else showToast("Échec");
}

$("#logoForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const r = await fetch(API("/logos"), { method: "POST", body: fd });
  if (r.ok) { showToast("Logo ajouté"); e.target.reset(); refreshLogos(); }
  else {
    const err = await r.json().catch(() => ({}));
    showToast(err.error || "Échec de l'ajout");
  }
});

$("#adminLogoSearch").addEventListener("input", renderLogosAdmin);

// -------------------- Templates --------------------
let templateState = [];

async function refreshTemplates() {
  const r = await fetch(API("/templates?full=true"));
  templateState = await r.json();
  $("#templatesAdmin").innerHTML = templateState.map(t => `
    <div class="admin-item" data-id="${t.id}">
      <div class="preview">${t.svgContent}</div>
      <div class="meta">
        <div class="name">${escapeHtml(t.name)}</div>
        <div class="cat">${escapeHtml(t.description || "—")}</div>
      </div>
      <div class="actions">
        <button class="danger small" data-act="delete">Supprimer</button>
      </div>
    </div>`).join("") || `<p style="color:#888">Aucun template</p>`;

  $$("#templatesAdmin .admin-item").forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-act="delete"]').addEventListener("click", async () => {
      if (!confirm("Supprimer ce template ?")) return;
      const r = await fetch(API(`/templates/${id}`), { method: "DELETE" });
      if (r.ok) { showToast("Template supprimé"); refreshTemplates(); }
    });
  });
}

$("#templateForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const r = await fetch(API("/templates"), { method: "POST", body: fd });
  if (r.ok) { showToast("Template ajouté"); e.target.reset(); refreshTemplates(); }
  else {
    const err = await r.json().catch(() => ({}));
    showToast(err.error || "Échec de l'ajout");
  }
});

// -------------------- Init --------------------
document.addEventListener("DOMContentLoaded", () => {
  refreshLogos();
  refreshTemplates();
});
