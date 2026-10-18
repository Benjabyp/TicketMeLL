const CONFIG = { url: "https://olrubitctjhovzadytct.supabase.co", anonKey: "sb_publishable_HtoEUxoIP1PNHMUkz2VLGw_2dtNa3c1", bucket: "evidencias" };
const state = { tickets: [], history: [], ready: false };
const $ = (selector) => document.querySelector(selector);
const rows = $("#ticket-rows");
const form = $("#ticket-form");
const ticketDialog = $("#ticket-dialog");
const detailDialog = $("#detail-dialog");
let toastTimer;

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === "dark";
  const button = $("#theme-toggle");
  button.textContent = isDark ? "☼" : "☾";
  button.setAttribute("aria-label", isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  button.title = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  try { localStorage.setItem("ticketmell-theme", theme); } catch {}
}

function configured() { return CONFIG.url && CONFIG.anonKey; }
function headers(extra = {}) { return { apikey: CONFIG.anonKey, Authorization: `Bearer ${CONFIG.anonKey}`, ...extra }; }
async function api(path, options = {}) {
  const response = await fetch(`${CONFIG.url}/rest/v1/${path}`, { ...options, headers: headers(options.headers || {}) });
  if (!response.ok) { const body = await response.text(); throw new Error(body || `Error ${response.status}`); }
  if (response.status === 204) return null;
  return response.json();
}
function notify(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 3200); }
function initials(name) { return (name || "?").trim().split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase(); }
function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char])); }
function dateLabel(value) { return new Intl.DateTimeFormat("es-PE", { day:"2-digit", month:"short", year:"numeric" }).format(new Date(value)); }
function statusClass(value) { return value === "Realizado" ? "status-done" : value === "En proceso" ? "status-progress" : "status-pending"; }
function priorityClass(value) { return value === "Alta" ? "priority-high" : value === "Baja" ? "priority-low" : "priority-medium"; }
function refreshCounters() {
  $("#total-count").textContent = state.tickets.length;
  $("#pending-count").textContent = state.tickets.filter(t => t.status === "Pendiente").length;
  $("#progress-count").textContent = state.tickets.filter(t => t.status === "En proceso").length;
  $("#done-count").textContent = state.tickets.filter(t => t.status === "Realizado").length;
  $("#nav-count").textContent = state.tickets.length;
}
function filteredTickets() {
  const term = $("#search-input").value.trim().toLocaleLowerCase("es");
  const status = $("#status-filter").value, priority = $("#priority-filter").value;
  return state.tickets.filter(ticket => (!status || ticket.status === status) && (!priority || ticket.priority === priority) && (!term || [ticket.topic,ticket.user_name,ticket.infrastructure,ticket.description].some(value => (value || "").toLocaleLowerCase("es").includes(term))));
}
function render() {
  refreshCounters();
  const tickets = filteredTickets();
  $("#row-count").textContent = `${tickets.length} ${tickets.length === 1 ? "caso" : "casos"}`;
  if (!tickets.length) { rows.innerHTML = `<tr><td colspan="8" class="empty-state">${state.ready ? "No hay casos que coincidan. Registra un nuevo pendiente para comenzar." : "Conectando con la base de datos…"}</td></tr>`; return; }
  rows.innerHTML = tickets.map(ticket => `<tr>
    <td class="case-cell"><span class="case-title" title="${escapeHtml(ticket.topic)}">${escapeHtml(ticket.topic)}</span><span class="case-description" title="${escapeHtml(ticket.description)}">${escapeHtml(ticket.description)}</span></td>
    <td><span class="person-cell"><span class="person-avatar">${escapeHtml(initials(ticket.user_name))}</span>${escapeHtml(ticket.user_name)}</span></td>
    <td><span class="infra-tag">${escapeHtml(ticket.infrastructure)}</span></td>
    <td><select class="pill inline-select ${priorityClass(ticket.priority)}" data-field="priority" data-id="${ticket.id}" aria-label="Prioridad">${["Alta","Media","Baja"].map(v=>`<option ${ticket.priority===v?"selected":""}>${v}</option>`).join("")}</select></td>
    <td><select class="pill inline-select ${statusClass(ticket.status)}" data-field="status" data-id="${ticket.id}" aria-label="Estado">${["Pendiente","En proceso","Realizado"].map(v=>`<option ${ticket.status===v?"selected":""}>${v}</option>`).join("")}</select></td>
    <td><div class="progress-cell"><div class="work-progress ${ticket.status === "Realizado" ? "complete" : ""}" role="img" aria-label="${ticket.status === "Realizado" ? "Trabajo completado" : "Trabajo en seguimiento"}"><span></span></div><small>${ticket.status === "Realizado" ? "Completado" : "En seguimiento"}</small></div></td>
    <td class="date-cell">${dateLabel(ticket.created_at)}</td>
    <td><div class="row-actions"><button class="text-action" data-action="view" data-id="${ticket.id}">Ver ediciones</button><button class="text-action" data-action="edit" data-id="${ticket.id}" aria-label="Editar">Editar</button></div></td>
  </tr>`).join("");
}
async function loadTickets() {
  if (!configured()) { $("#sync-label").textContent = "Falta configurar Supabase"; rows.innerHTML = `<tr><td colspan="8" class="empty-state">La app está lista. Configura Supabase siguiendo el README para empezar a registrar pendientes.</td></tr>`; return; }
  $("#sync-label").textContent = "Sincronizando…";
  try { state.tickets = await api("tickets?select=*&order=created_at.desc"); state.ready = true; $("#sync-label").textContent = "Sincronizado"; render(); }
  catch (error) { state.ready = false; $("#sync-label").textContent = "Error de conexión"; rows.innerHTML = `<tr><td colspan="8" class="empty-state">No se pudo cargar la información. Revisa la configuración de Supabase.<br><small>${escapeHtml(error.message)}</small></td></tr>`; }
}
async function uploadFile(file) {
  if (!file) return null;
  if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) throw new Error("Adjunta una imagen válida de hasta 5 MB.");
  const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g,"-");
  const path = `${crypto.randomUUID()}-${safeName}`;
  const response = await fetch(`${CONFIG.url}/storage/v1/object/${CONFIG.bucket}/${path}`, { method:"POST", headers:headers({"Content-Type":file.type,"x-upsert":"false"}), body:file });
  if (!response.ok) throw new Error("No se pudo subir la imagen. Verifica el bucket de evidencias.");
  return `${CONFIG.url}/storage/v1/object/public/${CONFIG.bucket}/${path}`;
}
function payloadFromForm() { const data = new FormData(form); return { user_name:data.get("user_name").trim(), infrastructure:data.get("infrastructure").trim(), topic:data.get("topic").trim(), description:data.get("description").trim(), priority:data.get("priority"), status:data.get("status") }; }
async function saveTicket(event) {
  event.preventDefault(); $("#form-error").textContent = ""; const button = $("#save-button"); button.disabled = true; button.textContent = "Guardando…";
  try {
    const data = payloadFromForm(), file = form.elements.attachment.files[0], id = form.elements.id.value;
    if (!configured()) throw new Error("Configura primero Supabase según el README.");
    const attachment = file ? await uploadFile(file) : null;
    if (attachment) data.attachment_url = attachment;
    if (id) { await api(`tickets?id=eq.${encodeURIComponent(id)}`, { method:"PATCH", headers:{"Content-Type":"application/json","Prefer":"return=minimal"}, body:JSON.stringify(data) }); notify("Pendiente actualizado."); }
    else { await api("tickets", { method:"POST", headers:{"Content-Type":"application/json","Prefer":"return=minimal"}, body:JSON.stringify(data) }); notify("Pendiente registrado."); }
    ticketDialog.close(); form.reset(); await loadTickets();
  } catch (error) { $("#form-error").textContent = error.message.includes("duplicate") ? "Ocurrió un problema al guardar." : error.message; }
  finally { button.disabled = false; button.textContent = form.elements.id.value ? "Guardar cambios" : "Guardar pendiente"; }
}
async function updateField(id, field, value) {
  try { await api(`tickets?id=eq.${encodeURIComponent(id)}`, { method:"PATCH", headers:{"Content-Type":"application/json","Prefer":"return=minimal"}, body:JSON.stringify({[field]:value}) }); const ticket=state.tickets.find(t=>String(t.id)===String(id)); if(ticket) ticket[field]=value; render(); notify("Cambio guardado."); }
  catch(error) { notify(`No se pudo guardar el cambio: ${error.message}`); await loadTickets(); }
}
async function viewDetails(id) {
  const ticket=state.tickets.find(item=>String(item.id)===String(id)); if(!ticket)return;
  $("#detail-title").textContent=ticket.topic;
  $("#detail-content").innerHTML=`<div class="detail-grid"><div class="detail-field"><small>Usuario</small><strong>${escapeHtml(ticket.user_name)}</strong></div><div class="detail-field"><small>Infraestructura</small><strong>${escapeHtml(ticket.infrastructure)}</strong></div><div class="detail-field"><small>Prioridad</small><strong><span class="pill ${priorityClass(ticket.priority)}">${escapeHtml(ticket.priority)}</span></strong></div><div class="detail-field"><small>Estado actual</small><strong><span class="pill ${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span></strong></div><div class="detail-field"><small>Fecha de registro</small><strong>${dateLabel(ticket.created_at)}</strong></div><div class="detail-field"><small>Evidencia</small><strong>${ticket.attachment_url?`<a class="attachment-link" href="${escapeHtml(ticket.attachment_url)}" target="_blank" rel="noreferrer">Ver imagen ↗</a>`:"Sin adjunto"}</strong></div></div><div class="detail-description">${escapeHtml(ticket.description)}</div>`;
  $("#history-list").innerHTML="<div class='history-item'><strong>Cargando historial…</strong></div>"; $("#history-count").textContent=""; detailDialog.showModal();
  try { const edits=await api(`ticket_history?ticket_id=eq.${encodeURIComponent(id)}&select=*&order=created_at.desc`); $("#history-count").textContent=`(${edits.length})`; $("#history-list").innerHTML=edits.length?edits.map(edit=>`<div class="history-item"><strong>${escapeHtml(edit.field_label)}</strong><p>${escapeHtml(edit.old_value||"—")} → ${escapeHtml(edit.new_value||"—")}</p><small>${dateLabel(edit.created_at)}${edit.changed_by?` · ${escapeHtml(edit.changed_by)}`:""}</small></div>`).join(""):"<div class='history-item'><strong>Sin ediciones todavía</strong><p>Los cambios en prioridad, estado y datos del caso aparecerán aquí.</p></div>"; }
  catch(error) { $("#history-list").innerHTML="<div class='history-item'><strong>No se pudo cargar el historial</strong><p>Revisa la configuración de la tabla de historial.</p></div>"; }
}
function editTicket(id) { const ticket=state.tickets.find(item=>String(item.id)===String(id)); if(!ticket)return; form.reset(); form.elements.id.value=ticket.id; for(const key of ["user_name","infrastructure","topic","description","priority","status"]) form.elements[key].value=ticket[key]||""; $("#form-title").textContent="Editar pendiente"; $("#save-button").textContent="Guardar cambios"; $("#file-help").textContent=ticket.attachment_url?"Ya tiene una imagen adjunta. Selecciona otra para reemplazarla.":"Selecciona una imagen como evidencia."; $("#form-error").textContent=""; ticketDialog.showModal(); }
function openNewTicket() { form.reset(); form.elements.id.value=""; $("#form-title").textContent="Nuevo pendiente"; $("#save-button").textContent="Guardar pendiente"; $("#file-help").textContent="Selecciona una imagen como evidencia."; $("#form-error").textContent=""; ticketDialog.showModal(); }
function exportExcel() {
  if(!state.tickets.length){notify("No hay casos para exportar.");return;}
  const data=state.tickets.map(ticket=>({"Nombre del usuario":ticket.user_name,"Infraestructura":ticket.infrastructure,"Tema":ticket.topic,"Descripción del caso":ticket.description,"Adjunto":ticket.attachment_url||"","Fecha de registro":new Date(ticket.created_at).toLocaleString("es-PE"),"Prioridad":ticket.priority,"Estado":ticket.status}));
  if(window.XLSX){const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(data),"Pendientes");XLSX.writeFile(book,`pendientes-infraestructura-${new Date().toISOString().slice(0,10)}.xlsx`);notify("Archivo Excel descargado.");return;}
  const quote=value=>`"${String(value??"").replaceAll('"','""')}"`,headers=Object.keys(data[0]),lines=[headers.map(quote).join(";"),...data.map(row=>headers.map(key=>quote(row[key])).join(";"))];
  const blob=new Blob(["\ufeff"+lines.join("\r\n")],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`pendientes-infraestructura-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url);notify("Archivo compatible con Excel descargado.");
}
rows.addEventListener("change",event=>{const el=event.target;if(el.dataset.field)updateField(el.dataset.id,el.dataset.field,el.value);});
rows.addEventListener("click",event=>{const button=event.target.closest("button[data-action]");if(!button)return;button.dataset.action==="view"?viewDetails(button.dataset.id):editTicket(button.dataset.id);});
$("#new-ticket").addEventListener("click",openNewTicket); $("#refresh-button").addEventListener("click",loadTickets); $("#export-button").addEventListener("click",exportExcel); form.addEventListener("submit",saveTicket);
$("#theme-toggle").addEventListener("click",()=>setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
$("#search-input").addEventListener("input",render); $("#status-filter").addEventListener("change",render); $("#priority-filter").addEventListener("change",render);
document.querySelectorAll("[data-close]").forEach(button=>button.addEventListener("click",()=>button.closest("dialog").close()));
document.querySelectorAll("dialog").forEach(dialog=>dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();}));
loadTickets();
setTheme(document.documentElement.dataset.theme || "dark");
