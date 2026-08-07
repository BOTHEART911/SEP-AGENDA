/* ============================================================================
 * CAPA 5 · ESQUELETOS DE CARGA  (parte JS · SEP AGENDA)
 * ----------------------------------------------------------------------------
 * QUÉ HACE
 *   Dos cosas:
 *
 *   1) ARRANQUE CON SESIÓN GUARDADA. Antes, al abrir la app se veía la tarjeta
 *      de LOGIN mientras por detrás se recuperaba la sesión, y de golpe
 *      saltaba al inicio. Ahora, si hay sesión guardada, se muestra el INICIO
 *      con siluetas desde el primer instante y las siluetas se rellenan solas.
 *
 *   2) LECTURAS SIN GIRADOR. `loginEstudiante` (que es lo que trae todos los
 *      datos del estudiante) ya no bloquea la pantalla con el girador: pinta
 *      siluetas en #home-content. El girador se queda tal cual en AGENDAR,
 *      REAGENDAR, CANCELAR y en la búsqueda de cupos: ahí sí hay que esperar.
 *
 * INSTALACIÓN (una línea al final del <body>, DESPUÉS de app.js)
 *   <script src="js/capa-5-esqueletos.js"></script>
 *
 * PAREJA
 *   css/capa-5-esqueletos.css  (obligatoria)
 *
 * CÓMO SE ENGANCHA
 *   `apiPost` y `startLoading` son declaraciones de función globales de app.js,
 *   así que se pueden envolver por su nombre sin tocar una línea del original.
 *   Como aquí `apiPost` no admite opciones (a diferencia de SEP GROUP), el
 *   girador se apaga con una banderita: mientras hay una lectura en vuelo,
 *   `startLoading` no hace nada.
 *
 * NOTAS
 *   · No toca index.html, app.js ni styles.css. Se quita borrando la línea.
 *   · La silueta se retira SIEMPRE al terminar, salga bien o mal la llamada.
 *   · Si la sesión guardada ya no sirve, app.js cae a la vista de login como
 *     siempre; la silueta se retira antes.
 * ========================================================================== */
(function () {
  'use strict';

  if (window.__sep5Esqueletos) return;
  window.__sep5Esqueletos = true;

  var CLAVE_SESION = 'sepAgendaSesion';   // la misma que usa app.js
  var LECTURAS = { loginEstudiante: 'home-content' };

  /* ---- Piezas ----------------------------------------------------------- */
  function l(w, tit) { return '<span class="sep-sk sep-sk-l' + (tit ? ' tit' : '') + ' sep-sk-w' + w + '"></span>'; }
  function card(inner) { return '<div class="sep-sk-card">' + inner + '</div>'; }
  function rep(html, n) { var s = ''; for (var i = 0; i < n; i++) s += html; return s; }

  /* Silueta del inicio: saludo + tarjeta de programa + tarjeta de asesoría +
     seguimiento del proceso. Es la forma real de renderHome_(). */
  function siluetaInicio() {
    return '<div class="sep-sk-wrap" aria-busy="true" aria-label="Cargando">' +
      card('<div class="sep-sk-rows" style="margin-top:0">' + l(30) + l(60, true) + '</div>' +
           '<div class="sep-sk-badges"><span class="sep-sk sep-sk-badge"></span></div>') +
      card(l(45, true) + '<div class="sep-sk-rows">' + rep(l(95), 2) + l(80) + l(60) + '</div>') +
      card(l(45, true) + '<div class="sep-sk-rows">' + l(80) + l(60) + '</div>' +
           '<div class="sep-sk-acts">' + rep('<span class="sep-sk sep-sk-btn"></span>', 2) + '</div>') +
      card(l(60, true) + '<div class="sep-sk-rows">' + l(95) + l(80) + l(45) + '</div>') +
      '</div>';
  }

  function pintar(idContenedor) {
    var cont = document.getElementById(idContenedor);
    if (!cont) return null;
    var envoltura = document.createElement('div');
    envoltura.innerHTML = siluetaInicio();
    var nodo = envoltura.firstChild;
    cont.innerHTML = '';
    cont.appendChild(nodo);
    return function retirar() { if (nodo.parentNode) nodo.parentNode.removeChild(nodo); };
  }

  /* ---- Girador apagado mientras hay una lectura en vuelo ----------------- */
  var lecturasEnVuelo = 0;
  var startOriginal = window.startLoading;
  if (typeof startOriginal === 'function') {
    window.startLoading = function () {
      if (lecturasEnVuelo > 0) return;      // lectura: manda la silueta
      return startOriginal.apply(this, arguments);
    };
  }

  /* ---- Envoltura de apiPost --------------------------------------------- */
  var postOriginal = window.apiPost;
  if (typeof postOriginal === 'function') {
    window.apiPost = function (accion) {
      var destino = LECTURAS[accion];
      if (!destino) return postOriginal.apply(this, arguments);   // escritura: girador de siempre

      var retirar = pintar(destino);
      lecturasEnVuelo++;

      function fin() {
        lecturasEnVuelo = Math.max(0, lecturasEnVuelo - 1);
        if (retirar) retirar();
      }

      var p;
      try { p = postOriginal.apply(this, arguments); }
      catch (e) { fin(); throw e; }

      return p.then(
        function (r) { fin(); return r; },
        function (e) { fin(); throw e; }
      );
    };
  }

  /* ---- Arranque: si hay sesión guardada, el inicio se ve ya --------------- */
  try {
    var ses = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null');
    if (ses && ses.clave && typeof window.showView === 'function') {
      pintar('home-content');
      window.showView('home');
    }
  } catch (e) { /* sin sesión guardada o almacenamiento bloqueado: nada que hacer */ }
})();
