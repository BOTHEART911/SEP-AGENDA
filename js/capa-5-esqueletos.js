/* ============================================================================
 * CAPA 5 · ESQUELETOS DE CARGA  (parte JS · ZONA DE ESTUDIANTES)
 * ----------------------------------------------------------------------------
 * © Oscar Polanía — Experto en Soluciones Digitales · +57 310 323 0712
 * Software propietario; cualquier modificación por terceros anula la garantía.
 * ----------------------------------------------------------------------------
 * VERSIÓN 11/08/2026 — EL ESQUELETO ES EL ÚNICO EFECTO DE CARGA
 *
 *   QUÉ CAMBIÓ Y POR QUÉ
 *   La versión anterior pintaba la silueta del inicio en #home-content al
 *   llamar a `loginEstudiante`… pero en ese momento la vista visible seguía
 *   siendo el LOGIN, así que la silueta caía dentro de una sección oculta.
 *   Como además esta capa apaga el girador durante las lecturas, el
 *   estudiante metía su clave y NO PASABA NADA hasta que respondía el
 *   servidor. Ahora, al pulsar Ingresar, se salta al inicio y se ve la
 *   silueta desde el primer instante; si la clave está mala, se vuelve solo
 *   al login y sale el aviso de siempre.
 *
 *   QUÉ HACE
 *   1) ARRANQUE CON SESIÓN GUARDADA: el inicio se ve con siluetas desde el
 *      primer instante, sin pasar por el login.
 *   2) LOGIN: salta al inicio con siluetas mientras llegan los datos.
 *   3) AGENDAR / REAGENDAR / CANCELAR: siluetas del inicio (antes: girador).
 *   4) BUSCAR CUPOS: la rueda se abre YA, con siluetas dentro (antes: girador).
 *   5) EL GIRADOR (#loader) QUEDA APAGADO EN TODA LA APP. El único efecto de
 *      carga distinto es el de la creación del contrato (js/contrato.js),
 *      que es una espera larga y lleva su propio aviso.
 *
 * INSTALACIÓN (una línea al final del <body>, DESPUÉS de app.js)
 *   <script src="js/capa-5-esqueletos.js"></script>
 *
 * PAREJA
 *   css/capa-5-esqueletos.css  (obligatoria)
 *
 * CÓMO SE ENGANCHA
 *   `apiPost`, `apiGet`, `startLoading` y `showView` son declaraciones de
 *   función globales de app.js, así que se pueden envolver por su nombre sin
 *   tocar una línea del original.
 *
 * EXTRA PARA EL RESTO DE LA APP
 *   apiPost(accion, cuerpo, { silent:true }) hace la llamada SIN silueta y
 *   sin cambiar de vista (lo usa contrato.js para refrescar los datos del
 *   estudiante sin sacarlo de la pantalla de "contrato firmado").
 *   window.SEPEsqueleto.pintar(idContenedor, forma) devuelve la función que
 *   lo retira; contrato.js lo usa para sus propias siluetas.
 * ========================================================================== */
(function () {
  'use strict';

  if (window.__sep5Esqueletos) return;
  window.__sep5Esqueletos = true;

  var CLAVE_SESION = 'sepAgendaSesion';   // la misma que usa app.js

  /* accion -> qué silueta y en qué vista */
  var LECTURAS = {
    loginEstudiante:    { destino: 'home-content', forma: 'inicio', vista: 'home', vuelveA: 'login' },
    agendarEstudiante:  { destino: 'home-content', forma: 'inicio' },
    cancelarEstudiante: { destino: 'home-content', forma: 'inicio' },
    slotsEstudiante:    { rueda: true }
  };

  /* ---- Piezas ----------------------------------------------------------- */
  function l(w, tit) { return '<span class="sep-sk sep-sk-l' + (tit ? ' tit' : '') + ' sep-sk-w' + w + '"></span>'; }
  function card(inner) { return '<div class="sep-sk-card">' + inner + '</div>'; }
  function rep(html, n) { var s = ''; for (var i = 0; i < n; i++) s += html; return s; }

  /* Silueta del inicio: saludo + programa + contrato + asesoría + seguimiento.
     Es la forma real de renderHome_(). */
  function siluetaInicio() {
    return '<div class="sep-sk-wrap" aria-busy="true" aria-label="Cargando">' +
      card('<div class="sep-sk-rows" style="margin-top:0">' + l(30) + l(60, true) + '</div>' +
           '<div class="sep-sk-badges"><span class="sep-sk sep-sk-badge"></span></div>') +
      card(l(45, true) + '<div class="sep-sk-rows">' + rep(l(95), 2) + l(80) + l(60) + '</div>') +
      card(l(45, true) + '<div class="sep-sk-rows">' + l(80) + l(60) + '</div>' +
           '<div class="sep-sk-acts">' + rep('<span class="sep-sk sep-sk-btn"></span>', 2) + '</div>') +
      card(l(45, true) + '<div class="sep-sk-rows">' + l(80) + l(60) + '</div>' +
           '<div class="sep-sk-acts">' + rep('<span class="sep-sk sep-sk-btn"></span>', 2) + '</div>') +
      card(l(60, true) + '<div class="sep-sk-rows">' + l(95) + l(80) + l(45) + '</div>') +
      '</div>';
  }

  /* Silueta de la lectura del contrato (la usa contrato.js). */
  function siluetaLectura() {
    return '<div class="sep-sk-wrap" aria-busy="true" aria-label="Cargando">' +
      card(l(45, true) + '<div class="sep-sk-rows">' + rep(l(95), 5) + l(80) + rep(l(95), 3) + l(60) + '</div>') +
      '<div class="sep-sk-acts">' + rep('<span class="sep-sk sep-sk-btn"></span>', 2) + '</div>' +
      '</div>';
  }

  /* Silueta de la rueda de cupos: dos columnas de horarios. */
  function siluetaRueda() {
    return '<div class="sep-sk-rueda" aria-busy="true" aria-label="Buscando horarios">' +
      '<div class="sep-sk-rueda-col">' + rep('<span class="sep-sk sep-sk-fila"></span>', 5) + '</div>' +
      '<div class="sep-sk-rueda-col">' + rep('<span class="sep-sk sep-sk-fila"></span>', 5) + '</div>' +
      '</div>';
  }

  var FORMAS = { inicio: siluetaInicio, lectura: siluetaLectura, rueda: siluetaRueda };

  function pintar(idContenedor, forma) {
    var cont = document.getElementById(idContenedor);
    if (!cont) return null;
    var hacer = FORMAS[forma] || siluetaInicio;
    var envoltura = document.createElement('div');
    envoltura.innerHTML = hacer();
    var nodo = envoltura.firstChild;
    cont.innerHTML = '';
    cont.appendChild(nodo);
    return function retirar() { if (nodo.parentNode) nodo.parentNode.removeChild(nodo); };
  }

  /* ---- Rueda de cupos: se abre YA, con siluetas dentro ------------------- */
  function abrirRuedaCargando() {
    var overlay = document.getElementById('ios-picker');
    var tarjeta = overlay && overlay.querySelector('.iosp-card');
    var cuerpo = document.getElementById('iosp-body');
    var vacio = document.getElementById('iosp-empty');
    var ok = document.getElementById('iosp-ok');
    if (!overlay || !tarjeta) return function () {};

    var sk = document.createElement('div');
    sk.className = 'sep-sk-rueda-wrap';
    sk.innerHTML = siluetaRueda();
    if (cuerpo) cuerpo.classList.add('hidden');
    if (vacio) vacio.classList.add('hidden');
    if (ok) ok.style.visibility = 'hidden';
    tarjeta.appendChild(sk);
    overlay.classList.remove('hidden');

    /* Si el estudiante cancela mientras se buscan cupos, la rueda no debe
       reaparecer sola cuando lleguen los datos. */
    var cancelado = false;
    var btnCancel = document.getElementById('iosp-cancel');
    var alCancelar = function () { cancelado = true; };
    if (btnCancel) btnCancel.addEventListener('click', alCancelar);

    return function retirar() {
      if (btnCancel) btnCancel.removeEventListener('click', alCancelar);
      if (sk.parentNode) sk.parentNode.removeChild(sk);
      if (cuerpo) cuerpo.classList.remove('hidden');
      if (ok) ok.style.visibility = 'visible';
      if (cancelado) setTimeout(function () { overlay.classList.add('hidden'); }, 0);
    };
  }

  /* ---- Girador apagado en toda la app ------------------------------------ */
  if (typeof window.startLoading === 'function') {
    window.startLoading = function () {};
    window.stopLoading = function () {};
    var lo = document.getElementById('loader');
    if (lo) lo.classList.add('hidden');
  }

  /* ---- Envoltura de apiPost / apiGet ------------------------------------- */
  function envolver(nombre) {
    var original = window[nombre];
    if (typeof original !== 'function') return;

    window[nombre] = function (accion, cuerpo, opts) {
      var conf = LECTURAS[accion];
      var callado = !!(opts && opts.silent);
      if (!conf || callado) return original.call(this, accion, cuerpo);

      var vistaPrevia = null, retirar = null;

      if (conf.rueda) {
        retirar = abrirRuedaCargando();
      } else {
        if (conf.vista && typeof window.showView === 'function') {
          vistaPrevia = conf.vuelveA || null;
          window.showView(conf.vista);
        }
        retirar = pintar(conf.destino, conf.forma);
      }

      function fin(huboError) {
        if (retirar) retirar();
        /* Si la clave estaba mala se vuelve a la vista de donde venía; el
           aviso de error lo lanza app.js como siempre. */
        if (huboError && vistaPrevia && typeof window.showView === 'function') {
          window.showView(vistaPrevia);
        }
      }

      var p;
      try { p = original.call(this, accion, cuerpo); }
      catch (e) { fin(true); throw e; }

      return p.then(
        function (r) { fin(false); return r; },
        function (e) { fin(true); throw e; }
      );
    };
  }
  envolver('apiPost');
  envolver('apiGet');

  /* ---- Arranque: si hay sesión guardada, el inicio se ve ya -------------- */
  try {
    var ses = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null');
    if (ses && ses.clave && typeof window.showView === 'function') {
      pintar('home-content', 'inicio');
      window.showView('home');
    }
  } catch (e) { /* sin sesión guardada o almacenamiento bloqueado: nada que hacer */ }

  /* ---- Puerta para el resto de la app ------------------------------------ */
  window.SEPEsqueleto = { pintar: pintar, formas: FORMAS };
})();
