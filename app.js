"use strict";

let vehicles = [];

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const integer = new Intl.NumberFormat("es-MX");

const state = {
  search: "",
  minPrice: 400,
  maxPrice: 1500,
  brands: new Set(),
  types: new Set(),
  statuses: new Set(),
  favorites: loadFavorites(),
  favoritesOnly: false,
  sort: "featured",
};

const grid = document.querySelector("#vehicleGrid");
const emptyState = document.querySelector("#emptyState");
const resultCount = document.querySelector("#resultCount");
const resultCopy = document.querySelector("#resultCopy");
const favoriteCount = document.querySelector("#favoriteCount");
const favoritesOnlyButton = document.querySelector("#favoritesOnly");
const searchDrawer = document.querySelector("#searchDrawer");
const searchInput = document.querySelector("#searchInput");
const filterPanel = document.querySelector("#filterPanel");
const filterScrim = document.querySelector("#filterScrim");
const minPriceInput = document.querySelector("#minPrice");
const maxPriceInput = document.querySelector("#maxPrice");
const minPriceLabel = document.querySelector("#minPriceLabel");
const maxPriceLabel = document.querySelector("#maxPriceLabel");
const activeFilters = document.querySelector("#activeFilters");
const vehicleDialog = document.querySelector("#vehicleDialog");
const dialogContent = document.querySelector("#dialogContent");
const mobileNav = document.querySelector("#mobileNav");

let quoteDialog;
let scheduleDialog;
let toastTimer;

function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem("nexora-favorites") || "[]");
    return new Set(saved.filter((id) => Number.isInteger(id)));
  } catch (_error) {
    return new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem("nexora-favorites", JSON.stringify([...state.favorites]));
  } catch (_error) {
    // El catalogo sigue funcionando aunque el navegador bloquee localStorage.
  }
}

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function compactPrice(value) {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} M`;
  }
  return `$${value} mil`;
}

function icon(name) {
  const paths = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path>',
    gauge: '<path d="M4.9 19a9 9 0 1 1 14.2 0"></path><path d="M12 13l3-3"></path><path d="M12 4v2M5.6 7.6 7 9M18.4 7.6 17 9"></path>',
    gear: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"></path>',
    fuel: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"></path><path d="M3 21h14M6 8h8M15 7h2l3 3v7a2 2 0 0 1-4 0v-3"></path>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"></path>',
    shield: '<path d="M12 3 5 6v5c0 4.5 2.9 8.3 7 10 4.1-1.7 7-5.5 7-10V6l-7-3Z"></path><path d="m9 12 2 2 4-4"></path>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18M7 15h3"></path>',
    calendar: '<path d="M8 2v4M16 2v4M3 10h18"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function fromApiVehicle(vehicle) {
  return {
    id: vehicle.id,
    name: `${vehicle.marca} ${vehicle.modelo}`,
    brand: vehicle.marca,
    model: vehicle.modelo,
    year: vehicle.año,
    price: vehicle.precio,
    mileage: vehicle.kilometraje,
    type: vehicle.carrocería,
    transmission: vehicle.transmisión,
    engine: vehicle.motor,
    color: vehicle.color,
    status: vehicle.condición,
    image: vehicle.imagenes?.find(x => /ilustrativa/.test(x.etiqueta))?.ruta || vehicle.imagen,
    images: vehicle.imagenes || [{ ruta: vehicle.imagen, etiqueta: "Vista del vehículo" }],
    featured: vehicle.destacado,
    previousPrice: vehicle.precio_anterior,
    offer: vehicle.oferta,
    description: vehicle.descripción,
    availability: vehicle.disponibilidad,
    registeredAt: vehicle.fecha_registro,
    glow: vehicle.glow || "rgba(255, 79, 46, .24)",
  };
}

async function fetchJson(url, options = {}) {
  const customerRoute = /^\/api\/(account\/|quotes(?:$|\/)|test-drives(?:$|\/)|auth\/password)/.test(url);
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(currentUser && customerRoute ? { "X-Nexora-User": String(currentUser.id) } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = Object.assign(new Error(data.error || "No se pudo completar la solicitud."), { status: response.status, code: data.code });
    if (customerRoute && currentUser && (response.status === 401 || data.code === 'SESSION_CHANGED')) resetCustomerView(error.message);
    throw error;
  }
  return data;
}

async function loadVehicles() {
  grid.innerHTML = '<div class="catalog-loading">Cargando inventario...</div>';
  try {
    const data = await fetchJson("/api/vehicles");
    vehicles = data.map(fromApiVehicle);
    updateFilterCounts();
    syncPriceBounds();
    updatePriceUI();
    renderVehicles();
    renderFeatured();
  } catch (error) {
    grid.innerHTML = "";
    emptyState.hidden = false;
    showToast("Error al cargar", error.message);
  }
}

function updateFilterCounts() {
  const groups = { brand: "brand", type: "type", status: "status" };
  Object.entries(groups).forEach(([name, key]) => {
    const fieldset = document.querySelector(`.filter-panel input[name="${name}"]`)?.closest("fieldset");
    if (!fieldset) return;
    const legend = fieldset.querySelector("legend").outerHTML;
    const values = [...new Set(vehicles.map(v => v[key]))].sort((a,b) => a.localeCompare(b,"es"));
    fieldset.innerHTML = legend + values.map(value => `<label class="check-row"><input type="checkbox" name="${name}" value="${escapeHtml(value)}"><i></i><span>${escapeHtml(value)}</span><b>${vehicles.filter(v => v[key] === value).length}</b></label>`).join("");
  });
}

function syncPriceBounds() {
  if (!vehicles.length) return;
  const prices = vehicles.map((vehicle) => Math.round(vehicle.price / 1000));
  const min = Math.max(0, Math.floor(Math.min(...prices) / 25) * 25);
  const max = Math.ceil(Math.max(...prices) / 25) * 25;
  minPriceInput.min = String(min);
  minPriceInput.max = String(max);
  maxPriceInput.min = String(min);
  maxPriceInput.max = String(max);
  state.minPrice = min;
  state.maxPrice = max;
  minPriceInput.value = String(min);
  maxPriceInput.value = String(max);
}

function getVisibleVehicles() {
  const query = normalize(state.search.trim());
  let list = vehicles.filter((vehicle) => {
    const priceInThousands = vehicle.price / 1000;
    const matchesText = !query || normalize(`${vehicle.brand} ${vehicle.name} ${vehicle.type}`).includes(query);
    const matchesBrand = state.brands.size === 0 || state.brands.has(vehicle.brand);
    const matchesType = state.types.size === 0 || state.types.has(vehicle.type);
    const matchesStatus = state.statuses.size === 0 || state.statuses.has(vehicle.status);
    const matchesPrice = priceInThousands >= state.minPrice && priceInThousands <= state.maxPrice;
    const matchesFavorite = !state.favoritesOnly || state.favorites.has(vehicle.id);
    return matchesText && matchesBrand && matchesType && matchesStatus && matchesPrice && matchesFavorite;
  });

  list = [...list].sort((a, b) => {
    switch (state.sort) {
      case "price-asc": return a.price - b.price;
      case "price-desc": return b.price - a.price;
      case "year-desc": return b.year - a.year || a.mileage - b.mileage;
      case "mileage-asc": return a.mileage - b.mileage;
      default: return Number(b.featured) - Number(a.featured) || a.id - b.id;
    }
  });

  return list;
}

function cardTemplate(vehicle, index) {
  const selected = state.favorites.has(vehicle.id);
  return `
    <article class="vehicle-card" style="--car-glow:${escapeHtml(vehicle.glow)}; animation-delay:${index * 65}ms" data-card="${vehicle.id}" data-details="${vehicle.id}" role="button" tabindex="0" aria-label="Abrir detalle de ${escapeHtml(vehicle.name)}">
      <div class="card-topline">
        <span class="status-badge${vehicle.previousPrice ? " offer-badge" : ""}">${escapeHtml(vehicle.previousPrice ? vehicle.offer || "Oferta" : vehicle.status)}</span>
        <button class="favorite-button${selected ? " selected" : ""}" type="button" data-favorite="${vehicle.id}" aria-label="${selected ? "Quitar de" : "Agregar a"} favoritos: ${escapeHtml(vehicle.name)}" aria-pressed="${selected}">
          ${icon("heart")}
        </button>
      </div>
      <div class="car-stage">
        <img src="${escapeHtml(vehicle.image)}" alt="${escapeHtml(vehicle.name)}" loading="lazy" />
        <div class="card-photo-controls"><button type="button" data-card-photo="${vehicle.id}" data-step="-1" aria-label="Foto anterior de ${escapeHtml(vehicle.name)}">‹</button><span data-photo-count>${vehicle.images.findIndex(x => x.ruta === vehicle.image) + 1} / ${vehicle.images.length}</span><button type="button" data-card-photo="${vehicle.id}" data-step="1" aria-label="Siguiente foto de ${escapeHtml(vehicle.name)}">›</button></div>
      </div>
      <div class="card-body">
        <div class="vehicle-meta"><span>${escapeHtml(vehicle.brand)}</span><span>${vehicle.year}</span></div>
        <h2>${escapeHtml(vehicle.name)}</h2>
        <div class="spec-row">
          <div class="spec">${icon("gauge")}<span>${integer.format(vehicle.mileage)} km</span></div>
          <div class="spec">${icon("gear")}<span>${escapeHtml(vehicle.transmission)}</span></div>
          <div class="spec">${icon("fuel")}<span>${escapeHtml(vehicle.engine)}</span></div>
        </div>
        <div class="card-footer">
          <div class="price">${vehicle.previousPrice ? `<del>${money.format(vehicle.previousPrice)}</del>` : ""}<strong>${money.format(vehicle.price)}</strong><small>Precio de contado</small></div>
          <button class="details-button" type="button" data-details="${vehicle.id}">Abrir auto ${icon("arrow")}</button>
        </div>
      </div>
    </article>`;
}

function renderVehicles() {
  const visible = getVisibleVehicles();
  resultCount.textContent = visible.length;
  resultCopy.lastChild.textContent = ` vehículo${visible.length === 1 ? "" : "s"} disponible${visible.length === 1 ? "" : "s"}`;
  emptyState.hidden = visible.length !== 0;
  grid.hidden = visible.length === 0;
  grid.innerHTML = visible.map(cardTemplate).join("");
  updateFavoriteSummary();
  renderFilterChips();
  revealCards();
  attachCardEffects();
}

function revealCards() {
  const cards = [...document.querySelectorAll(".vehicle-card")];
  if (!("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("revealed"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  cards.forEach((card) => observer.observe(card));
}

function attachCardEffects() {
  document.querySelectorAll(".vehicle-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
  });
}

async function toggleFavorite(id) {
  if (staffPreview) return;
  const vehicle = vehicles.find((item) => item.id === id);
  if (!vehicle) return;

  const selectedBefore = state.favorites.has(id);
  try {
    if (currentUser) await fetchJson(`/api/account/favorites/${id}`, { method: selectedBefore ? "DELETE" : "PUT" });
    if (selectedBefore) state.favorites.delete(id); else state.favorites.add(id);
    if (!currentUser) saveFavorites();
    showToast(selectedBefore ? "Eliminado de favoritos" : "Guardado en favoritos", vehicle.name);
  } catch (error) { showToast("No se pudo guardar", error.message); return; }
  if (state.favoritesOnly) {
    renderVehicles();
    return;
  }

  document.querySelectorAll(`[data-favorite="${id}"]`).forEach((button) => {
    const selected = state.favorites.has(id);
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", `${selected ? "Quitar de" : "Agregar a"} favoritos: ${vehicle.name}`);
  });
  updateFavoriteSummary();
}

function updateFavoriteSummary() {
  favoriteCount.textContent = state.favorites.size;
  favoritesOnlyButton.classList.toggle("enabled", state.favoritesOnly);
  favoritesOnlyButton.setAttribute("aria-pressed", String(state.favoritesOnly));
}

function renderFilterChips() {
  const chips = [];
  state.brands.forEach((value) => chips.push({ group: "brand", value }));
  state.types.forEach((value) => chips.push({ group: "type", value }));
  state.statuses.forEach((value) => chips.push({ group: "status", value }));
  if (state.search.trim()) chips.push({ group: "search", value: `"${state.search.trim()}"` });
  if (state.favoritesOnly) chips.push({ group: "favorites", value: "Solo favoritos" });
  if (Number(minPriceInput.value) !== Number(minPriceInput.min) || Number(maxPriceInput.value) !== Number(maxPriceInput.max)) {
    chips.push({ group: "price", value: `${compactPrice(state.minPrice)} - ${compactPrice(state.maxPrice)}` });
  }
  activeFilters.innerHTML = chips.map((chip) => `
    <span class="filter-chip">${escapeHtml(chip.value)}<button type="button" data-remove="${chip.group}" data-value="${escapeHtml(chip.value)}" aria-label="Quitar filtro ${escapeHtml(chip.value)}">x</button></span>
  `).join("");
}

function clearAll() {
  state.search = "";
  state.minPrice = Number(minPriceInput.min);
  state.maxPrice = Number(maxPriceInput.max);
  state.brands.clear();
  state.types.clear();
  state.statuses.clear();
  state.favoritesOnly = false;
  searchInput.value = "";
  minPriceInput.value = String(state.minPrice);
  maxPriceInput.value = String(state.maxPrice);
  document.querySelectorAll('.filter-panel input[type="checkbox"]').forEach((input) => { input.checked = false; });
  updatePriceUI();
  renderVehicles();
}

function updatePriceUI() {
  minPriceLabel.textContent = compactPrice(state.minPrice);
  maxPriceLabel.textContent = compactPrice(state.maxPrice);
  const min = Number(minPriceInput.min);
  const max = Number(minPriceInput.max);
  const width = Math.max(1, max - min);
  const minPercent = ((state.minPrice - min) / width) * 100;
  const maxPercent = ((state.maxPrice - min) / width) * 100;
  minPriceInput.style.setProperty("--range", `${minPercent}%`);
  maxPriceInput.style.setProperty("--range", `${maxPercent}%`);
}

function removeFilter(group, value) {
  if (group === "brand") state.brands.delete(value);
  if (group === "type") state.types.delete(value);
  if (group === "status") state.statuses.delete(value);
  if (group === "search") {
    state.search = "";
    searchInput.value = "";
  }
  if (group === "favorites") state.favoritesOnly = false;
  if (group === "price") {
    state.minPrice = Number(minPriceInput.min);
    state.maxPrice = Number(maxPriceInput.max);
    minPriceInput.value = String(state.minPrice);
    maxPriceInput.value = String(state.maxPrice);
    updatePriceUI();
  }
  if (["brand", "type", "status"].includes(group)) {
    document.querySelectorAll(`input[name="${group}"]`).forEach((input) => {
      if (input.value === value) input.checked = false;
    });
  }
  renderVehicles();
}

function openVehicle(id) {
  const vehicle = vehicles.find((item) => item.id === id);
  if (!vehicle) return;
  const selected = state.favorites.has(id);
  const downPayment = vehicle.status === "Nuevo" ? 90000 : 65000;
  const monthlyPayment = Math.round((vehicle.price - downPayment) / 48);
  dialogContent.innerHTML = `
    <div class="dialog-layout">
      <div class="dialog-visual" data-gallery="${vehicle.id}">
        <div class="gallery-main"><button class="gallery-nav prev" type="button" data-gallery-step="-1" aria-label="Foto anterior">‹</button><img id="galleryImage" src="${escapeHtml(vehicle.image)}" alt="${escapeHtml(vehicle.name)}"><button class="gallery-nav next" type="button" data-gallery-step="1" aria-label="Siguiente foto">›</button></div>
        <p id="galleryCaption" class="gallery-caption"></p>
        <div class="gallery-thumbs">${vehicle.images.map((img, i) => `<button type="button" data-gallery-index="${i}" aria-label="${escapeHtml(img.etiqueta)}"><img src="${escapeHtml(img.ruta)}" alt="" loading="lazy"></button>`).join("")}</div>
      </div>
      <div class="dialog-info">
        <p class="eyebrow"><span></span>${escapeHtml(vehicle.status)} · ${vehicle.year}</p>
        <h2>${escapeHtml(vehicle.name)}</h2>
        <p class="dialog-price">${money.format(vehicle.price)}${vehicle.previousPrice ? `<del>${money.format(vehicle.previousPrice)}</del>` : ""}</p>
        <p class="dialog-copy">Explora la galería y conoce cada detalle. Cuando estés listo, solicita una cotización o agenda una prueba.</p>
        <p class="dialog-description">${escapeHtml(vehicle.description)}</p>
        <div class="dialog-specs">
          <div class="dialog-stat"><span>Kilometraje</span><strong>${integer.format(vehicle.mileage)} km</strong></div>
          <div class="dialog-stat"><span>Transmisión</span><strong>${escapeHtml(vehicle.transmission)}</strong></div>
          <div class="dialog-stat"><span>Motor</span><strong>${escapeHtml(vehicle.engine)}</strong></div>
          <div class="dialog-stat"><span>Carrocería</span><strong>${escapeHtml(vehicle.type)}</strong></div>
          <div class="dialog-stat"><span>Color</span><strong>${escapeHtml(vehicle.color)}</strong></div>
          <div class="dialog-stat"><span>Condición</span><strong>${escapeHtml(vehicle.status)}</strong></div>
        </div>
        <div class="purchase-panel" aria-label="Opciones para comprar este auto">
          <div class="purchase-heading">
            <div>
              <span>Tu siguiente paso</span>
              <strong>Conoce las opciones con un asesor</strong>
            </div>
            ${icon("shield")}
          </div>
          <div class="purchase-options">
            <button class="primary-button buy-now" type="button" data-action="buy" data-vehicle="${vehicle.id}">Solicitar cotización ${icon("arrow")}</button>

            <button class="secondary-action" type="button" data-action="finance" data-vehicle="${vehicle.id}">${icon("card")} Financiamiento</button>
            <button class="secondary-action" type="button" data-action="schedule" data-vehicle="${vehicle.id}">${icon("calendar")} Prueba</button>
          </div>
          <p class="payment-note">Financiamiento estimado desde ${money.format(monthlyPayment)} al mes a 48 meses. Cálculo orientativo sin intereses, comisiones ni seguros. No constituye una oferta de crédito.</p>
          <p class="dialog-feedback" id="dialogFeedback" role="status" aria-live="polite"></p>
        </div>
        <div class="dialog-actions">
          <button class="ghost-button" type="button" data-action="quote" data-vehicle="${vehicle.id}">Pedir asesor</button>
          <button class="favorite-button${selected ? " selected" : ""}" type="button" data-favorite="${vehicle.id}" aria-label="Agregar ${escapeHtml(vehicle.name)} a favoritos" aria-pressed="${selected}">${icon("heart")}</button>
        </div>
      </div>
    </div>`;
  setGalleryPhoto(vehicle.images.findIndex(x => x.ruta === vehicle.image));
  vehicleDialog.showModal();
}

function currentDialogVehicleName(actionElement) {
  const id = Number(actionElement?.dataset.vehicle);
  return vehicles.find((vehicle) => vehicle.id === id)?.name || "este auto";
}

function showActionFeedback(title, message) {
  const feedback = document.querySelector("#dialogFeedback");
  if (vehicleDialog.open && feedback) {
    feedback.textContent = `${title}: ${message}`;
    return;
  }
  showToast(title, message);
}

function vehicleOptions(selectedId) {
  return vehicles.map((vehicle) => (
    `<option value="${vehicle.id}"${vehicle.id === selectedId ? " selected" : ""}>${escapeHtml(vehicle.name)} - ${money.format(vehicle.price)}</option>`
  )).join("");
}

function iconClose() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>';
}

function ensureFormDialogs() {
  quoteDialog = document.createElement("dialog");
  quoteDialog.className = "request-dialog";
  quoteDialog.innerHTML = `
    <form class="request-form" id="quoteForm" method="dialog" novalidate>
      <button class="dialog-close request-close" type="button" aria-label="Cerrar cotización">${iconClose()}</button>
      <p class="eyebrow"><span></span> Financiamiento</p>
      <h2>Cotizar vehículo</h2>
      <label><span>Vehículo</span><select name="vehicle_id" required></select></label>
      <div class="form-grid">
        <label><span>Nombre</span><input name="nombre" type="text" autocomplete="name" required maxlength="120" /></label>
        <label><span>Teléfono</span><input name="telefono" type="tel" autocomplete="tel" required pattern="[0-9+\\-\\s()]{8,20}" /></label>
      </div>
      <label><span>Correo</span><input name="correo" type="email" autocomplete="email" required /></label>
      <div class="form-grid">
        <label><span>Enganche</span><input name="enganche" type="number" min="0" step="1" required /></label>
        <label><span>Plazo</span><select name="plazo" required><option value="12">12 meses</option><option value="24">24 meses</option><option value="36" selected>36 meses</option><option value="48">48 meses</option><option value="60">60 meses</option><option value="72">72 meses</option></select></label>
      </div>
      <p class="form-error" hidden></p>
      <button class="primary-button" type="submit">Enviar cotización ${icon("arrow")}</button>
    </form>`;

  scheduleDialog = document.createElement("dialog");
  scheduleDialog.className = "request-dialog";
  scheduleDialog.innerHTML = `
    <form class="request-form" id="scheduleForm" method="dialog" novalidate>
      <button class="dialog-close request-close" type="button" aria-label="Cerrar agenda">${iconClose()}</button>
      <p class="eyebrow"><span></span> Prueba de manejo</p>
      <h2>Agendar visita</h2>
      <label><span>Vehículo</span><select name="vehicle_id" required></select></label>
      <div class="form-grid">
        <label><span>Nombre</span><input name="nombre" type="text" autocomplete="name" required maxlength="120" /></label>
        <label><span>Teléfono</span><input name="telefono" type="tel" autocomplete="tel" required pattern="[0-9+\\-\\s()]{8,20}" /></label>
      </div>
      <label><span>Correo</span><input name="correo" type="email" autocomplete="email" required /></label>
      <div class="form-grid">
        <label><span>Fecha</span><input name="fecha" type="date" required /></label>
        <label><span>Hora de Ciudad de México</span><input name="hora" type="time" required min="09:00" max="19:00" /></label>
      </div>
      <p class="form-error" hidden></p>
      <button class="primary-button" type="submit">Confirmar cita ${icon("arrow")}</button>
    </form>`;

  document.body.append(quoteDialog, scheduleDialog);

  document.querySelectorAll(".request-close").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });
  document.querySelector("#quoteForm").addEventListener("submit", submitQuote);
  document.querySelector("#scheduleForm").addEventListener("submit", submitSchedule);
}

async function openQuote(vehicleId) {
  if (!await canRequest('quotes', vehicleId)) return;
  if (!vehicles.length) return showToast("Inventario no disponible", "Intenta nuevamente en unos segundos.");
  const form = document.querySelector("#quoteForm");
  form.reset();
  form.querySelector('[name="vehicle_id"]').innerHTML = vehicleOptions(vehicleId || vehicles[0].id);
  form.querySelector(".form-error").hidden = true;
  prefillCustomer(form);
  quoteDialog.showModal();
}

async function openSchedule(vehicleId) {
  if (!await canRequest('test-drives', vehicleId)) return;
  if (!vehicles.length) return showToast("Inventario no disponible", "Intenta nuevamente en unos segundos.");
  const form = document.querySelector("#scheduleForm");
  form.reset();
  form.querySelector('[name="vehicle_id"]').innerHTML = vehicleOptions(vehicleId || vehicles[0].id);
  const today = new Date();
  form.querySelector('[name="fecha"]').min = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  form.querySelector(".form-error").hidden = true;
  prefillCustomer(form);
  scheduleDialog.showModal();
}

function showFormError(form, message) {
  const error = form.querySelector(".form-error");
  error.textContent = message;
  error.hidden = false;
}

async function submitQuote(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const payload = Object.fromEntries(new FormData(form));
  payload.vehicle_id = Number(payload.vehicle_id);
  payload.enganche = Number(payload.enganche);
  payload.plazo = Number(payload.plazo);

  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    await fetchJson("/api/quotes", { method: "POST", body: JSON.stringify(payload) });
    quoteDialog.close();
    showToast("Cotización enviada", "Puedes consultar el seguimiento y escribir al asesor en Mi cuenta.");
    await refreshNotifications();
  } catch (error) {
    showFormError(form, error.message);
  } finally { submit.disabled = false; }
}

async function submitSchedule(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const payload = Object.fromEntries(new FormData(form));
  const scheduled = new Date(`${payload.fecha}T${payload.hora}:00-06:00`);
  if (Number.isNaN(scheduled.getTime()) || scheduled < new Date()) {
    showFormError(form, "No puedes elegir una fecha u hora anterior.");
    return;
  }
  payload.vehicle_id = Number(payload.vehicle_id);

  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    await fetchJson("/api/test-drives", { method: "POST", body: JSON.stringify(payload) });
    scheduleDialog.close();
    showToast("Solicitud de cita enviada", "El equipo debe confirmar tu horario. Sigue la solicitud en Mi cuenta.");
    await refreshNotifications();
  } catch (error) {
    showFormError(form, error.message);
  } finally { submit.disabled = false; }
}

function showToast(title, message) {
  document.querySelector("#toastTitle").textContent = title;
  document.querySelector("#toastMessage").textContent = message;
  const toast = document.querySelector("#toast");
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function setSearchOpen(open) {
  searchDrawer.classList.toggle("open", open);
  searchDrawer.setAttribute("aria-hidden", String(!open));
  if (open) setTimeout(() => searchInput.focus(), 220);
}

const mobileFilters = matchMedia("(max-width: 800px)");
let filterReturnFocus = null;
function setFiltersOpen(open) {
  const wasOpen = filterPanel.classList.contains("open");
  open = Boolean(open && mobileFilters.matches);
  if (open && !wasOpen) filterReturnFocus = document.activeElement;
  filterPanel.classList.toggle("open", open);
  filterScrim.classList.toggle("open", open);
  document.body.classList.toggle("no-scroll", open);
  document.querySelector("#filterOpen").setAttribute("aria-expanded", String(open));
  if (mobileFilters.matches) {
    if (!open && wasOpen) filterReturnFocus?.focus();
    filterPanel.inert = !open;
    filterPanel.setAttribute("aria-hidden", String(!open));
    if (open) {
      filterPanel.setAttribute("role", "dialog");
      filterPanel.setAttribute("aria-modal", "true");
      document.querySelector("#filterClose").focus();
    } else {
      filterPanel.removeAttribute("role");
      filterPanel.removeAttribute("aria-modal");
    }
  } else {
    filterPanel.inert = false;
    filterPanel.removeAttribute("aria-hidden");
    filterPanel.removeAttribute("role");
    filterPanel.removeAttribute("aria-modal");
  }
}
mobileFilters.addEventListener("change", () => setFiltersOpen(false));
setFiltersOpen(false);
filterPanel.addEventListener("keydown", event => {
  if (event.key !== "Tab" || !mobileFilters.matches || !filterPanel.classList.contains("open")) return;
  const controls = [...filterPanel.querySelectorAll('button, input, select, [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
});
document.addEventListener("focusin", event => {
  if (mobileFilters.matches && filterPanel.classList.contains("open") && !filterPanel.contains(event.target)) document.querySelector("#filterClose").focus();
});

document.querySelector("#searchToggle").addEventListener("click", () => setSearchOpen(true));
document.querySelector("#searchClose").addEventListener("click", () => setSearchOpen(false));

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderVehicles();
});

favoritesOnlyButton.addEventListener("click", () => {
  state.favoritesOnly = !state.favoritesOnly;
  renderVehicles();
});

document.querySelector("#sortSelect").addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderVehicles();
});

document.querySelector("#clearFilters").addEventListener("click", clearAll);
document.querySelector("#filterOpen").addEventListener("click", () => setFiltersOpen(true));
document.querySelector("#filterClose").addEventListener("click", () => setFiltersOpen(false));
filterScrim.addEventListener("click", () => setFiltersOpen(false));

filterPanel.addEventListener("change", event => {
  const input = event.target;
  if (!input.matches('input[type="checkbox"]')) return;
  const collection = input.name === "brand" ? state.brands : input.name === "type" ? state.types : state.statuses;
  if (input.checked) collection.add(input.value); else collection.delete(input.value);
  renderVehicles();
});

minPriceInput.addEventListener("input", () => {
  let next = Number(minPriceInput.value);
  if (next > state.maxPrice - 50) {
    next = state.maxPrice - 50;
    minPriceInput.value = String(next);
  }
  state.minPrice = next;
  updatePriceUI();
  renderVehicles();
});

maxPriceInput.addEventListener("input", () => {
  let next = Number(maxPriceInput.value);
  if (next < state.minPrice + 50) {
    next = state.minPrice + 50;
    maxPriceInput.value = String(next);
  }
  state.maxPrice = next;
  updatePriceUI();
  renderVehicles();
});

document.addEventListener("click", (event) => {
  const cardPhoto = event.target.closest("[data-card-photo]");
  if (cardPhoto) { changeCardPhoto(cardPhoto); return; }
  const galleryStep = event.target.closest("[data-gallery-step]");
  if (galleryStep) { setGalleryPhoto(galleryIndex + Number(galleryStep.dataset.galleryStep)); return; }
  const galleryThumb = event.target.closest("[data-gallery-index]");
  if (galleryThumb) { setGalleryPhoto(Number(galleryThumb.dataset.galleryIndex)); return; }
  const heroStep = event.target.closest("[data-hero-step]");
  if (heroStep) { heroIndex += Number(heroStep.dataset.heroStep); renderHero(); return; }
  const heroDot = event.target.closest("[data-hero-index]");
  if (heroDot) { heroIndex = Number(heroDot.dataset.heroIndex); renderHero(); return; }
  const favorite = event.target.closest("[data-favorite]");
  if (favorite) {
    toggleFavorite(Number(favorite.dataset.favorite));
    return;
  }

  const details = event.target.closest("[data-details]");
  if (details) {
    openVehicle(Number(details.dataset.details));
    return;
  }

  const remove = event.target.closest("[data-remove]");
  if (remove) {
    let value = remove.dataset.value;
    if (remove.dataset.remove === "search") value = state.search;
    removeFilter(remove.dataset.remove, value);
    return;
  }

  const action = event.target.closest("[data-action]");
  if (action?.dataset.action === "clear") {
    clearAll();
  } else if (action?.dataset.action === "buy") {
    vehicleDialog.close();
    openQuote(Number(action.dataset.vehicle));
  } else if (action?.dataset.action === "reserve") {
    vehicleDialog.close();
    openQuote(Number(action.dataset.vehicle));
  } else if (action?.dataset.action === "finance") {
    if (vehicleDialog.open) vehicleDialog.close();
    openQuote(Number(action.dataset.vehicle) || undefined);
  } else if (action?.dataset.action === "quote") {
    if (vehicleDialog.open) vehicleDialog.close();
    openQuote(Number(action.dataset.vehicle) || undefined);
  } else if (action?.dataset.action === "schedule") {
    if (vehicleDialog.open) vehicleDialog.close();
    openSchedule(Number(action.dataset.vehicle) || undefined);
  }
});

document.querySelector("#dialogClose").addEventListener("click", () => vehicleDialog.close());
vehicleDialog.addEventListener("click", (event) => {
  if (event.target === vehicleDialog) vehicleDialog.close();
});

document.querySelector("#mobileMenu").addEventListener("click", () => {
  const open = !mobileNav.classList.contains("open");
  mobileNav.classList.toggle("open", open);
  mobileNav.setAttribute("aria-hidden", String(!open));
});

mobileNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileNav.classList.remove("open");
    mobileNav.setAttribute("aria-hidden", "true");
  });
});

document.addEventListener("keydown", (event) => {
  const card = event.target.closest?.(".vehicle-card");
  if (card && event.target === card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openVehicle(Number(card.dataset.details));
    return;
  }

  if (event.key !== "Escape") return;
  setSearchOpen(false);
  setFiltersOpen(false);
  mobileNav.classList.remove("open");
  mobileNav.setAttribute("aria-hidden", "true");
});



// Carruseles manuales: no cambian mientras el usuario está leyendo.
let heroIndex = 0;
let galleryIndex = 0;
let currentUser = null;
function featuredVehicles() { return vehicles.filter(v => v.featured || v.previousPrice); }
function renderHero() {
  const list = featuredVehicles().length ? featuredVehicles() : vehicles.slice(0, 3);
  if (!list.length) {
    document.querySelector('#heroProduct').innerHTML = '<p>Estamos preparando nuestra próxima selección.</p>';
    document.querySelector('#heroControls').innerHTML = '';
    return;
  }
  heroIndex = ((heroIndex % list.length) + list.length) % list.length;
  const v = list[heroIndex];
  document.querySelector('#heroProduct').innerHTML = `<img src="${escapeHtml(v.image)}" alt="${escapeHtml(v.name)}"><div class="hero-product-label"><div><span class="selection-tag">${v.previousPrice ? 'OFERTA DE DEMOSTRACIÓN' : 'VEHÍCULO DESTACADO'}</span><h2>${escapeHtml(v.name)}</h2><p>${v.year} · ${escapeHtml(v.engine)} · ${money.format(v.price)}</p></div><button class="primary-button" type="button" data-details="${v.id}">Conocerlo ↗</button></div>`;
  document.querySelector('#heroControls').innerHTML = `<button class="carousel-arrow" data-hero-step="-1" aria-label="Destacado anterior">‹</button>${list.map((v, i) => `<button class="carousel-dot${i === heroIndex ? ' active' : ''}" data-hero-index="${i}" aria-label="Ver ${escapeHtml(v.name)}" aria-pressed="${i === heroIndex}"></button>`).join('')}<button class="carousel-arrow" data-hero-step="1" aria-label="Siguiente destacado">›</button>`;
}
function renderFeatured() {
  const list = featuredVehicles();
  document.querySelector('#destacados').hidden = !list.length;
  document.querySelector('#featuredRail').innerHTML = list.map(v => `<article class="featured-card"><div class="featured-image"><img src="${escapeHtml(v.image)}" alt="${escapeHtml(v.name)}" loading="lazy"><span class="selection-tag">${v.previousPrice ? escapeHtml(v.offer || 'Oferta') : 'Destacado'}</span></div><div class="featured-info"><p>${v.year} / ${escapeHtml(v.type)} / ${escapeHtml(v.status)}</p><h3>${escapeHtml(v.name)}</h3><p class="featured-price">${money.format(v.price)} ${v.previousPrice ? `<del>${money.format(v.previousPrice)}</del><span>Ahorra ${money.format(v.previousPrice-v.price)}</span>` : ''}</p><button type="button" data-details="${v.id}">Explorar vehículo ↗</button></div></article>`).join('');
  renderHero();
  requestAnimationFrame(updateRailControls);
}
function updateRailControls() {
  const rail = document.querySelector('#featuredRail');
  document.querySelector('#featuredPrev').disabled = rail.scrollLeft <= 1;
  document.querySelector('#featuredNext').disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1;
}
document.querySelector('#featuredRail').addEventListener('scroll', updateRailControls, { passive: true });
window.addEventListener('resize', updateRailControls);
for (const [selector, direction] of [['#featuredPrev', -1], ['#featuredNext', 1]]) {
  document.querySelector(selector).addEventListener('click', () => {
    const rail = document.querySelector('#featuredRail');
    rail.scrollBy({ left: direction * (rail.querySelector('article')?.getBoundingClientRect().width + 20 || 400), behavior: 'smooth' });
  });
}
function changeCardPhoto(button) {
  const v = vehicles.find(v => v.id === Number(button.dataset.cardPhoto));
  const stage = button.closest('.car-stage');
  const image = stage.querySelector('img');
  const current = v.images.findIndex(x => x.ruta === image.getAttribute('src'));
  const index = (current + Number(button.dataset.step) + v.images.length) % v.images.length;
  image.src = v.images[index].ruta;
  image.alt = `${v.name} · ${v.images[index].etiqueta}`;
  stage.querySelector('[data-photo-count]').textContent = `${index + 1} / ${v.images.length}`;
}
function setGalleryPhoto(index) {
  const gallery = document.querySelector('[data-gallery]');
  if (!gallery) return;
  const v = vehicles.find(v => v.id === Number(gallery.dataset.gallery));
  galleryIndex = ((index % v.images.length) + v.images.length) % v.images.length;
  const img = v.images[galleryIndex];
  document.querySelector('#galleryImage').src = img.ruta;
  document.querySelector('#galleryImage').alt = `${v.name} · ${img.etiqueta}`;
  document.querySelector('#galleryCaption').textContent = `${galleryIndex + 1} / ${v.images.length} · ${img.etiqueta}`;
  gallery.querySelectorAll('[data-gallery-index]').forEach((b, i) => { b.classList.toggle('active', i === galleryIndex); b.setAttribute('aria-pressed', String(i === galleryIndex)); });
}
vehicleDialog.addEventListener('keydown', event => {
  if (event.target.matches('input,select,textarea')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setGalleryPhoto(galleryIndex + (event.key === 'ArrowLeft' ? -1 : 1)); }
});
function prefillCustomer(form) {
  if (!currentUser) return;
  form.elements.nombre.value = currentUser.nombre;
  form.elements.nombre.readOnly = true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentUser.username)) form.elements.correo.value = currentUser.username;
}
const accountDialog = document.createElement('dialog');
accountDialog.className = 'account-dialog';
accountDialog.setAttribute('aria-label', 'Cuenta de Nexora');
document.body.append(accountDialog);
function accountShell(content) {
  accountDialog.innerHTML = `<div class="account-inner"><button class="dialog-close" type="button" data-account-close aria-label="Cerrar cuenta">${iconClose()}</button>${content}</div>`;
  accountDialog.scrollTop = 0;
  accountDialog.querySelector('[data-account-close]').onclick = () => accountDialog.close();
}
function showAuth(register = false, { username = '', notice = '' } = {}) {
  accountShell(`<p class="eyebrow">NEXORA / MI CUENTA</p><h2>${register ? 'Tu próximo camino.' : 'Qué bueno verte.'}</h2><div class="account-tabs"><button type="button" data-auth-tab="login" class="${register ? '' : 'active'}">Iniciar sesión</button><button type="button" data-auth-tab="register" class="${register ? 'active' : ''}">Crear cuenta</button></div><p>${register ? 'Guarda tus favoritos y consulta tus cotizaciones y pruebas de manejo.' : 'Vuelve a tus favoritos y sigue el estado de tus solicitudes.'}</p><form id="authForm">${register ? '<label>Nombre completo<input name="nombre" required maxlength="120" autocomplete="name"></label>' : ''}<label>Usuario o correo<input name="username" required minlength="3" maxlength="60" autocomplete="username"></label><label>Contraseña<input name="password" type="password" required ${register ? 'minlength="8" autocomplete="new-password"' : 'autocomplete="current-password"'}></label>${register ? '<p>Al menos 8 caracteres, con letras y números.</p>' : ''}<p class="form-error" hidden></p><button class="primary-button" type="submit">${register ? 'Crear mi cuenta' : 'Iniciar sesión'} ↗</button></form><p>¿Eres parte del equipo? <a href="/admin" class="text-link">Ir al panel →</a></p>`);
  accountDialog.querySelectorAll('[data-auth-tab]').forEach(b => b.onclick = () => showAuth(b.dataset.authTab === 'register'));
  accountDialog.querySelector('[name="username"]').closest('label').firstChild.textContent = 'Usuario';
  accountDialog.querySelector('[name="username"]').value = username;
  if (notice) {
    const feedback = document.createElement('p'); feedback.className = 'auth-notice'; feedback.setAttribute('role', 'status'); feedback.textContent = notice;
    accountDialog.querySelector('.account-tabs').after(feedback);
  }
  if (register) {
    const label = document.createElement('label');
    label.innerHTML = 'Confirmar contraseña<input name="confirm" type="password" required minlength="8" autocomplete="new-password">';
    accountDialog.querySelector('[name="password"]').closest('label').after(label);
  }
  if (pendingRequest) {
    const hint = document.createElement('p');
    hint.className = 'account-hint';
    hint.textContent = 'Crea tu cuenta o inicia sesión para enviar esta solicitud y recibir su seguimiento.';
    accountDialog.querySelector('.account-tabs').after(hint);
  }
  accountDialog.querySelector('#authForm').onsubmit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    if (register && form.elements.password.value !== form.elements.confirm.value) return showFormError(form, 'Las contraseñas no coinciden.');
    submit.disabled = true;
    try {
      const payload = Object.fromEntries(new FormData(form));
      const result = await fetchJson(`/api/auth/${register ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(payload) });
      announceAuthChange('client');
      if (register) {
        currentUser = null; await syncAccount(); renderVehicles();
        showAuth(false, { username: result.username, notice: 'Tu cuenta fue creada. Inicia sesión con el usuario y la contraseña que acabas de registrar.' });
        return;
      }
      currentUser = result;
      await syncAccount();
      renderVehicles();
      history.replaceState(null, '', location.pathname + location.hash);
      if (pendingRequest) {
        const pending = pendingRequest;
        pendingRequest = null;
        accountDialog.close();
        if (pending.type === 'quotes') openQuote(pending.vehicleId); else openSchedule(pending.vehicleId);
      } else await showAccount();
    } catch (error) { showFormError(form, error.message); }
    finally { if (submit.isConnected) submit.disabled = false; }
  };
}
async function syncAccount() {
  if (currentUser) state.favorites = new Set(await fetchJson('/api/account/favorites'));
  else state.favorites = loadFavorites();
  document.querySelector('#accountButton').textContent = currentUser ? currentUser.nombre.split(' ')[0] : 'Mi cuenta';
  updateFavoriteSummary();
  await refreshNotifications();
}
let pendingRequest = null;
let activeConversation = null;
let lastNotificationId = null;
const staffPreview = new URLSearchParams(location.search).get('vista') === 'equipo';
function announceAuthChange(audience) {
  try { localStorage.setItem(`nexora-${audience}-auth-change`, `${Date.now()}-${Math.random()}`); } catch { /* La comprobación del servidor sigue activa. */ }
}
function resetCustomerView(message) {
  currentUser = null; activeConversation = null; lastNotificationId = null;
  if (quoteDialog?.open) quoteDialog.close();
  if (scheduleDialog?.open) scheduleDialog.close();
  if (vehicleDialog.open) vehicleDialog.close();
  state.favorites = loadFavorites(); updateFavoriteSummary();
  document.querySelector('#accountButton').textContent = 'Mi cuenta';
  document.querySelector('#notificationsButton').hidden = true;
  renderVehicles();
  showAuth(false, { notice: message });
  if (!accountDialog.open) accountDialog.showModal();
}
window.addEventListener('storage', event => {
  if (!staffPreview && event.key === 'nexora-client-auth-change') resetCustomerView('La sesión de cliente cambió en otra pestaña. Inicia sesión para continuar con la cuenta correcta.');
});
async function canRequest(type, vehicleId) {
  if (staffPreview) { showToast('Vista del equipo', 'Vuelve a tu panel para gestionar las solicitudes de clientes.'); return false; }
  if (!currentUser) { requestAuthentication(type, vehicleId); return false; }
  try {
    const expected = currentUser.id;
    const session = await fetchJson('/api/auth/session');
    if (!session.user || session.user.id !== expected || session.user.role !== 'cliente') {
      resetCustomerView('La sesión cambió. Inicia sesión con tu cuenta de cliente antes de enviar la solicitud.'); return false;
    }
    return true;
  } catch(error) { showToast('No se pudo comprobar la sesión', error.message); return false; }
}
function requestAuthentication(type, vehicleId) {
  pendingRequest = { type, vehicleId };
  showAuth(true);
  if (!accountDialog.open) accountDialog.showModal();
}
function localTime(value) {
  return new Date(value.replace(' ', 'T') + 'Z').toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}
async function refreshNotifications(announce = false) {
  const button = document.querySelector('#notificationsButton');
  button.hidden = !currentUser;
  if (!currentUser) { lastNotificationId = null; return; }
  const data = await fetchJson('/api/account/notifications');
  const count = document.querySelector('#notificationCount');
  count.textContent = data.unread > 99 ? '99+' : data.unread;
  count.hidden = !data.unread;
  button.setAttribute('aria-label', `Mis notificaciones, ${data.unread} sin leer`);
  const latest = data.items[0];
  if (announce && latest && lastNotificationId !== null && latest.id > lastNotificationId && !latest.read_at) showToast(latest.title, latest.body);
  lastNotificationId = latest?.id || 0;
  return data;
}
async function showNotifications() {
  activeConversation = null;
  try {
    const data = await refreshNotifications();
    if (!data) return showAuth();
    accountShell(`<p class="eyebrow">NEXORA / AVISOS</p><h2>Tus notificaciones</h2><p>Confirmaciones y mensajes de tus solicitudes. Se guardan en tu cuenta, incluso si cierras la página.</p><div class="account-toolbar"><button type="button" data-back-account>Volver a mi cuenta</button><button type="button" id="readAll" ${!data.unread ? 'disabled' : ''}>Marcar todas leídas</button><button type="button" id="refreshNotices">Actualizar</button></div><div class="notice-list">${data.items.length ? data.items.map(n => `<article class="notice ${!n.read_at ? 'unread' : ''}"><small>${escapeHtml(localTime(n.created_at))} · ${n.read_at ? 'Leída' : 'Sin leer'}</small><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.body)}</p><button type="button" data-notice="${n.id}" ${n.request_type ? `data-type="${n.request_type}" data-request="${n.request_id}"` : ''}>${n.request_type ? 'Ver solicitud y mensajes' : 'Marcar leída'}</button></article>`).join('') : '<p>Aún no tienes notificaciones.</p>'}</div>`);
    accountDialog.querySelector('[data-back-account]').onclick = showAccount;
    accountDialog.querySelector('#refreshNotices').onclick = showNotifications;
    accountDialog.querySelector('#readAll').onclick = async () => {
      try { await fetchJson('/api/account/notifications/read', { method: 'PATCH' }); await showNotifications(); }
      catch (e) { showToast('No se pudo actualizar', e.message); }
    };
    accountDialog.querySelectorAll('[data-notice]').forEach(b => b.onclick = async () => {
      try {
        await fetchJson(`/api/account/notifications/${b.dataset.notice}/read`, { method: 'PATCH' });
        await refreshNotifications();
        if (b.dataset.type) await showConversation(b.dataset.type, b.dataset.request); else await showNotifications();
      } catch (e) { showToast('No se pudo abrir', e.message); }
    });
  } catch(e) { showToast('Avisos no disponibles', e.message); }
}
function messageMarkup(messages) {
  return messages.length ? messages.map(m => `<article class="conversation-message ${m.sender_kind === 'cliente' ? 'from-customer' : 'from-team'}"><strong>${escapeHtml(m.sender_name)} · ${m.sender_kind === 'cliente' ? 'Cliente' : 'Equipo Nexora'}</strong><p>${escapeHtml(m.body)}</p><small>${escapeHtml(localTime(m.created_at))}</small></article>`).join('') : '<p>Envía tu consulta al equipo. Sus respuestas aparecerán aquí y en tus notificaciones.</p>';
}
async function refreshConversation() {
  if (!activeConversation || !accountDialog.open) return;
  const target = activeConversation;
  const data = await fetchJson(`/api/account/requests/${target.type}/${target.id}/messages`);
  if (activeConversation !== target) return;
  const list = accountDialog.querySelector('#conversationMessages');
  if (list) list.innerHTML = messageMarkup(data.messages);
  const status = accountDialog.querySelector('#conversationStatus');
  if (status) status.textContent = data.request.estado;
}
async function showConversation(type, id) {
  activeConversation = { type, id };
  accountShell(`<p class="eyebrow">NEXORA / SEGUIMIENTO</p><h2>${type === 'quotes' ? 'Cotización' : 'Prueba'} #${id}</h2><p id="conversationStatus"></p><div class="account-toolbar"><button type="button" data-back-account>Volver a mi cuenta</button><button type="button" id="refreshMessages">Actualizar mensajes</button></div><div id="conversationMessages" aria-live="polite"></div><form id="messageForm"><label>Mensaje al asesor<textarea name="body" required maxlength="2000" rows="3" placeholder="Escribe tu consulta sobre esta solicitud"></textarea></label><p class="form-error" hidden></p><button class="primary-button" type="submit">Enviar mensaje ↗</button></form>`);
  accountDialog.querySelector('[data-back-account]').onclick = showAccount;
  accountDialog.querySelector('#refreshMessages').onclick = () => refreshConversation().catch(e => showToast('No se pudo actualizar',e.message));
  accountDialog.querySelector('#messageForm').onsubmit = async event => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await fetchJson(`/api/account/requests/${type}/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: form.elements.body.value }) });
      form.reset(); form.querySelector('.form-error').hidden = true;
      await refreshConversation();
    } catch(e) { showFormError(form, e.message); }
    finally { button.disabled = false; }
  };
  try { await refreshConversation(); } catch(e) { showToast('No se pudo cargar la conversación', e.message); }
}
async function showAccount() {
  activeConversation = null;
  if (!currentUser) { showAuth(); return; }
  accountShell(`<p class="eyebrow">NEXORA / MI CUENTA</p><h2>Tu camino, aquí.</h2><p>Cargando solicitudes…</p>`);
  try {
    const data = await fetchJson('/api/account/requests');
    const notices = await refreshNotifications();
    const record = (r, type) => `<div class="request-record"><span class="record-status">${escapeHtml(r.estado)}</span><strong>${escapeHtml(r.marca)} ${escapeHtml(r.modelo)}</strong><small>${type} #${r.id} · ${type === 'Prueba' ? `${escapeHtml(r.fecha)} a las ${escapeHtml(r.hora)}` : `${money.format(r.enganche)} de enganche · ${r.plazo} meses`}</small><button class="request-message-button" type="button" data-conversation="${r.id}" data-type="${type === 'Prueba' ? 'test-drives' : 'quotes'}">Seguimiento y mensajes (${r.message_count}) →</button></div>`;
    accountShell(`<p class="eyebrow">NEXORA / MI CUENTA</p><h2>Tu camino, aquí.</h2><div class="account-user"><div><strong>${escapeHtml(currentUser.nombre)}</strong><small>${escapeHtml(currentUser.username)}</small></div><button type="button" id="accountLogout">Cerrar sesión</button></div>${currentUser.role !== 'cliente' ? '<a class="primary-button" href="/admin">Ir a mi espacio de trabajo ↗</a>' : ''}<div class="account-toolbar"><button type="button" id="accountNotices">Notificaciones (${notices.unread} sin leer)</button><button type="button" id="refreshAccount">Actualizar solicitudes</button></div><h3>Mis solicitudes</h3>${data.quotes.map(r => record(r,'Cotización')).join('')}${data.testDrives.map(r => record(r,'Prueba')).join('')}${!data.quotes.length && !data.testDrives.length ? '<p>Abre un vehículo y envía tu primera cotización o prueba de manejo. Las solicitudes que hagas con tu sesión aparecerán aquí.</p>' : ''}<details><summary>Cambiar contraseña</summary><form id="passwordForm"><label>Contraseña actual<input type="password" name="current" required autocomplete="current-password"></label><label>Nueva contraseña<input type="password" name="password" minlength="8" required autocomplete="new-password"></label><p class="form-error" hidden></p><button class="primary-button" type="submit">Guardar contraseña</button></form></details>`);
    accountDialog.querySelector('#accountNotices').onclick = showNotifications;
    accountDialog.querySelector('#refreshAccount').onclick = showAccount;
    accountDialog.querySelectorAll('[data-conversation]').forEach(b => b.onclick = () => showConversation(b.dataset.type, b.dataset.conversation));
    document.querySelector('#accountLogout').onclick = async () => {
      try { await fetchJson('/api/auth/logout', { method: 'POST' }); announceAuthChange('client'); currentUser = null; pendingRequest = null; await syncAccount(); renderVehicles(); showAuth(); }
      catch (error) { showToast('No se pudo cerrar la sesión',error.message); }
    };
    document.querySelector('#passwordForm').onsubmit = async event => {
      event.preventDefault(); const form = event.currentTarget;
      try { await fetchJson('/api/auth/password', { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(form))) }); form.reset(); form.closest('details').open = false; showToast('Contraseña actualizada','Usa la nueva contraseña en tu próximo acceso.'); }
      catch (error) { showFormError(form,error.message); }
    };
  } catch(error) { accountShell(`<h2>No se pudo cargar tu cuenta.</h2><p>${escapeHtml(error.message)}</p>`); }
}
document.querySelector('#notificationsButton').onclick = async () => {
  if (!accountDialog.open) accountDialog.showModal();
  await showNotifications();
};
accountDialog.addEventListener('close', () => { activeConversation = null; pendingRequest = null; });
let refreshingInbox = false;
setInterval(async () => {
  if (!currentUser || document.hidden || refreshingInbox) return;
  refreshingInbox = true;
  try { await refreshNotifications(true); await refreshConversation(); }
  catch { /* El siguiente ciclo vuelve a intentar; no interrumpe la escritura. */ }
  finally { refreshingInbox = false; }
}, 15000);
document.querySelector('#accountButton').onclick = async () => {
  if (staffPreview) { location.assign('/admin#dashboard'); return; }
  if (!accountDialog.open) accountDialog.showModal();
  await showAccount();
};
accountDialog.addEventListener('click', e => { if (e.target === accountDialog) accountDialog.close(); });
ensureFormDialogs();
(async function initialize() {
  const params = new URLSearchParams(location.search);
  if (staffPreview) {
    document.body.classList.add('staff-preview');
    document.querySelector('#staffPreviewBanner').hidden = false;
    document.querySelector('#previewIdentity').textContent = 'Consulta del equipo';
    document.querySelector('#accountButton').textContent = 'Volver al panel';
    document.querySelector('#favoritesOnly').hidden = true;
    document.querySelectorAll('a.brand').forEach(a => a.href = '/admin#dashboard');
  }
  try {
    if (staffPreview) {
      const staff = await fetchJson('/api/admin/session');
      if (!staff.authenticated) { location.replace('/admin'); return; }
      document.querySelector('#previewIdentity').textContent = `${staff.nombre} · ${staff.role === 'admin' ? 'Administrador' : 'Asesor'}`;
    } else {
      const session = await fetchJson('/api/auth/session'); currentUser = session.user;
      // El catálogo siempre pertenece a clientes, aunque exista una sesión del equipo.
      await syncAccount();
    }
  }
  catch (error) { showToast('Cuenta no disponible', error.message); }
  await loadVehicles();
  if (params.has('login') && !staffPreview) {
    if (currentUser) { await fetchJson('/api/auth/logout', { method: 'POST' }); currentUser = null; announceAuthChange('client'); await syncAccount(); }
    showAuth(false, { username: params.get('usuario') || '', notice: params.has('registro') ? 'Cuenta creada. Inicia sesión con las credenciales que registraste.' : '' });
    accountDialog.showModal();
  }
})();
