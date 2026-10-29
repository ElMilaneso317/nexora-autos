"use strict";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const state = {
  vehicles: [],
  quotes: [],
  testDrives: [],
  editingVehicleId: null,
  user: null,
  users: [],
};

const loginView = document.querySelector("#loginView");
const adminView = document.querySelector("#adminView");
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const vehicleForm = document.querySelector("#vehicleForm");
const vehicleError = document.querySelector("#vehicleError");
const vehicleRows = document.querySelector("#vehicleRows");
const quoteRows = document.querySelector("#quoteRows");
const testDriveRows = document.querySelector("#testDriveRows");
const statsGrid = document.querySelector("#dashboard");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(state.user && url !== '/api/admin/login' ? { 'X-Nexora-User': String(state.user.id) } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (url !== '/api/admin/login' && ((response.status === 401 && state.user) || data.code === 'SESSION_CHANGED')) {
      showLogin(); showError(loginError, 'La sesión del equipo terminó o cambió. Inicia sesión con tu cuenta para continuar.');
    }
    throw Object.assign(new Error(data.error || "No se pudo completar la solicitud."), { status: response.status, code: data.code });
  }
  return data;
}

function showError(node, message) {
  node.textContent = message;
  node.hidden = false;
}

function clearError(node) {
  node.textContent = "";
  node.hidden = true;
}

function showAdmin() {
  const admin = state.user?.role === "admin";
  document.querySelector("#newVehicleButton").hidden = !admin;
  document.querySelector("#usersNav").hidden = !admin;
  document.querySelector("#usuarios").hidden = !admin;
  document.querySelector("#staffIdentity").textContent = `${state.user?.nombre} / ${admin ? "Administrador" : "Asesor · acceso limitado"}`;
  document.querySelector('#panelTitle').textContent = admin ? 'Panel de administración' : 'Panel de asesor';
  document.querySelector('#registrationNotice').hidden = true;
  loginView.hidden = true;
  adminView.hidden = false;
}

function showLogin() {
  state.user = null;
  loginView.hidden = false;
  adminView.hidden = true;
  vehicleForm.hidden = true;
  document.querySelector('.staff-thread-dialog')?.close();
  document.querySelector('#staffPasswordForm').reset();
}

async function bootstrap() {
  try {
    state.user = await api("/api/admin/session");
    showAdmin();
    await loadAdminData();
  } catch (_error) {
    showLogin();
  }
}

async function loadAdminData() {
  const identity = state.user?.id;
  if (!identity) return;
  const [dashboard, vehicles, quotes, testDrives] = await Promise.all([
    api("/api/admin/dashboard"),
    api("/api/admin/vehicles"),
    api("/api/admin/quotes"),
    api("/api/admin/test-drives"),
  ]);
  if (state.user?.id !== identity) return;
  state.vehicles = vehicles;
  state.quotes = quotes;
  state.testDrives = testDrives;
  renderDashboard(dashboard);
  renderVehicles();
  renderQuotes();
  renderTestDrives();
  if (state.user.role === "admin") { state.users = await api("/api/admin/users"); renderUsers(); }
}

function renderDashboard(data) {
  const cards = [
    ["Autos totales", data.vehicles],
    ["Autos activos", data.activeVehicles],
    ["Cotizaciones", data.quotes],
    ["Pruebas", data.testDrives],
  ];
  statsGrid.innerHTML = cards.map(([label, value]) => (
    `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`
  )).join("");
}

function vehicleName(vehicle) {
  return `${vehicle.marca} ${vehicle.modelo}`;
}

function renderVehicles() {
  if (!state.vehicles.length) {
    vehicleRows.innerHTML = '<tr><td colspan="5">No hay vehículos registrados.</td></tr>';
    return;
  }

  vehicleRows.innerHTML = state.vehicles.map((vehicle) => `
    <tr>
      <td><div class="inventory-cell"><img src="${escapeHtml(vehicle.imagenes?.find(x => /ilustrativa/.test(x.etiqueta))?.ruta || vehicle.imagen)}" alt=""><div><strong>${escapeHtml(vehicleName(vehicle))}</strong><small>${escapeHtml(vehicle.carrocería)} · ${vehicle.imagenes.length} imágenes${vehicle.destacado ? " · Destacado" : ""}${vehicle.precio_anterior ? " · Oferta" : ""}</small></div></div></td>
      <td>${vehicle.año}</td>
      <td>${money.format(vehicle.precio)}</td>
      <td>${escapeHtml(vehicle.disponibilidad)}</td>
      <td>
        <div class="row-actions">${state.user.role === "admin" ? `
          <button class="mini-button" type="button" data-edit="${vehicle.id}">Editar</button>
          <button class="mini-button" type="button" data-delete="${vehicle.id}">Eliminar</button>` : `<span class="permission-label">Solo consulta</span>`}
        </div>
      </td>
    </tr>
  `).join("");
}

function renderQuotes() {
  if (!state.quotes.length) {
    quoteRows.innerHTML = '<tr><td colspan="5">Todavía no hay cotizaciones.</td></tr>';
    return;
  }

  quoteRows.innerHTML = state.quotes.map((quote) => `
    <tr>
      <td>${requestIdentity(quote)}<small>${escapeHtml(quote.telefono)} · ${escapeHtml(quote.correo)}</small>${requestContact(quote, 'quotes')}</td>
      <td>${escapeHtml(quote.marca)} ${escapeHtml(quote.modelo)}<small>${quote.año}</small></td>
      <td>${money.format(quote.enganche)}</td>
      <td>${quote.plazo} meses</td>
      <td>
        <select data-quote-status="${quote.id}" ${(quote.user_id && quote.account_role !== 'cliente') || (state.user.role === "empleado" && ["Aprobada", "Rechazada"].includes(quote.estado)) ? "disabled" : ""}>
          ${statusOptions(state.user.role === "admin" ? ["Nueva", "Contactada", "Aprobada", "Rechazada"] : [...new Set([quote.estado, "Nueva", "Contactada"])], quote.estado)}
        </select>
      </td>
    </tr>
  `).join("");
}

function renderTestDrives() {
  if (!state.testDrives.length) {
    testDriveRows.innerHTML = '<tr><td colspan="5">Todavía no hay pruebas de manejo.</td></tr>';
    return;
  }

  testDriveRows.innerHTML = state.testDrives.map((test) => `
    <tr>
      <td>${requestIdentity(test)}<small>${escapeHtml(test.telefono)} · ${escapeHtml(test.correo)}</small>${requestContact(test, 'test-drives')}</td>
      <td>${escapeHtml(test.marca)} ${escapeHtml(test.modelo)}<small>${test.año}</small></td>
      <td>${escapeHtml(test.fecha)}</td>
      <td>${escapeHtml(test.hora)}</td>
      <td>
        <select data-test-status="${test.id}" ${test.user_id && test.account_role !== 'cliente' ? 'disabled' : ''}>
          ${statusOptions(["Pendiente", "Confirmada", "Realizada", "Cancelada"], test.estado)}
        </select>
      </td>
    </tr>
  `).join("");
}

function statusOptions(options, current) {
  return options.map((option) => (
    `<option value="${escapeHtml(option)}"${option === current ? " selected" : ""}>${escapeHtml(option)}</option>`
  )).join("");
}

function openVehicleForm(vehicle) {
  clearError(vehicleError);
  vehicleForm.hidden = false;
  vehicleForm.reset();
  state.editingVehicleId = vehicle?.id || null;

  const values = vehicle ? { ...vehicle } : {
    marca: "",
    modelo: "",
    anio: new Date().getFullYear(),
    precio: "",
    kilometraje: 0,
    carroceria: "",
    transmision: "",
    motor: "",
    color: "",
    condicion: "Seminuevo",
    imagen: "",
    descripcion: "",
    disponibilidad: "Activo",
    glow: "rgba(255, 79, 46, .24)",
  };

  if (vehicle) {
    values.anio = vehicle.año;
    values.carroceria = vehicle.carrocería;
    values.transmision = vehicle.transmisión;
    values.condicion = vehicle.condición;
    values.descripcion = vehicle.descripción;
    values.destacado = vehicle.destacado ? "1" : "0";
    values.imagenes = vehicle.imagenes.map(x => x.ruta).join("\n");
  }

  Object.entries(values).forEach(([key, value]) => {
    const field = vehicleForm.elements.namedItem(key);
    if (field) field.value = value ?? "";
  });
  updateGalleryPreview();
  vehicleForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveVehicle(event) {
  event.preventDefault();
  clearError(vehicleError);
  if (!vehicleForm.checkValidity()) {
    vehicleForm.reportValidity();
    return;
  }

  const formData = new FormData(vehicleForm);
  const file = formData.get("imagen_archivo");
  if (!file || !file.size) formData.delete("imagen_archivo");

  try {
    const id = state.editingVehicleId;
    await api(id ? `/api/admin/vehicles/${id}` : "/api/admin/vehicles", {
      method: id ? "PUT" : "POST",
      body: formData,
    });
    vehicleForm.hidden = true;
    state.editingVehicleId = null;
    await loadAdminData();
  } catch (error) {
    showError(vehicleError, error.message);
  }
}

async function deleteVehicle(id) {
  const vehicle = state.vehicles.find((item) => item.id === id);
  if (!vehicle) return;
  const ok = confirm(`¿Eliminar ${vehicleName(vehicle)}? Esta acción requiere confirmación.`);
  if (!ok) return;

  await api(`/api/admin/vehicles/${id}`, { method: "DELETE" });
  await loadAdminData();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError(loginError);
  if (!loginForm.checkValidity()) {
    loginForm.reportValidity();
    return;
  }

  const payload = Object.fromEntries(new FormData(loginForm));
  try {
    state.user = await api("/api/admin/login", { method: "POST", body: JSON.stringify(payload) });
    announceStaffChange();
    loginForm.reset();
    showAdmin();
    await loadAdminData();
    history.replaceState(null, '', '/admin#dashboard');
    document.querySelector('#dashboard').scrollIntoView();
  } catch (error) {
    showError(loginError, error.message);
  }
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  try { await api("/api/admin/logout", { method: "POST", body: JSON.stringify({}) }); announceStaffChange(); showLogin(); }
  catch(error) { alert(error.message); }
});

document.querySelector("#newVehicleButton").addEventListener("click", () => openVehicleForm());
document.querySelector("#cancelVehicleButton").addEventListener("click", () => {
  vehicleForm.hidden = true;
  state.editingVehicleId = null;
  clearError(vehicleError);
});
vehicleForm.addEventListener("submit", saveVehicle);

document.addEventListener("click", async (event) => {
  const edit = event.target.closest("[data-edit]");
  if (edit) {
    const vehicle = state.vehicles.find((item) => item.id === Number(edit.dataset.edit));
    openVehicleForm(vehicle);
    return;
  }

  const remove = event.target.closest("[data-delete]");
  if (remove) {
    try {
      await deleteVehicle(Number(remove.dataset.delete));
    } catch (error) {
      alert(error.message);
    }
  }
});

document.addEventListener("change", async (event) => {
  const quote = event.target.closest("[data-quote-status]");
  const test = event.target.closest("[data-test-status]");
  const role = event.target.closest("[data-user-role]");
  const active = event.target.closest("[data-user-active]");
  try {
    if (quote) await api(`/api/admin/quotes/${quote.dataset.quoteStatus}`, { method: "PATCH", body: JSON.stringify({ estado: quote.value }) });
    else if (test) await api(`/api/admin/test-drives/${test.dataset.testStatus}`, { method: "PATCH", body: JSON.stringify({ estado: test.value }) });
    else if (role) await api(`/api/admin/users/${role.dataset.userRole}`, { method: "PATCH", body: JSON.stringify({ role: role.value }) });
    else if (active) await api(`/api/admin/users/${active.dataset.userActive}`, { method: "PATCH", body: JSON.stringify({ activo: Number(active.value) }) });
    else return;
    await loadAdminData();
  } catch(error) { alert(error.message); await loadAdminData(); }
});

function renderUsers() {
  document.querySelector("#userRows").innerHTML = state.users.map(u => `<tr><td><strong>${escapeHtml(u.nombre)}</strong></td><td>${escapeHtml(u.username)}</td><td><select data-user-role="${u.id}" ${u.id === state.user.id ? "disabled" : ""}>${statusOptions(["admin", "empleado", "cliente"],u.role)}</select></td><td><select data-user-active="${u.id}" ${u.id === state.user.id ? "disabled" : ""}><option value="1" ${u.activo ? "selected" : ""}>Activo</option><option value="0" ${!u.activo ? "selected" : ""}>Desactivado</option></select></td></tr>`).join("");
}
document.querySelector("#userForm").addEventListener("submit", async event => {
  event.preventDefault(); const form = event.currentTarget; const feedback = document.querySelector("#userFeedback");
  const button = form.querySelector('[type="submit"]'); button.disabled = true;
  try {
    const created = await api("/api/admin/users", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    form.reset();
    if (created.role === 'cliente') {
      feedback.textContent = 'Cuenta de cliente creada. Su acceso está en el portal de clientes. ';
      const link = document.createElement('a');
      link.href = created.loginUrl; link.target = '_blank'; link.rel = 'noopener';
      link.textContent = 'Abrir inicio de sesión del cliente';
      feedback.append(link);
      await loadAdminData();
      return;
    }
    feedback.textContent = 'Cuenta del equipo creada. Abriendo el inicio de sesión…';
    await api('/api/admin/logout', { method: 'POST' }); announceStaffChange();
    location.assign(created.loginUrl);
  }
  catch(error) { feedback.textContent = error.message; }
  finally { button.disabled = false; }
});
function updateGalleryPreview() {
  const paths = [...new Set([vehicleForm.elements.imagen.value, ...vehicleForm.elements.imagenes.value.split(/\r?\n/)].map(x => x.trim()).filter(x => /^(assets|uploads)\//.test(x)))];
  document.querySelector("#galleryPreview").innerHTML = paths.map(p => `<img src="${escapeHtml(p)}" alt="Vista de la galería actual">`).join("");
}
vehicleForm.elements.imagenes.addEventListener("input", updateGalleryPreview);
vehicleForm.elements.imagen.addEventListener("input", updateGalleryPreview);
document.querySelectorAll(".admin-sidebar nav a").forEach(a => a.addEventListener("click", () => {
  document.querySelectorAll(".admin-sidebar nav a").forEach(b => b.classList.toggle("active",a === b));
}));
bootstrap();

function requestIdentity(r) {
  if (r.user_id && r.account_role !== 'cliente') return '<strong class="request-review">Registro anterior por revisar</strong><small>Se guardó con una cuenta del equipo; cliente sin confirmar.</small>';
  return `<strong>${escapeHtml(r.nombre)}</strong>`;
}
function requestContact(r, type) {
  if (!r.user_id) return '<small class="legacy-request">Registro anterior sin cuenta vinculada</small>';
  if (r.account_role !== 'cliente') return `<small>Cuenta registrada: ${escapeHtml(r.username)} · ${escapeHtml(r.account_role)} · Solicitud #${r.id}</small><small>Revisar identidad del cliente antes de continuar.</small>`;
  return `<small>Cuenta: ${escapeHtml(r.username)} · ID ${r.user_id} · Solicitud #${r.id}</small><button class="mini-button" type="button" data-request-thread="${r.id}" data-request-type="${type}">Mensajes (${r.message_count})</button>${r.last_message ? `<small class="last-message">Último: ${escapeHtml(r.last_message.slice(0, 100))}</small>` : ''}`;
}
const threadDialog = document.createElement('dialog');
threadDialog.className = 'staff-thread-dialog';
threadDialog.setAttribute('aria-label', 'Conversación de la solicitud');
document.body.append(threadDialog);
let staffConversation = null;
function threadMessages(messages) {
  return messages.length ? messages.map(m => `<article class="staff-message ${m.sender_kind === 'cliente' ? 'customer' : ''}"><strong>${escapeHtml(m.sender_name)} · ${m.sender_kind === 'cliente' ? 'Cliente' : 'Equipo Nexora'}</strong><p>${escapeHtml(m.body)}</p><small>${escapeHtml(new Date(m.created_at.replace(' ', 'T') + 'Z').toLocaleString('es-MX'))}</small></article>`).join('') : '<p>Aún no hay mensajes. Puedes escribir al cliente para dar seguimiento.</p>';
}
async function refreshStaffConversation() {
  if (!staffConversation || !threadDialog.open) return;
  const target = staffConversation;
  const data = await api(`/api/admin/requests/${target.type}/${target.id}/messages`);
  if (staffConversation !== target) return;
  threadDialog.querySelector('#threadIdentity').textContent = `${data.request.nombre} · ${data.request.username} · ${data.request.estado}`;
  threadDialog.querySelector('#staffMessages').innerHTML = threadMessages(data.messages);
}
async function openStaffConversation(type, id) {
  staffConversation = { type, id };
  threadDialog.innerHTML = `<div class="thread-content"><button type="button" class="mini-button thread-close">Cerrar conversación</button><h2>${type === 'quotes' ? 'Cotización' : 'Prueba'} #${id}</h2><p id="threadIdentity"></p><button class="mini-button" type="button" id="refreshThread">Actualizar mensajes</button><div id="staffMessages" aria-live="polite"></div><form id="staffMessageForm"><label>Mensaje al cliente<textarea name="body" required maxlength="2000" rows="4"></textarea></label><p class="form-error" hidden></p><button class="primary-button" type="submit">Enviar mensaje</button></form></div>`;
  threadDialog.querySelector('.thread-close').onclick = () => threadDialog.close();
  threadDialog.querySelector('#refreshThread').onclick = () => refreshStaffConversation().catch(e => alert(e.message));
  threadDialog.querySelector('#staffMessageForm').onsubmit = async event => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('[type="submit"]'); button.disabled = true;
    try {
      await api(`/api/admin/requests/${type}/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: form.elements.body.value }) });
      form.reset(); form.querySelector('.form-error').hidden = true;
      await refreshStaffConversation();
    } catch(e) { showError(form.querySelector('.form-error'),e.message); }
    finally { button.disabled = false; }
  };
  threadDialog.showModal();
  try { await refreshStaffConversation(); } catch(e) { showError(threadDialog.querySelector('.form-error'),e.message); }
}
threadDialog.addEventListener('close', () => { staffConversation = null; });
document.addEventListener('click', e => {
  const button = e.target.closest('[data-request-thread]');
  if (button) openStaffConversation(button.dataset.requestType, button.dataset.requestThread);
});
const refreshRequestsButton = document.createElement('button');
refreshRequestsButton.type = 'button'; refreshRequestsButton.className = 'mini-button refresh-requests'; refreshRequestsButton.textContent = 'Actualizar solicitudes';
const refreshRequestsStatus = document.createElement('span');
refreshRequestsStatus.className = 'request-refresh-status'; refreshRequestsStatus.setAttribute('role','status');
statsGrid.after(refreshRequestsButton, refreshRequestsStatus);
let staffRefreshing = false;
async function refreshStaffRequests() {
  if (staffRefreshing || adminView.hidden) return;
  const identity = state.user?.id;
  staffRefreshing = true; refreshRequestsButton.disabled = true;
  try {
    const [dashboard, quotes, drives] = await Promise.all([api('/api/admin/dashboard'), api('/api/admin/quotes'), api('/api/admin/test-drives')]);
    if (state.user?.id !== identity) return;
    state.quotes = quotes; state.testDrives = drives;
    renderDashboard(dashboard); renderQuotes(); renderTestDrives();
    refreshRequestsStatus.textContent = `Actualizado ${new Date().toLocaleTimeString('es-MX')} · revisión automática cada 15 s`;
    await refreshStaffConversation();
  } catch(e) { refreshRequestsStatus.textContent = e.message; }
  finally { staffRefreshing = false; refreshRequestsButton.disabled = false; }
}
refreshRequestsButton.onclick = refreshStaffRequests;
setInterval(() => {
  if (document.hidden || (!threadDialog.open && document.activeElement?.matches('input,select,textarea,button[data-request-thread]'))) return;
  refreshStaffRequests();
}, 15000);

function announceStaffChange() {
  try { localStorage.setItem('nexora-staff-auth-change', `${Date.now()}-${Math.random()}`); } catch { /* La API también comprueba la identidad. */ }
}
window.addEventListener('storage', event => {
  if (event.key === 'nexora-staff-auth-change') { showLogin(); showError(loginError, 'La sesión del equipo cambió en otra pestaña. Vuelve a iniciar sesión.'); }
});
const loginParams = new URLSearchParams(location.search);
if (loginParams.has('usuario')) loginForm.elements.username.value = loginParams.get('usuario');
if (loginParams.has('registro')) {
  const notice = document.querySelector('#registrationNotice'); notice.hidden = false;
  notice.textContent = 'Cuenta creada. Inicia sesión con el usuario y la contraseña que acabas de registrar.';
}
document.querySelector('#staffPasswordForm').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget; const feedback = document.querySelector('#staffPasswordFeedback');
  const button = form.querySelector('[type="submit"]'); button.disabled = true;
  try { await api('/api/admin/password', { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(form))) }); form.reset(); feedback.textContent = 'Contraseña actualizada.'; }
  catch(error) { feedback.textContent = error.message; }
  finally { button.disabled = false; }
});
