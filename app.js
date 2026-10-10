/* ============================================================
 * SEP-AGENDA — APP FRONTEND (Portal del Estudiante · PWA)
 * © Oscar Polanía — Experto en Soluciones Digitales · +57 310 323 0712
 * Software propietario; cualquier modificación por terceros anula la garantía.
 * FASE ACTUAL: Fase 4 SEP · Entrega 6 (04/09/2026) — ZONA DE ESTUDIANTES
 * (tablero por avance real: acciones pendientes, accesos rápidos,
 *  mis documentos, mis pagos, seguimiento y mi contrato)
 * ------------------------------------------------------------
 * Login (clave dinámica), datos propios del estudiante,
 * selección de cupo con la RUEDA iOS (solo horarios libres),
 * agendar / reagendar / cancelar. Mismo /exec que SEP GROUP.
 * ============================================================ */ 

/* ================== CONFIGURACIÓN ================== */
const API_BASE = 'https://script.google.com/macros/s/AKfycbyrb7dXsicBPJwEkkMJJfojtkPhfKeBxiFKqMHac348M94apbwLsRaz0bhpL0sX8HoTSQ/exec';
const LOGO_DEFAULT = 'https://botheart911.github.io/SEP-GROUP/img/sep_logo.png';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

/* ================== LOADER ================== */
const loader = $('#loader');
let loadingCount = 0, loaderTimer = null;
function startLoading(){ loadingCount++; if (loadingCount === 1){ loaderTimer = setTimeout(()=>{ loader.classList.remove('hidden'); loaderTimer = null; }, 120); } }
function stopLoading(){ if (loadingCount === 0) return; loadingCount--; if (loadingCount === 0){ if (loaderTimer){ clearTimeout(loaderTimer); loaderTimer = null; } loader.classList.add('hidden'); } }

/* ================== API (text/plain evita preflight CORS) ================== */
/* 07/10/2026 — RESPUESTA COMPRIMIDA Y MEDICIÓN (igual que SEP-GROUP).
   · z=1: si el navegador abre gzip (DecompressionStream) el servidor
     manda lo grande comprimido ({ok, gz}); sin soporte, como antes.
   · Tiempos de pantalla: ruta, ms y KB viajan pegados a la siguiente
     lectura (_mf) a la hoja MEDICION. Siempre lo lento; del resto 1 de 3. */
const API_GZ = (typeof DecompressionStream === 'function');
const MED_PEND = [];
function medAnotarFront_(ruta, ms, kb, det){
  if (ms < 3000 && Math.random() >= 1/3) return;
  if (MED_PEND.length >= 8) MED_PEND.shift();
  MED_PEND.push(['agenda:' + ruta, Math.round(ms), Math.round(kb * 10) / 10, det || '']);
}
async function apiAbrirGz_(b64){
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const flujo = new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(flujo).text());
}
async function apiGet(action, params = {}){
  startLoading();
  const t0 = performance.now();
  try{
    const url = new URL(API_BASE);
    const extra = {};
    if (API_GZ) extra.z = '1';
    if (MED_PEND.length) extra._mf = JSON.stringify(MED_PEND.splice(0, MED_PEND.length));
    url.search = new URLSearchParams({ action, ...params, ...extra }).toString();
    const r = await fetch(url.toString(), { method:'GET' });
    const txt = await r.text();
    let j = JSON.parse(txt);
    if (j && j.gz) j = await apiAbrirGz_(j.gz);
    medAnotarFront_(action, performance.now() - t0, txt.length / 1024, j && j.ok === false ? 'error' : '');
    if (!j.ok) throw new Error(j.error || 'Error');
    return j.data;
  } finally { stopLoading(); }
}
/* FASE 5.1-C (07/10/2026) — un solo reintento seguro.
   · Las ESCRITURAS (opts.escritura) viajan con un id de petición (rid):
     si la red corta o llega el 404 de echo de Google, se reintenta UNA
     vez con el MISMO rid y el servidor devuelve la misma respuesta sin
     repetir la acción (idempotencia por rid en el router).
   · Las lecturas se reintentan igual, sin rid: repetir una lectura no
     cambia nada. Nunca hay reintentos ciegos de una escritura. */
function ridNuevo_(){ return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
async function apiPost(action, body = {}, opts = {}){
  /* AJUSTES FASE 5 — opts.fondo: lectura de fondo, sin aviso de carga. */
  if (!opts.fondo) startLoading();
  try{
    const url = API_BASE + '?action=' + encodeURIComponent(action);
    const datos = opts.escritura ? Object.assign({}, body, { rid: body.rid || ridNuevo_() }) : body;
    const enviar = async () => {
      const r = await fetch(url, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body: JSON.stringify(datos) });
      if (r.status === 404) { const e = new Error('echo404'); e.reintentar = true; throw e; }
      try { return await r.json(); } catch (_) { const e = new Error('RESPUESTA_NO_JSON'); e.reintentar = true; throw e; }
    };
    let j;
    try { j = await enviar(); }
    catch (e) {
      if (!(e && (e.reintentar || e instanceof TypeError || e.name === 'TypeError'))) throw e;
      await new Promise(res => setTimeout(res, 800));
      try { j = await enviar(); }
      catch (_) { throw new Error('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'); }
    }
    if (!j.ok) throw new Error(j.error || 'Error');
    return j.data;
  } finally { if (!opts.fondo) stopLoading(); }
}

/* ================== SESIÓN ================== */
let EST = null;                      // datos del estudiante (estudianteMap_)
const SESSION_KEY = 'sepAgendaSesion';
function guardarSesion_(cred){ try{ localStorage.setItem(SESSION_KEY, JSON.stringify(cred)); }catch(_){} }
function leerSesion_(){ try{ const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; }catch(_){ return null; } }
function borrarSesion_(){ try{ localStorage.removeItem(SESSION_KEY); }catch(_){} }
function cred_(){ const s = leerSesion_() || {}; return { clave: s.clave || '' }; }

/* ================== TABLERO AL DÍA (Ajustes Fase 5 · 09/10/2026) ==================
   Medido con el rechazo real del 09/10: el portal solo traía el tablero al
   entrar, así que un documento rechazado (o cualquier cambio que haga SEP)
   no aparecía como acción pendiente hasta cerrar y volver a abrir la app.
   Ahora, cuando el participante VUELVE a la app (pestaña o app al frente)
   o regresa al inicio desde un módulo, y el tablero tiene más de 45 s, se
   pide de fondo (portalInicio, ~6 KB) y se repinta el inicio. Sin relojes:
   solo cuando la persona vuelve. Una respuesta de otra sesión no pisa la
   actual, y nunca hay dos pedidas a la vez. */
let PORTAL_T = 0, PORTAL_PIDIENDO = false;
const PORTAL_FRESCO_MS = 45000;
async function portalRefrescar_(){
  if (!EST || PORTAL_PIDIENDO || document.hidden) return;
  if (Date.now() - PORTAL_T < PORTAL_FRESCO_MS) return;
  const clave = cred_().clave;
  if (!clave) return;
  PORTAL_PIDIENDO = true;
  const t0 = performance.now();
  try {
    const p = await apiPost('portalInicio', { clave }, { fondo: true });
    if (!EST || cred_().clave !== clave || !p) return;          // otra sesión: no se pisa
    EST.portal = p;
    PORTAL_T = Date.now();
    medAnotarFront_('portalRefrescar', performance.now() - t0, 0, '');
    const home = document.getElementById('view-home');
    if (home && home.classList.contains('active')) renderHome_();
  } catch (_) { /* sin red: queda lo que había */ }
  finally { PORTAL_PIDIENDO = false; }
}

/* ================== VISTAS ================== */
function showView(id){
  if (id === 'home') setTimeout(portalRefrescar_, 0);
  $$('.view').forEach(el => el.classList.remove('active'));
  ($('#view-' + id) || document.getElementById(id))?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'auto' });
}

/* ================== UTILIDADES ================== */
function escapeHtml_(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function toast_(icon, title){ Swal.fire({ icon, title, timer: 1400, showConfirmButton:false }); }
function error_(msg){ Swal.fire({ icon:'error', title:'Ups', text:String(msg||'Ocurrió un error') }); }

/* 07/10/2026 — DOCUMENTOS PRIVADOS. Tus archivos (contrato, cédula,
   comprobantes, formulario, Mis documentos, hoja de vida) ya no son
   públicos: se abren con tu cuenta de Google, la del correo con el que
   te registraste. Si ese correo no es cuenta de Google, la app te lo
   explica en vez de abrir algo que Google no te va a mostrar.
   Los enlaces de tus archivos llevan data-privado="1". */
function archivoAcceso_(){ return (EST && EST.accesoArchivos) || null; }
function archivoSinGoogle_(){ const a = archivoAcceso_(); return !!(a && a.google === false); }
function avisoArchivoSinGoogle_(){
  const a = archivoAcceso_() || {};
  Swal.fire({ icon:'info', title:'Tu archivo está guardado de forma privada',
    html: 'Por seguridad, tus documentos solo se abren con una cuenta de Google, y tu correo <b>' +
          escapeHtml_(a.correo || '') + '</b> no es una cuenta de Google.<br><br>' +
          'Aquí sigues viendo el estado de cada documento. Si necesitas una copia, pídesela a tu asesor(a).',
    confirmButtonText: 'Entendido' });
}
function archivoNotaTexto_(){
  return '';   /* Pausado 07/10/2026: los documentos siguen como estaban (con enlace). */
  const a = archivoAcceso_(); const c = a && a.correo;
  return '🔒 Archivo privado: se abre con tu cuenta de Google' + (c ? ' (' + c + ')' : '') +
         '. Si no lo ves, toca «Abrir en Drive» e inicia sesión con ese correo. ' +
         'Si lo acabas de subir, tu acceso se activa en máximo 30 minutos.';
}
document.addEventListener('click', function (e) {
  const a = e.target && e.target.closest ? e.target.closest('a[data-privado]') : null;
  if (!a || !archivoSinGoogle_()) return;
  e.preventDefault(); e.stopPropagation(); avisoArchivoSinGoogle_();
}, true);

/* ============================================================
 * LOGIN
 * ============================================================ */
async function hacerLogin_(clave, silencioso){
  const data = await apiPost('loginEstudiante', { clave });
  EST = data;
  PORTAL_T = Date.now();
  guardarSesion_({ clave: clave });
  renderHome_();
  showView('home');
  if (!silencioso) toast_('success', '¡Bienvenido(a)!');
}

$('#btn-login')?.addEventListener('click', async ()=>{
  const clave = $('#in-clave').value.trim().toLowerCase();
  if (!clave) return Swal.fire({ icon:'warning', title:'Falta tu clave', text:'Ingresa la clave de acceso que recibiste.' });
  try { await hacerLogin_(clave, false); }
  catch (e){ error_(e.message || e); }
});
$('#in-clave')?.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') $('#btn-login').click(); });

$('#btn-logout')?.addEventListener('click', ()=>{
  Swal.fire({ icon:'question', title:'¿Cerrar sesión?', showCancelButton:true,
    confirmButtonText:'Sí, salir', cancelButtonText:'Cancelar' }).then(r=>{
    if (r.isConfirmed){ borrarSesion_(); EST = null; $('#in-clave').value=''; showView('login'); }
  });
});

/* ============================================================
 * HOME — render según estado
 * ============================================================ */
function renderHome_(){
  if (EST.logo){ $('#home-logo').src = EST.logo; $('#login-logo').src = EST.logo; }
  const cont = $('#home-content');

  /* FASE 4 · ENTREGA 6 (04/09/2026) — el inicio lo arma js/portal.js a
     partir del tablero que manda el backend (EST.portal): las dos caras
     del 4.1/4.2, las acciones pendientes del 4.3 y los accesos rápidos
     con las nueve reglas de desbloqueo del 4.4. Aquí ya no se decide
     qué se ve: esa verdad vive en Portal.gs.

     Si el módulo no estuviera cargado (o el backend todavía no manda
     `portal`), se cae al inicio de siempre, que sigue más abajo: la
     app nunca se queda en blanco por esto. */
  if (typeof PORTAL !== 'undefined' && EST.portal){
    cont.innerHTML = PORTAL.render(EST);
    $$('.app-version-line').forEach(el => { if (APP_VERSION_LOADED) el.textContent = 'Versión ' + APP_VERSION_LOADED; });
    bindHomeActions_();
    PORTAL.bind(EST);
    return;
  }

  cont.innerHTML = homeClasico_(EST);
  $$('.app-version-line').forEach(el => { if (APP_VERSION_LOADED) el.textContent = 'Versión ' + APP_VERSION_LOADED; });
  bindHomeActions_();
}

/* Inicio de antes de la Entrega 6. Se conserva como red de seguridad:
   es lo que se pinta si Portal.gs no está desplegado todavía. */
function homeClasico_(e){
  let html = `
    <div class="welcome">
      <div class="hello">Hola,</div>
      <div class="name">${escapeHtml_(e.nombres)} ${escapeHtml_(e.apellidos)}</div>
      <span class="estado-pill"><span class="dot" style="background:${e.estadoColor}"></span>${escapeHtml_(e.estadoLabel)}</span>
    </div>`;

  /* Tarjeta de programa */
  html += `
    <div class="card glass">
      <h2><span class="em">🎓</span> Tu programa</h2>
      <div class="kv"><div class="k">Programa</div><div class="v big">${escapeHtml_(e.programa || '—')}</div></div>
      ${e.promo ? `<div class="kv"><div class="k">Promoción</div><div class="v">${escapeHtml_(e.promo)}</div></div>` : ''}
      <div class="kv"><div class="k">Tu asesor(a) comercial</div><div class="v">${escapeHtml_(e.asesor || 'Por asignar')}</div></div>
      <div class="kv"><div class="k">Tu clave</div><div class="v" style="letter-spacing:1px">${escapeHtml_(e.claveAcceso || '—')}</div></div>
    </div>`;

  if (typeof CONTRATO !== 'undefined') html += CONTRATO.tarjeta(e);
  if (typeof FORMU !== 'undefined') html += FORMU.tarjeta(e);
  if (typeof OFERTAS !== 'undefined') html += OFERTAS.tarjeta(e);

  html += bloqueAsesoria_(e);

  if (e.estado === 'PENDIENTE_PAGO' && e.pago){
    html += bloquePago_(e.pago);
  }

  if (e.trazabilidad && e.trazabilidad.length){
    const items = e.trazabilidad.slice().reverse().map(t => `<li>${escapeHtml_(t)}</li>`).join('');
    html += `
      <div class="card">
        <h2><span class="em">🧭</span> Seguimiento de tu proceso</h2>
        <ul class="traza-list">${items}</ul>
      </div>`;
  }

  html += `
    <div class="app-foot">
      <b>SEP Colombia Group SAS</b> · NIT 901.131.347-0<br>
      © Oscar Polanía — Experto en Soluciones Digitales<br>
      <span class="app-version-line">Versión —</span>
    </div>`;

  return html;
}

/* Fase 4 · Entrega 2 — un módulo que acaba de cambiar los datos del
   estudiante (por ejemplo, al seleccionar una oferta) los deja aquí y
   el inicio se repinta al día, sin otra llamada al backend. */
function aplicarEstudiante_(data){
  if (!data) return;
  EST = data;
  renderHome_();
}

function bloqueAsesoria_(e){
  if (e.tieneAgenda){
    return `
      <div class="card">
        <h2><span class="em">📅</span> Tu asesoría</h2>
        <div class="slot-box">
          <div class="sb-label">Cita confirmada</div>
          <div class="sb-date">${escapeHtml_(e.fechaHoraAgendada)}</div>
        </div>
        ${e.meetLink
          ? `<a class="btn-meet" href="${escapeHtml_(e.meetLink)}" target="_blank" rel="noopener">🎥 Entrar a la videollamada (Meet)</a>`
          : `<p class="muted center" style="margin:6px 0">El enlace de Meet aparecerá aquí.</p>`}
        <div class="agenda-actions">
          <button class="btn btn-ghost" id="act-reagendar">Reagendar</button>
          <button class="btn btn-danger" id="act-cancelar">Cancelar</button>
        </div>
      </div>`;
  }
  if (e.puedeAgendar){
    return `
      <div class="card">
        <h2><span class="em">📅</span> Tu asesoría</h2>
        <div class="agenda-empty">
          <div class="ae-ic">🗓️</div>
          <p>¡Tu perfil fue aprobado! Agenda tu asesoría personalizada en el horario que mejor te convenga.</p>
          <button class="btn btn-accent btn-block" id="act-agendar">Agendar mi asesoría</button>
        </div>
      </div>`;
  }
  /* Estados sin acción de agenda */
  let msg = 'Aquí podrás agendar tu asesoría una vez tu perfil sea aprobado.';
  if (e.estado === 'ASESORIA_REALIZADA') msg = '✅ Tu asesoría ya fue realizada. ¡Gracias por asistir!';
  else if (e.estado === 'INSCRITO')      msg = '🎉 ¡Felicidades! Ya estás inscrito(a) en tu programa.';
  else if (e.estado === 'PENDIENTE_PAGO')msg = 'Tu asesoría fue completada. Revisa abajo los datos para tu pago.';
  return `
    <div class="card">
      <h2><span class="em">📅</span> Tu asesoría</h2>
      <p class="muted center" style="padding:6px 0">${msg}</p>
    </div>`;
}

function bloquePago_(p){
  return `
    <div class="card">
      <h2><span class="em">💳</span> Tu inversión</h2>
      <div class="pago-amount">
        ${p.precio && p.descuento !== '0%' ? `<div class="pa-old">${escapeHtml_(p.precio)}</div>` : ''}
        <div class="pa-val">${escapeHtml_(p.valor)}</div>
        ${p.descuento && p.descuento !== '0%' ? `<div class="pa-desc">Descuento ${escapeHtml_(p.descuento)}</div>` : ''}
      </div>
      <div class="bank-grid">
        <div class="kv"><div class="k">Banco</div><div class="v">${escapeHtml_(p.banco || '—')}</div></div>
        <div class="kv"><div class="k">Cuenta</div><div class="v">${escapeHtml_(p.cuenta || '—')}</div></div>
        <div class="kv"><div class="k">Titular</div><div class="v">${escapeHtml_(p.titular || '—')}</div></div>
        <div class="kv"><div class="k">NIT</div><div class="v">${escapeHtml_(p.nit || '—')}</div></div>
        ${p.email ? `<div class="kv"><div class="k">Soporte a</div><div class="v">${escapeHtml_(p.email)}</div></div>` : ''}
      </div>
    </div>`;
}

function bindHomeActions_(){
  if (typeof CONTRATO !== 'undefined') CONTRATO.bind();
  if (typeof FORMU !== 'undefined') FORMU.bind();
  if (typeof OFERTAS !== 'undefined') OFERTAS.bind();
  $('#act-agendar')?.addEventListener('click', ()=> flujoAgendar_(false));
  $('#act-reagendar')?.addEventListener('click', ()=> flujoAgendar_(true));
  $('#act-cancelar')?.addEventListener('click', flujoCancelar_);
}

/* ============================================================
 * FLUJO AGENDAR / REAGENDAR
 * ============================================================ */
async function flujoAgendar_(esReagenda){
  let res;
  try { res = await apiPost('slotsEstudiante', cred_()); }
  catch (e){ return error_(e.message || e); }

  const dias = (res && res.dias) || [];
  abrirRuedaSlots_(dias, async (fecha, bloque, etiqueta)=>{
    const conf = await Swal.fire({
      icon: 'question',
      title: esReagenda ? '¿Reagendar tu asesoría?' : 'Confirmar asesoría',
      html: `<b style="color:#263143">${escapeHtml_(etiqueta)}</b><br><span style="color:#44546b">Se generará tu enlace de Google Meet y recibirás la confirmación.</span>`,
      showCancelButton: true, confirmButtonText: esReagenda ? 'Sí, reagendar' : 'Sí, agendar', cancelButtonText: 'Volver'
    });
    if (!conf.isConfirmed) return;
    try {
      const data = await apiPost('agendarEstudiante', Object.assign(cred_(), { fecha, bloque }));
      EST = data; renderHome_();
      Swal.fire({ icon:'success', title: esReagenda ? '¡Reagendada!' : '¡Asesoría agendada!',
        text:'Te enviamos la confirmación por correo y WhatsApp.', timer: 2200, showConfirmButton:false });
    } catch (e){ error_(e.message || e); }
  });
}

async function flujoCancelar_(){
  const conf = await Swal.fire({
    icon:'warning', title:'¿Cancelar tu asesoría?',
    text:'Se liberará tu horario y se cancelará la videollamada. Podrás agendar de nuevo cuando quieras.',
    showCancelButton:true, confirmButtonText:'Sí, cancelar', cancelButtonText:'No', confirmButtonColor:'#dc2626'
  });
  if (!conf.isConfirmed) return;
  try {
    const data = await apiPost('cancelarEstudiante', cred_());
    EST = data; renderHome_();
    toast_('success', 'Asesoría cancelada');
  } catch (e){ error_(e.message || e); }
}

/* ============================================================
 * RUEDA iOS — SOLO CUPOS DISPONIBLES (día + bloque de 1h)
 * ============================================================ */
const SLOTP = { dias: [], onOk: null };
const SLOTP_H = 42;

function buildCol_(colEl, items, initIdx){
  colEl.innerHTML = '<div class="iosp-pad"></div>' +
    items.map((t,i)=>`<div class="iosp-item" data-i="${i}">${escapeHtml_(t)}</div>`).join('') +
    '<div class="iosp-pad"></div>';
  colEl.scrollTop = Math.max(0, initIdx) * SLOTP_H;
  marcarSel_(colEl);
  let to = null;
  colEl.onscroll = ()=>{
    marcarSel_(colEl);
    if (to) clearTimeout(to);
    to = setTimeout(()=>{
      const i = selCol_(colEl);
      colEl.scrollTo({ top: i * SLOTP_H, behavior:'smooth' });
      if (colEl.id === 'iosp-dia') sincronizarHoras_(i);
    }, 90);
  };
}
function selCol_(colEl){ return Math.max(0, Math.round(colEl.scrollTop / SLOTP_H)); }
function marcarSel_(colEl){ const i = selCol_(colEl); colEl.querySelectorAll('.iosp-item').forEach(el => el.classList.toggle('sel', +el.dataset.i === i)); }

function sincronizarHoras_(diaIdx){
  const dia = SLOTP.dias[diaIdx];
  const horas = dia ? dia.bloques.map(b => b.label) : [];
  buildCol_($('#iosp-hora'), horas, 0);
}

function abrirRuedaSlots_(dias, onOk){
  SLOTP.dias = dias || [];
  SLOTP.onOk = onOk;
  const vacio = !SLOTP.dias.length;
  $('#iosp-body').classList.toggle('hidden', vacio);
  $('#iosp-empty').classList.toggle('hidden', !vacio);
  $('#iosp-ok').style.visibility = vacio ? 'hidden' : 'visible';

  if (!vacio){
    buildCol_($('#iosp-dia'), SLOTP.dias.map(d => d.label), 0);
    sincronizarHoras_(0);
  }
  $('#ios-picker').classList.remove('hidden');
}

$('#iosp-cancel')?.addEventListener('click', ()=> $('#ios-picker').classList.add('hidden'));
$('#iosp-ok')?.addEventListener('click', ()=>{
  const diaIdx  = selCol_($('#iosp-dia'));
  const horaIdx = selCol_($('#iosp-hora'));
  const dia = SLOTP.dias[diaIdx];
  if (!dia || !dia.bloques.length) return;
  const blk = dia.bloques[Math.min(horaIdx, dia.bloques.length - 1)];
  $('#ios-picker').classList.add('hidden');
  const etiqueta = `${dia.label} · ${blk.label}`;
  if (SLOTP.onOk) SLOTP.onOk(dia.fecha, blk.bloque, etiqueta);
});

/* ============================================================
 * AUTO-UPDATE (version.js) — limpia caches y recarga
 * ============================================================ */
let APP_VERSION_LOADED = '';
let __verInFlight = false;
async function checkVersion(){
  if (__verInFlight) return; __verInFlight = true;
  try{
    const r = await fetch('./version.js?t=' + Date.now(), { cache:'no-store' });
    if (!r.ok) return;
    const raw = await r.text();
    let v = '';
    const m = raw.match(/['"]?version['"]?\s*[:=]\s*['"]([^'"]+)['"]/i) || raw.match(/(\d{4}\.\d{2}\.\d{2}\.\d+|\d+\.\d+(?:\.\d+)?)/);
    if (m) v = String(m[1]).trim();
    if (!v) return;
    if (!APP_VERSION_LOADED){
      APP_VERSION_LOADED = v;
      $$('.app-version-line').forEach(el => el.textContent = 'Versión ' + v);
      return;
    }
    if (v !== APP_VERSION_LOADED){
      /* 08/10/2026 — UNA sola recarga por versión. El <script> de
         version.js puede llegar de la caché HTTP del navegador (GitHub
         Pages la guarda ~10 min) con el número viejo mientras la red ya
         trae el nuevo: sin este freno la app se recargaba en bucle
         (medido: un equipo hizo ~800 recargas en 6 min tras publicar). */
      let ya = '';
      try { ya = sessionStorage.getItem('sepRecargaVer') || ''; } catch(_){}
      if (ya === v){
        APP_VERSION_LOADED = v;
        $$('.app-version-line').forEach(el => el.textContent = 'Versión ' + v);
        return;
      }
      try { sessionStorage.setItem('sepRecargaVer', v); } catch(_){}
      try{ const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }catch(_){}
      location.reload();
    }
  } finally { __verInFlight = false; }
}

/* ============================================================
 * ARRANQUE
 * ============================================================ */
window.addEventListener('load', initApp_);
document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) { checkVersion(); portalRefrescar_(); } });
setInterval(checkVersion, 60000);

async function initApp_(){
  if (typeof APP_VERSION !== 'undefined'){
    APP_VERSION_LOADED = String(APP_VERSION);
    $$('.app-version-line').forEach(el => el.textContent = 'Versión ' + APP_VERSION_LOADED);
  }
  checkVersion();

  const ses = leerSesion_();
  if (ses && ses.clave){
    try { await hacerLogin_(ses.clave, true); return; }
    catch (_){ borrarSesion_(); }
  }
  showView('login');
}
