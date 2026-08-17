/* ============================================================
 * SEP COLOMBIA — ZONA DE ESTUDIANTES · FORMULARIO SUMMER
 * © Oscar Polanía — Experto en Soluciones Digitales · +57 310 323 0712
 * Software propietario; cualquier modificación por terceros anula la garantía.
 * ------------------------------------------------------------
 * FASE 3 SEP · ENTREGA 4 (17/08/2026) — BLOQUES 1 A 14 + DOCUMENTOS
 *
 * Cómo funciona
 *   El backend (Formulario.gs) manda la DEFINICIÓN de los bloques y
 *   sus campos junto con lo que el estudiante ya guardó. Este archivo
 *   NO tiene su propia lista de campos: pinta lo que llega. Así, la
 *   Entrega 4 (bloques 8 a 14) no obliga a tocar este archivo salvo
 *   por los tipos de campo nuevos.
 *
 *   Recorrido: tarjeta del inicio → lista de bloques → bloque abierto
 *   → confirmación → guardado. El bloque guardado queda cerrado con
 *   llave (se puede volver a VER, no a cambiar). Dos excepciones:
 *   Pasaporte se puede dejar pendiente y Verificación académica queda
 *   siempre editable.
 *
 * Usa de app.js: apiPost, cred_, showView, escapeHtml_, error_, toast_.
 * ============================================================ */

var FORMU = (function () {

  var S = {
    data: null,      // respuesta de formEstado
    bloque: null,    // definición + valores del bloque abierto
    vals: {},        // lo que hay escrito ahora mismo
    guardando: false
  };

  /* Mismos topes que Formulario.gs, para que el front avise antes de
     que el backend tenga que rechazar. */
  var MAX_TEXTO = 300, MAX_TEXTAREA = 1500, MAX_FILAS = 20;

  /* ENTREGA 4 — documentos. El tope real lo manda el backend en el
     bloque (maxMb); esto es solo el valor por si no llegara. */
  var MAX_MB = 5;
  /* Una sola subida a la vez EN TODA la pantalla, no una por casilla.
     Dos subidas en paralelo se pisaban: cada respuesta trae el estado
     completo del formulario calculado ANTES de que terminara la otra,
     así que la que llegara de última borraba de la pantalla el
     documento de la primera —que en la hoja sí estaba— y dejaba al
     estudiante sin poder enviar el bloque. */
  var SUBIENDO = '';                    // columna que está subiendo, o '' 

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
               'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* ---------------- utilidades ---------------- */
  function q(sel) { return document.querySelector(sel); }
  function esc(s) { return (typeof escapeHtml_ === 'function') ? escapeHtml_(s) : String(s == null ? '' : s); }
  function txt(v) { return String(v === null || v === undefined ? '' : v).trim(); }
  function dig(v) { return txt(v).replace(/\D/g, ''); }

  function avisoFalta(lista) {
    Swal.fire({
      icon: 'warning',
      title: 'Revisa el bloque',
      html: '<div style="text-align:left">• ' + lista.slice(0, 6).map(esc).join('<br>• ') +
            (lista.length > 6 ? '<br>• y ' + (lista.length - 6) + ' más…' : '') + '</div>'
    });
  }

  /* ============================================================
     FECHAS  (todo el formulario trabaja en dd/mm/yyyy)
     ============================================================ */
  function fechaValida_(s) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(txt(s));
    if (!m) return null;
    var d = +m[1], mes = +m[2], a = +m[3];
    if (mes < 1 || mes > 12 || d < 1) return null;
    var f = new Date(a, mes - 1, d);
    if (f.getFullYear() !== a || f.getMonth() !== mes - 1 || f.getDate() !== d) return null;
    return f;
  }
  function hoy0_() { var h = new Date(); return new Date(h.getFullYear(), h.getMonth(), h.getDate()); }
  function fechaLarga_(s) {
    var f = fechaValida_(s);
    if (!f) return txt(s);
    return f.getDate() + ' de ' + MESES[f.getMonth()] + ' de ' + f.getFullYear();
  }

  /* ============================================================
     RUEDA DE FECHA iOS — día · mes · AÑO (portada de SEP GROUP y
     hecha genérica: cada campo dice qué años admite).
     ============================================================ */
  var FP = { onOk: null, dias: [], anios: [], H: 42 };

  function fpBuild_(colEl, items, initIdx, onSettle) {
    colEl.innerHTML = '<div class="iosp-pad"></div>' +
      items.map(function (t, i) { return '<div class="iosp-item" data-i="' + i + '">' + esc(t) + '</div>'; }).join('') +
      '<div class="iosp-pad"></div>';
    colEl.scrollTop = Math.max(0, initIdx) * FP.H;
    fpMarcar_(colEl);
    var to = null;
    colEl.onscroll = function () {
      fpMarcar_(colEl);
      if (to) clearTimeout(to);
      to = setTimeout(function () {
        var i = fpSel_(colEl);
        colEl.scrollTo({ top: i * FP.H, behavior: 'smooth' });
        if (onSettle) onSettle(i);
      }, 90);
    };
    Array.prototype.forEach.call(colEl.querySelectorAll('.iosp-item'), function (el) {
      el.addEventListener('click', function () {
        var i = +el.dataset.i;
        colEl.scrollTop = i * FP.H;
        fpMarcar_(colEl);
        if (onSettle) onSettle(i);
      });
    });
  }
  function fpSel_(colEl) { return Math.max(0, Math.round(colEl.scrollTop / FP.H)); }
  function fpMarcar_(colEl) {
    var i = fpSel_(colEl);
    Array.prototype.forEach.call(colEl.querySelectorAll('.iosp-item'), function (el) {
      el.classList.toggle('sel', +el.dataset.i === i);
    });
  }
  function fpDiasMes_(mesIdx, anio) { return new Date(anio, mesIdx + 1, 0).getDate(); }
  function fpRehacerDias_() {
    var mes  = fpSel_(q('#fpick-mes'));
    var anio = FP.anios[Math.min(fpSel_(q('#fpick-anio')), FP.anios.length - 1)];
    var total = fpDiasMes_(mes, anio);
    var pos = Math.min(fpSel_(q('#fpick-dia')), total - 1);
    FP.dias = []; for (var d = 1; d <= total; d++) FP.dias.push(d);
    fpBuild_(q('#fpick-dia'), FP.dias.map(String), Math.max(0, pos));
  }

  /* Años admitidos según el modo del campo:
       pasada → desde hace 100 años hasta hoy
       futura → de hoy a 10 años
       adulto → personas de 20 años o más (el mismo tope que valida el
                backend: ni uno más ni uno menos) */
  function fpAnios_(modo) {
    var y = new Date().getFullYear(), a = [], i;
    if (modo === 'futura') { for (i = y; i <= y + 10; i++) a.push(i); return a; }
    if (modo === 'adulto') { for (i = y - 100; i <= y - 20; i++) a.push(i); return a; }
    for (i = y - 100; i <= y; i++) a.push(i);
    return a;
  }

  function abrirRueda_(valor, modo, titulo, onOk) {
    FP.onOk = onOk;
    FP.anios = fpAnios_(modo);

    var f = fechaValida_(valor);
    if (!f) {
      f = (modo === 'futura') ? hoy0_()
        : (modo === 'adulto') ? new Date(FP.anios[FP.anios.length - 1], 0, 1)
        : hoy0_();
    }
    var anioPos = FP.anios.indexOf(f.getFullYear());
    if (anioPos < 0) anioPos = (modo === 'futura') ? 0 : FP.anios.length - 1;

    q('#fpick-title').textContent = titulo || 'Elige la fecha';
    q('#form-picker').classList.remove('hidden');

    var total = fpDiasMes_(f.getMonth(), FP.anios[anioPos]);
    FP.dias = []; for (var i = 1; i <= total; i++) FP.dias.push(i);

    fpBuild_(q('#fpick-dia'), FP.dias.map(String), Math.min(f.getDate() - 1, total - 1));
    fpBuild_(q('#fpick-mes'), MESES.map(function (m) { return m.charAt(0).toUpperCase() + m.slice(1); }),
             f.getMonth(), fpRehacerDias_);
    fpBuild_(q('#fpick-anio'), FP.anios.map(String), anioPos, fpRehacerDias_);
  }

  function cerrarRueda_() { q('#form-picker').classList.add('hidden'); }

  function cablearRueda_() {
    if (cablearRueda_.listo) return;
    cablearRueda_.listo = true;
    q('#fpick-cancel') && q('#fpick-cancel').addEventListener('click', cerrarRueda_);
    q('#fpick-ok') && q('#fpick-ok').addEventListener('click', function () {
      var dia  = FP.dias[Math.min(fpSel_(q('#fpick-dia')), FP.dias.length - 1)];
      var mes  = fpSel_(q('#fpick-mes'));
      var anio = FP.anios[Math.min(fpSel_(q('#fpick-anio')), FP.anios.length - 1)];
      cerrarRueda_();
      var p = function (n) { return String(n).padStart(2, '0'); };
      if (FP.onOk) FP.onOk(p(dia) + '/' + p(mes + 1) + '/' + anio);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.fpick-arrow'), function (b) {
      b.addEventListener('click', function () {
        var col = q('#' + b.dataset.col); if (!col) return;
        var n = col.querySelectorAll('.iosp-item').length;
        var i = Math.min(Math.max(fpSel_(col) + (+b.dataset.d), 0), n - 1);
        col.scrollTop = i * FP.H; fpMarcar_(col);
        if (b.dataset.col !== 'fpick-dia') fpRehacerDias_();
      });
    });
  }

  /* ============================================================
     TARJETA DEL INICIO
     ============================================================ */
  function tarjeta(e) {
    var f = e && e.formulario;
    if (!f) return '';

    if (!f.habilitado) {
      /* Sin puntaje todavía no se le anuncia nada: no tiene sentido
         mostrarle una tarjeta de algo que aún no existe. */
      if (f.motivo === 'SIN_NIVEL' || f.motivo === 'SIN_PUNTAJE') return '';
      return '' +
        '<div class="card">' +
        '  <h2><span class="em">📝</span> Tu formulario</h2>' +
        '  <p class="muted center" style="padding:6px 0">' + esc(f.mensaje || '') + '</p>' +
        '</div>';
    }

    var listo = !!f.terminado;
    var pct = f.total ? Math.round((f.completados / f.total) * 100) : 0;
    var video = f.video
      ? '<a class="ctr-video" href="' + esc(f.video) + '" target="_blank" rel="noopener">🎬 Ver el video guía del formulario</a>'
      : '';

    if (f.aprobado) {
      return '' +
        '<div class="card">' +
        '  <h2><span class="em">📝</span> Tu formulario</h2>' +
        '  <div class="ctr-ok">' +
        '    <div class="ctr-ok-ic">✅</div>' +
        '    <p>Tu información fue <b>validada</b>. El formulario quedó cerrado, pero puedes consultarlo cuando quieras.</p>' +
        '  </div>' +
        '  <button class="btn btn-ghost btn-block" id="form-abrir">👁 Ver mi formulario</button>' +
        '</div>';
    }

    return '' +
      '<div class="card">' +
      '  <h2><span class="em">📝</span> Tu formulario</h2>' +
      (listo
        ? '  <div class="ctr-ok"><div class="ctr-ok-ic">🎉</div>' +
          '    <p>¡Completaste tu formulario! Nuestro equipo lo está revisando.' +
          ((f.docsPendientes && f.docsPendientes.length)
            ? ' Te falta subir: <b>' + f.docsPendientes.map(esc).join('</b>, <b>') + '</b>.'
            : '') + '</p></div>'
        : '  <div class="ctr-call"><div class="ctr-call-ic">🗂️</div>' +
          '    <p>Completa tu información bloque por bloque. Puedes hacerlo por partes: lo que guardes queda a salvo.</p></div>') +
      '  <div class="fm-prog"><i style="width:' + pct + '%"></i></div>' +
      '  <p class="muted center fm-prog-t">' + esc(f.resumen || '') + '</p>' +
      '  <button class="btn ' + (listo ? 'btn-ghost' : 'btn-accent') + ' btn-block" id="form-abrir">' +
      (listo ? '👁 Ver mi formulario' : (f.completados ? 'Continuar mi formulario' : 'Comenzar mi formulario')) +
      '  </button>' +
      video +
      '</div>';
  }

  function bind() {
    var b = q('#form-abrir');
    if (b) b.addEventListener('click', abrir);
  }

  /* ============================================================
     ABRIR
     ============================================================ */
  function pintarEsqueleto_() {
    if (window.SEPEsqueleto && typeof window.SEPEsqueleto.pintar === 'function') {
      return window.SEPEsqueleto.pintar('fm-cont', 'lectura') || function () {};
    }
    return function () {};
  }

  async function abrir() {
    cablearRueda_();
    var quitar = pintarEsqueleto_();
    q('#fm-sub').textContent = 'Cargando tu formulario…';
    q('#fm-bar').style.width = '8%';
    showView('formulario');
    try {
      S.data = await apiPost('formEstado', cred_());
      quitar();
      if (!S.data.habilitado) {
        showView('home');
        return error_(S.data.mensaje || 'Tu formulario todavía no está disponible.');
      }
      pintarLista();
    } catch (e) {
      quitar(); showView('home'); error_(e.message || e);
    }
  }

  /* ============================================================
     LISTA DE BLOQUES
     ============================================================ */
  function pillEstado_(b) {
    if (b.estadoVista === 'COMPLETADO') {
      /* El de Verificación académica queda completado pero SIN candado:
         el pliego pide que se pueda actualizar cuando lo necesite. */
      return b.editableSiempre
        ? '<span class="fm-pill ok">Completado ✏️</span>'
        : '<span class="fm-pill ok">Completado 🔒</span>';
    }
    if (b.estadoVista === 'EN_PROGRESO') return '<span class="fm-pill go">En progreso</span>';
    return '<span class="fm-pill">Pendiente</span>';
  }

  function pintarLista() {
    S.bloque = null;                 // ya no hay bloque abierto
    var d = S.data;
    var pct = d.total ? Math.round((d.completados / d.total) * 100) : 0;
    q('#fm-sub').textContent = d.aprobado ? 'Solo lectura' : d.resumen;
    q('#fm-bar').style.width = Math.max(6, pct) + '%';

    var items = d.bloques.map(function (b) {
      var abierto = b.abierto;
      return '' +
        '<button type="button" class="fm-item' + (abierto ? '' : ' cerrado') + '" data-bloque="' + b.n + '">' +
        '  <span class="fm-ic">' + esc(b.icono) + '</span>' +
        '  <span class="fm-tx">' +
        '    <b>Bloque ' + b.n + ' · ' + esc(b.titulo) + '</b>' +
        '    <small>' + (b.estadoVista === 'COMPLETADO'
                          ? ('Guardado el ' + esc(b.fecha || '—') +
                             (b.editableSiempre ? ' · puedes actualizarlo' : ''))
                          : (abierto ? (b.opcional ? 'Puedes dejarlo pendiente' : 'Te toca ahora')
                                     : 'Se abre cuando completes el anterior')) + '</small>' +
        '  </span>' +
        pillEstado_(b) +
        '</button>';
    }).join('');

    q('#fm-cont').innerHTML = '' +
      '<div class="card">' +
      '  <h2><span class="em">🗂️</span> Tu formulario Summer</h2>' +
      (S.data.aprobado
        ? '  <p class="muted">Tu información ya fue validada. Puedes consultar cada bloque, pero no modificarlo.</p>'
        : '  <p class="muted">Completa un bloque a la vez. Al enviarlo queda guardado y cerrado: revísalo bien antes de continuar.</p>') +
      '  <div class="fm-lista">' + items + '</div>' +
      '</div>' +
      (S.data.terminado
        ? '<div class="card fm-fin"><div class="fm-fin-ic">🎉</div>' +
          '<p>¡Terminaste tu formulario! Nuestro equipo va a revisarlo y te avisaremos por WhatsApp y correo.</p>' +
          (docsPendientesHtml_() || '') + '</div>'
        : '') +
      '<div class="ctr-nav"><button class="btn btn-ghost btn-block" id="fm-salir-l">← Volver al inicio</button></div>';

    window.scrollTo({ top: 0, behavior: 'auto' });
    Array.prototype.forEach.call(document.querySelectorAll('[data-bloque]'), function (b) {
      b.addEventListener('click', function () { irABloque(+b.dataset.bloque); });
    });
    q('#fm-salir-l').addEventListener('click', function () { showView('home'); });
  }

  /* Los documentos que el estudiante puede subir más adelante. */
  function docsPendientesHtml_() {
    var lista = (S.data && S.data.docsPendientes) || [];
    if (!lista.length || S.data.aprobado) return '';
    return '<p class="fm-pend">📎 Te falta subir: <b>' + lista.map(esc).join('</b>, <b>') +
           '</b>. Puedes hacerlo cuando lo tengas, en el bloque de documentos.</p>';
  }

  function irABloque(n) {
    var b = null;
    S.data.bloques.forEach(function (x) { if (x.n === n) b = x; });
    if (!b) return;
    if (!b.abierto) {
      return Swal.fire({ icon: 'info', title: 'Todavía no', text: 'Primero completa los bloques anteriores.' });
    }
    S.bloque = b;
    S.vals = {};
    b.campos.forEach(function (c) {
      var v = b.valores[c.k];
      if (c.t === 'lista') S.vals[c.k] = Array.isArray(v) ? JSON.parse(JSON.stringify(v)) : [];
      else if (c.t === 'chips') S.vals[c.k] = Array.isArray(v) ? v.slice() : [];
      else S.vals[c.k] = txt(v);
    });
    /* Una lista obligatoria arranca con una fila en blanco para que se
       vea qué hay que llenar. */
    b.campos.forEach(function (c) {
      if (c.t === 'lista' && b.editable && !S.vals[c.k].length) S.vals[c.k] = [filaVacia_(c)];
    });
    pintarBloque();
  }

  function filaVacia_(campo) {
    var o = {};
    campo.sub.forEach(function (sc) { o[sc.k] = ''; });
    return o;
  }

  /* ============================================================
     PINTADO DE UN BLOQUE
     ============================================================ */
  function visible_(c) {
    if (!c.ver) return true;
    return txt(S.vals[c.ver.k]) === c.ver.v;
  }
  /* ¿De este campo depende algún otro? Si sí, al cambiarlo hay que
     repintar el bloque para mostrar u ocultar lo que corresponda. */
  function esLlave_(c) {
    var hay = false;
    S.bloque.campos.forEach(function (x) { if (x.ver && x.ver.k === c.k) hay = true; });
    return hay;
  }

  function campoHtml_(c, editable) {
    var id = 'fm-' + c.k;
    var v = S.vals[c.k];
    var ay = c.ay ? '<small class="fm-ay">' + esc(c.ay) + '</small>' : '';
    var req = c.req ? '<span class="fm-req">*</span>' : '';
    var dis = editable ? '' : ' disabled';

    if (c.t === 'sino') {
      return '' +
        '<div class="fm-f" data-campo="' + c.k + '">' +
        '  <label>' + esc(c.l) + req + '</label>' + ay +
        '  <div class="fm-sino">' +
        ['Si', 'No'].map(function (o) {
          return '<button type="button" class="fm-op' + (v === o ? ' sel' : '') + '"' + dis +
                 ' data-sino="' + c.k + '" data-v="' + o + '">' + (o === 'Si' ? 'Sí' : 'No') + '</button>';
        }).join('') +
        '  </div>' +
        '</div>';
    }

    if (c.t === 'select') {
      return '' +
        '<div class="fm-f" data-campo="' + c.k + '">' +
        '  <label for="' + id + '">' + esc(c.l) + req + '</label>' + ay +
        '  <select id="' + id + '" data-k="' + c.k + '"' + dis + '>' +
        '    <option value="">Selecciona…</option>' +
        c.op.map(function (o) {
          return '<option value="' + esc(o) + '"' + (v === o ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') +
        '  </select>' +
        '</div>';
    }

    if (c.t === 'check') {
      return '' +
        '<div class="fm-f" data-campo="' + c.k + '">' +
        '  <label class="fm-check">' +
        '    <input type="checkbox" data-k="' + c.k + '" data-tipo="check"' + (v === 'Si' ? ' checked' : '') + dis + '>' +
        '    <span>' + esc(c.l) + req + '</span>' +
        '  </label>' + ay +
        '</div>';
    }

    if (c.t === 'textarea') {
      return '' +
        '<div class="fm-f" data-campo="' + c.k + '">' +
        '  <label for="' + id + '">' + esc(c.l) + req + '</label>' + ay +
        '  <textarea id="' + id + '" data-k="' + c.k + '" rows="3" maxlength="' + MAX_TEXTAREA +
      '" placeholder="' + esc(c.ph || '') + '"' + dis + '>\n' + esc(v) + '</textarea>' +
        '</div>';
    }

    if (c.t === 'fecha') {
      return '' +
        '<div class="fm-f" data-campo="' + c.k + '">' +
        '  <label>' + esc(c.l) + req + '</label>' + ay +
        '  <button type="button" class="fm-fecha' + (v ? ' con' : '') + '" data-fecha="' + c.k + '"' + dis + '>' +
        '    <span class="fm-fecha-ic">📅</span>' +
        '    <span class="fm-fecha-t">' + (v ? esc(fechaLarga_(v)) : 'Elige la fecha') + '</span>' +
        '  </button>' +
        '</div>';
    }

    if (c.t === 'chips') {
      var n = c.n || 5;
      var sel = Array.isArray(v) ? v : [];
      return '' +
        '<div class="fm-f" data-campo="' + c.k + '">' +
        '  <label>' + esc(c.l) + req + '</label>' + ay +
        '  <div class="fm-chips">' +
        c.op.map(function (o) {
          var on = sel.indexOf(o) >= 0;
          return '<button type="button" class="fm-chip' + (on ? ' sel' : '') + '"' + dis +
                 ' data-chip="' + c.k + '" data-v="' + esc(o) + '">' + esc(o) + '</button>';
        }).join('') +
        '  </div>' +
        '  <small class="fm-ay fm-chip-n">' + sel.length + ' de ' + n + ' elegidas</small>' +
        '</div>';
    }

    /* ENTREGA 4 — DOCUMENTO. El valor es la URL de Drive que ya
       devolvió 'formArchivo'. Si todavía no hay archivo y se admite
       subirlo, se pinta la zona de arrastrar/pegar/tocar. */
    if (c.t === 'archivo') {
      var url = txt(v);
      var puede = docSubible_(c.k);
      var cuerpo;
      if (SUBIENDO === c.k) {
        cuerpo = '<div class="fm-doc-ok fm-doc-sub" role="status" aria-live="polite" aria-busy="true">' +
                 '<span class="sep-sk sep-sk-ico"></span>' +
                 '<span class="fm-doc-t">Subiendo tu archivo…</span></div>';
      } else if (url) {
        cuerpo = '<div class="fm-doc-ok">' +
          '  <span class="fm-doc-ic">' + (c.doc === 'foto' ? '🖼️' : '📄') + '</span>' +
          '  <span class="fm-doc-t">Archivo cargado</span>' +
          '  <span class="fm-doc-b">' +
          '    <button type="button" class="fm-mini" data-doc="ver" data-k="' + c.k + '">👁 Ver</button>' +
          (puede ? '    <button type="button" class="fm-mini" data-doc="elegir" data-k="' + c.k + '">♻️ Reemplazar</button>' : '') +
          '  </span>' +
          '</div>';
      } else if (puede) {
        /* aria-live: los rechazos ("debe ser PDF", "pesa más de 5 MB")
           se escriben dentro de esta caja y son el único aviso que
           recibe el estudiante; sin esto, un lector de pantalla no los
           lee nunca. */
        cuerpo = '<div class="fm-drop" id="fm-drop-' + c.k + '" data-drop="' + c.k + '"' +
                 ' contenteditable="true" spellcheck="false" role="button" tabindex="0"' +
                 ' aria-live="polite"' +
                 ' aria-label="' + esc(c.l) + '. Arrastra, pega con Control V o toca para elegir el archivo"></div>';
      } else {
        cuerpo = '<p class="fm-doc-vacio">Sin archivo cargado</p>';
      }
      return '' +
        '<div class="fm-f fm-f-doc" data-campo="' + c.k + '">' +
        '  <label>' + esc(c.l) + req + ' <span class="fm-doc-max">' +
        (c.doc === 'foto' ? 'PNG o JPG' : 'Solo PDF') + ' · máx. ' + docMaxMb_() + ' MB</span></label>' + ay +
        cuerpo +
        '  <input type="file" id="fm-file-' + c.k + '" data-file="' + c.k + '" hidden' +
        ' accept="' + (c.doc === 'foto' ? '.png,.jpg,.jpeg,image/png,image/jpeg' : '.pdf,application/pdf') + '">' +
        '</div>';
    }

    if (c.t === 'lista') {
      var filas = Array.isArray(v) ? v : [];
      var cuerpo = filas.map(function (fila, i) {
        return '' +
          '<div class="fm-linea">' +
          '  <div class="fm-linea-h"><b>' + (i + 1) + '</b>' +
          (editable && filas.length > 1
            ? '<button type="button" class="fm-quitar" data-quitar="' + c.k + '" data-i="' + i + '">✕</button>' : '') +
          '  </div>' +
          '  <div class="fm-linea-c">' +
          /* Un subcampo liberado por 'reqSalvo' (la fecha de
             finalización de un trabajo en el que todavía sigue) no se
             muestra: el backend lo guarda vacío, así que enseñarlo solo
             serviría para que el estudiante escriba algo que se
             descarta —o para que la pantalla le exija un cruce de
             fechas que el servidor ya perdonó. */
          c.sub.filter(function (sc) {
            return !(sc.reqSalvo && txt(fila[sc.reqSalvo.k]) === sc.reqSalvo.v);
          }).map(function (sc) {
            var sid = 'fm-' + c.k + '-' + i + '-' + sc.k;
            var sv = txt(fila[sc.k]);
            if (sc.t === 'fecha') {
              return '<div class="fm-sf"><label>' + esc(sc.l) + '</label>' +
                     '<button type="button" class="fm-fecha' + (sv ? ' con' : '') + '" data-sfecha="' + c.k + '" data-i="' + i + '" data-sk="' + sc.k + '"' + dis + '>' +
                     '<span class="fm-fecha-ic">📅</span><span class="fm-fecha-t">' + (sv ? esc(sv) : 'Elegir') + '</span></button></div>';
            }
            /* ENTREGA 4 — un Sí/No dentro de una línea repetible
               (¿actualmente trabajas allí?). */
            if (sc.t === 'sino') {
              return '<div class="fm-sf fm-sf-ancho"><label>' + esc(sc.l) + '</label>' +
                     '<div class="fm-sino fm-sino-mini">' +
                     ['Si', 'No'].map(function (o) {
                       return '<button type="button" class="fm-op' + (sv === o ? ' sel' : '') + '"' + dis +
                              ' data-ssino="' + c.k + '" data-i="' + i + '" data-sk="' + sc.k + '" data-v="' + o + '">' +
                              (o === 'Si' ? 'Sí' : 'No') + '</button>';
                     }).join('') +
                     '</div></div>';
            }
            /* ENTREGA 4 — texto largo dentro de una línea repetible
               (funciones principales de cada experiencia). */
            if (sc.t === 'textarea') {
              return '<div class="fm-sf fm-sf-ancho"><label for="' + sid + '">' + esc(sc.l) + '</label>' +
                     '<textarea id="' + sid + '" rows="3" maxlength="' + (sc.maxlen || MAX_TEXTAREA) + '"' +
                     ' data-sk="' + sc.k + '" data-slista="' + c.k + '" data-i="' + i + '"' + dis + '>\n' + esc(sv) + '</textarea></div>';
            }
            return '<div class="fm-sf"><label for="' + sid + '">' + esc(sc.l) + '</label>' +
                   '<input id="' + sid + '" type="' + (sc.t === 'num' ? 'tel' : 'text') + '"' +
                   (sc.t === 'num' ? ' inputmode="numeric"' : '') +
                   ' maxlength="' + (sc.maxlen || (sc.t === 'tel' ? 10 : MAX_TEXTO)) + '"' +
                   ' data-sk="' + sc.k + '" data-slista="' + c.k + '" data-i="' + i + '" value="' + esc(sv) + '"' + dis + '></div>';
          }).join('') +
          '  </div>' +
          '</div>';
      }).join('');

      return '' +
        '<div class="fm-f fm-f-lista" data-campo="' + c.k + '">' +
        '  <label>' + esc(c.l) + req + '</label>' + ay +
        cuerpo +
        (editable
          ? (filas.length >= (c.maxFilas || MAX_FILAS)
              ? '  <p class="muted center">Llegaste al máximo de ' + (c.maxFilas || MAX_FILAS) + ' líneas.</p>'
              : '  <button type="button" class="fm-agregar" data-agregar="' + c.k + '">＋ ' +
                esc(c.agregar || 'Agregar otra línea') + '</button>')
          : (filas.length ? '' : '<p class="muted">—</p>')) +
        '</div>';
    }

    /* texto · num · tel · correo · url */
    var tipo = (c.t === 'num' || c.t === 'tel') ? 'tel' : (c.t === 'correo' ? 'email' : 'text');
    return '' +
      '<div class="fm-f" data-campo="' + c.k + '">' +
      '  <label for="' + id + '">' + esc(c.l) + req + '</label>' + ay +
      '  <input id="' + id + '" type="' + tipo + '" data-k="' + c.k + '" data-tipo="' + c.t + '"' +
      ((c.t === 'num' || c.t === 'tel') ? ' inputmode="numeric"' : '') +
      ' maxlength="' + (c.maxlen || (c.t === 'tel' ? 10 : MAX_TEXTO)) + '"' +
      ' placeholder="' + esc(c.ph || '') + '" value="' + esc(v) + '"' + dis + '>' +
      '</div>';
  }

  /* ============================================================
     ENTREGA 4 — DOCUMENTOS
     ============================================================ */
  function bloqueDocs_() {
    var b = null;
    (S.data && S.data.bloques ? S.data.bloques : []).forEach(function (x) {
      if (x.clave === 'DOCUMENTOS') b = x;
    });
    return b;
  }
  /* ¿El backend admite subir ESTE documento ahora? Manda su respuesta,
     no una regla repetida aquí: así el front nunca ofrece un botón que
     el servidor va a rechazar. */
  function docSubible_(k) {
    var b = bloqueDocs_();
    return !!(b && b.subibles && b.subibles[k]);
  }
  function docMaxMb_() {
    var b = bloqueDocs_();
    return (b && b.maxMb) ? b.maxMb : MAX_MB;
  }

  function dropPintar_(k) {
    var drop = q('#fm-drop-' + k);
    if (!drop) return;
    var c = campoDe_(k);
    drop.innerHTML = '<span class="fm-drop-m">📎 <b>Arrastra</b> el archivo, <b>pega</b> con Ctrl+V o <b>toca</b> para elegirlo' +
      '<small>' + (c && c.doc === 'foto' ? 'Imagen PNG o JPG' : 'Archivo PDF') + ' · máx. ' + docMaxMb_() + ' MB</small></span>';
  }
  function dropAviso_(k, html) {
    var drop = q('#fm-drop-' + k);
    if (!drop) return;
    drop.innerHTML = '<span class="fm-drop-m fm-drop-m--mal">' + html + '</span>';
    setTimeout(function () { dropPintar_(k); }, 3500);
  }

  /* Archivos de un arrastre o de un pegado. Sirve tanto para la imagen
     copiada de una página como para el archivo copiado del explorador
     (que llega en dt.files, no en dt.items). */
  function archivosDe_(dt) {
    if (!dt) return [];
    var out = [];
    function admite(f) {
      return f && (/^image\//.test(f.type) || f.type === 'application/pdf' ||
                   /\.(pdf|png|jpe?g)$/i.test(f.name || ''));
    }
    if (dt.items) {
      Array.prototype.forEach.call(dt.items, function (it) {
        if (it.kind !== 'file') return;
        var f = it.getAsFile();
        if (admite(f)) out.push(f);
      });
    }
    if (!out.length && dt.files) {
      Array.prototype.forEach.call(dt.files, function (f) { if (admite(f)) out.push(f); });
    }
    return out;
  }

  /* Lo pegado no siempre trae nombre (una imagen copiada de la pantalla
     no lo tiene): se le inventa uno con la extensión que corresponda. */
  function nombreDe_(file, c) {
    if (file.name && /\.[a-z0-9]{2,5}$/i.test(file.name)) return file.name;
    var ext = file.type === 'application/pdf' ? 'pdf'
            : (String(file.type).split('/')[1] || 'png').replace('jpeg', 'jpg');
    if (['pdf', 'png', 'jpg'].indexOf(ext) < 0) ext = c && c.doc === 'foto' ? 'png' : 'pdf';
    return (c && c.doc === 'foto' ? 'foto' : 'documento') + '.' + ext;
  }

  function leerArchivo_(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1]); };
      r.onerror = function () { rej(new Error('No se pudo leer el archivo')); };
      r.readAsDataURL(file);
    });
  }

  async function subirDoc_(k, file) {
    var c = campoDe_(k);
    if (!c) return;
    /* El seguro se echa AQUÍ, antes de la confirmación: si se pone
       después del await, dos gotas seguidas sobre la misma casilla
       lanzan dos subidas. */
    if (SUBIENDO) {
      return dropAviso_(k, '⏳ Espera a que termine el archivo que se está subiendo.');
    }
    SUBIENDO = k;
    try {
      await subirDocPaso_(k, c, file);
    } finally {
      if (SUBIENDO === k) SUBIENDO = '';
    }
  }

  async function subirDocPaso_(k, c, file) {

    /* Las mismas dos comprobaciones que hace el backend, para avisar
       antes de gastar la subida: extensión y tipo declarado. */
    var nombre = nombreDe_(file, c);
    var ext = String(nombre.split('.').pop() || '').toLowerCase();
    var okExt = (c.doc === 'foto') ? ['png', 'jpg', 'jpeg'].indexOf(ext) >= 0 : ext === 'pdf';
    var okMime = !file.type || (c.doc === 'foto' ? /^image\/(png|jpe?g)$/.test(file.type)
                                                 : file.type === 'application/pdf');
    if (!okExt || !okMime) {
      return dropAviso_(k, '❌ ' + (c.doc === 'foto'
        ? 'La foto debe ser una imagen PNG o JPG.'
        : 'Ese documento debe ser un archivo PDF.'));
    }
    if (file.size > docMaxMb_() * 1024 * 1024) {
      return dropAviso_(k, '❌ El archivo pesa más de ' + docMaxMb_() + ' MB. Comprímelo antes de subirlo.');
    }

    /* Confirmación con vista previa: un pegado sin querer no puede
       cambiarle el documento a nadie. */
    var previa = '';
    if (/^image\//.test(file.type || '')) { try { previa = URL.createObjectURL(file); } catch (e) { previa = ''; } }
    var yaHay = !!txt(S.vals[k]);
    var conf = await Swal.fire({
      title: yaHay ? '¿Reemplazar el archivo?' : '¿Subir este archivo?',
      html: '<div style="font-size:13px;margin-bottom:8px">' + esc(c.l) + '</div>' +
            (previa ? '<img src="' + previa + '" style="max-width:100%;max-height:260px;border-radius:10px;border:1px solid #e3e9f2">'
                    : '<div style="font-size:13px">📄 ' + esc(file.name || nombre) + '</div>') +
            (yaHay ? '<div style="font-size:12px;margin-top:8px;color:#b45309">El archivo que ya subiste se reemplaza.</div>' : ''),
      showCancelButton: true, confirmButtonText: yaHay ? 'Reemplazar' : 'Subir',
      cancelButtonText: 'Cancelar', focusCancel: true
    });
    if (previa) { try { URL.revokeObjectURL(previa); } catch (e) { /* no-op */ } }
    if (!conf.isConfirmed) return;

    if (S.bloque) pintarBloque(true);
    try {
      var base64 = await leerArchivo_(file);
      var res = await apiPost('formArchivo', Object.assign(cred_(), {
        campo: k, filename: nombre, mime: file.type || '', base64: base64
      }));
      SUBIENDO = '';
      /* La respuesta es el estado completo del formulario: se toma tal
         cual, para que los permisos de los demás documentos queden al
         día sin pedir nada más. */
      S.data = res;
      refrescarBloque_();
      /* El inicio también tiene que enterarse: si no, la tarjeta sigue
         pidiendo un documento que el estudiante acaba de subir. */
      try {
        var e2 = await apiPost('loginEstudiante', { clave: cred_().clave });
        if (typeof EST !== 'undefined') { EST = e2; renderHome_(); }
      } catch (_) { /* el archivo ya quedó guardado: no es grave */ }
      toast_('success', 'Archivo cargado');
    } catch (e) {
      SUBIENDO = '';
      /* Puede haberse salido del bloque mientras subía: entonces no hay
         nada que repintar, pero el aviso SÍ tiene que salir. */
      if (S.bloque) pintarBloque(true);
      error_(e.message || e);
    }
  }

  /* Vuelve a tomar del estado el bloque que está abierto (después de
     subir un documento cambian los permisos y los valores). */
  function refrescarBloque_() {
    if (!S.bloque) return;
    var n = S.bloque.n, nuevo = null;
    S.data.bloques.forEach(function (x) { if (x.n === n) nuevo = x; });
    if (!nuevo) return pintarLista();
    S.bloque = nuevo;
    nuevo.campos.forEach(function (c) {
      if (c.t === 'archivo') S.vals[c.k] = txt(nuevo.valores[c.k]);
    });
    pintarBloque(true);
  }

  /* Visor dentro de la app: no abre pestaña (el mismo del contrato). */
  function verDoc_(k) {
    var url = txt(S.vals[k]);
    if (!url) return;
    var c = campoDe_(k);
    var m = String(url).match(/[-\w]{25,}/);
    var tit = q('#ctr-visor-title'); if (tit) tit.textContent = (c && c.l) || 'Archivo';
    var fr = q('#ctr-visor-frame');
    if (fr) fr.src = m ? 'https://drive.google.com/file/d/' + m[0] + '/preview' : url;
    var a = q('#ctr-visor-bajar');
    if (a) a.href = m ? 'https://drive.google.com/uc?export=download&id=' + m[0] : url;
    var v = q('#ctr-visor'); if (v) v.classList.remove('hidden');
  }

  function preHtml_(d) {
    var fila = function (l, v) {
      return '<div class="fm-pre-f"><span>' + esc(l) + '</span><b>' + esc(v || '—') + '</b></div>';
    };
    return '' +
      '<div class="card fm-pre">' +
      '  <h2><span class="em">🆔</span> Tus datos</h2>' +
      '  <p class="muted">Estos datos vienen de tu contrato. Si algo está mal, escríbele a tu asesor(a).</p>' +
      fila('Nombres', d.nombres) +
      fila('Apellidos', d.apellidos) +
      fila('Documento', d.documento) +
      fila('Fecha de nacimiento', d.nacimiento) +
      fila('Correo electrónico', d.correo) +
      fila('WhatsApp', d.whatsapp) +
      fila('Dirección', d.direccion) +
      '</div>';
  }

  function pintarBloque(conservarScroll) {
    var b = S.bloque;
    /* ENTREGA 4 — el bloque de documentos puede estar ya enviado y aun
       así admitir los tres archivos que el usuario dejó "para después".
       En ese caso la pantalla se abre, pero sin botón de guardar. */
    var soloDocs = !b.editable && !!b.soloDocs;
    var editable = b.editable || soloDocs;
    var pct = Math.round((b.n / S.data.total) * 100);
    q('#fm-sub').textContent = 'Bloque ' + b.n + ' de ' + S.data.total;
    q('#fm-bar').style.width = pct + '%';

    /* Los campos se agrupan cuando comparten 'gr' (lugar de nacimiento,
       redes, datos del padre…). Se trabaja SOLO con los campos visibles
       y el título del grupo se busca en cualquiera de sus campos, no
       únicamente en el primero: así, si el primero queda oculto por una
       condición, el grupo no se queda sin título ni se parte en dos. */
    var visibles = b.campos.filter(visible_);
    var titulos = {};
    b.campos.forEach(function (c) {
      if (!c.gr || titulos[c.gr]) return;
      if (c.grl || c.gray) titulos[c.gr] = { l: c.grl || '', ay: c.gray || '' };
    });

    var html = '', grupoAbierto = '';
    visibles.forEach(function (c) {
      var gr = c.gr || '';
      if (gr !== grupoAbierto) {
        if (grupoAbierto) html += '</div></div>';
        grupoAbierto = gr;
        if (gr) {
          var tit = titulos[gr] || { l: '', ay: '' };
          html += '<div class="fm-grupo"><div class="fm-grupo-h">' + esc(tit.l) + '</div>' +
                  (tit.ay ? '<small class="fm-ay">' + esc(tit.ay) + '</small>' : '') +
                  '<div class="fm-grupo-c">';
        }
      }
      html += campoHtml_(c, editable);
    });
    if (grupoAbierto) html += '</div></div>';

    var pie;
    if (soloDocs) {
      pie = '<div class="ctr-nav">' +
            '  <button class="btn btn-ghost btn-block" id="fm-volver">← Volver</button>' +
            '</div>' +
            '<p class="muted center" style="margin:10px 0 0">Este bloque ya fue enviado. ' +
            'Puedes subir los documentos que quedaron pendientes; el resto no se puede cambiar.</p>';
    } else if (!editable) {
      pie = '<div class="ctr-nav">' +
            '  <button class="btn btn-ghost" id="fm-volver">← Volver</button>' +
            '</div>' +
            '<p class="muted center" style="margin:10px 0 0">' +
            (S.data.aprobado ? 'Tu formulario ya fue validado.' : 'Este bloque ya fue enviado y quedó cerrado.') + '</p>';
    } else {
      pie = '<div class="ctr-nav">' +
            '  <button class="btn btn-ghost" id="fm-volver">← Volver</button>' +
            (b.opcional ? '  <button class="btn btn-ghost" id="fm-pendiente">Dejar pendiente</button>' : '') +
            '  <button class="btn btn-accent" id="fm-guardar">' +
            (b.editableSiempre ? 'Guardar' : 'Guardar y continuar') + '</button>' +
            '</div>';
    }

    q('#fm-cont').innerHTML = '' +
      (b.n === 1 ? preHtml_(S.data.precargados) : '') +
      '<div class="card">' +
      '  <h2><span class="em">' + esc(b.icono) + '</span> ' + esc(b.titulo) + '</h2>' +
      (b.intro ? '  <p class="fm-intro">' + esc(introTexto_(b.intro)) + '</p>' : '') +
      (b.aviso ? '  <p class="fm-aviso">' + esc(b.aviso) + '</p>' : '') +
      (!editable && b.estado === 'COMPLETADO'
        ? '  <p class="fm-cerrado">🔒 Bloque completado el ' + esc(b.fecha || '—') + '</p>' : '') +
      html +
      '</div>' +
      pie;

    /* Solo al ABRIR el bloque se sube la vista. En los repintados (cada
       Sí/No, cada habilidad, cada línea nueva) se conserva el punto donde
       estaba leyendo: si no, el bloque 6 lo mandaría cinco veces arriba
       mientras elige sus cinco habilidades. */
    if (!conservarScroll) window.scrollTo({ top: 0, behavior: 'auto' });
    cablear_();
  }

  /* ============================================================
     CABLEADO
     ============================================================ */
  function repintar_() { pintarBloque(true); }

  function cablear_() {
    var cont = q('#fm-cont');

    /* Texto / número / correo / url / textarea */
    Array.prototype.forEach.call(cont.querySelectorAll('[data-k]'), function (el) {
      var k = el.dataset.k, tipo = el.dataset.tipo || '';
      if (el.type === 'checkbox') {
        el.addEventListener('change', function () { S.vals[k] = el.checked ? 'Si' : ''; });
        return;
      }
      if (el.tagName === 'SELECT') {
        el.addEventListener('change', function () {
          S.vals[k] = el.value;
          if (hayDependientes_(k)) repintar_();
        });
        return;
      }
      el.addEventListener('input', function () {
        if (tipo === 'num' || tipo === 'tel') el.value = dig(el.value);
        S.vals[k] = el.value;
      });
    });

    /* Sí / No */
    Array.prototype.forEach.call(cont.querySelectorAll('[data-sino]'), function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.sino;
        S.vals[k] = (S.vals[k] === b.dataset.v) ? '' : b.dataset.v;
        repintar_();
      });
    });

    /* Habilidades */
    Array.prototype.forEach.call(cont.querySelectorAll('[data-chip]'), function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.chip, v = b.dataset.v;
        var campo = campoDe_(k);
        var tope = campo.n || 5;
        var arr = S.vals[k] || [];
        var i = arr.indexOf(v);
        if (i >= 0) arr.splice(i, 1);
        else {
          if (arr.length >= tope) {
            return Swal.fire({ icon: 'info', title: 'Ya elegiste ' + tope,
              text: 'Quita una habilidad si quieres cambiarla.' });
          }
          arr.push(v);
        }
        S.vals[k] = arr;
        repintar_();
      });
    });

    /* Fechas simples */
    Array.prototype.forEach.call(cont.querySelectorAll('[data-fecha]'), function (b) {
      b.addEventListener('click', function () {
        var c = campoDe_(b.dataset.fecha);
        abrirRueda_(S.vals[c.k], c.modo, c.l, function (v) {
          S.vals[c.k] = v; repintar_();
        });
      });
    });

    /* Listas repetibles */
    Array.prototype.forEach.call(cont.querySelectorAll('[data-slista]'), function (el) {
      el.addEventListener('input', function () {
        var c = campoDe_(el.dataset.slista);
        var sc = subDe_(c, el.dataset.sk);
        if (sc && sc.t === 'num') el.value = dig(el.value);
        S.vals[c.k][+el.dataset.i][el.dataset.sk] = el.value;
      });
    });
    Array.prototype.forEach.call(cont.querySelectorAll('[data-sfecha]'), function (b) {
      b.addEventListener('click', function () {
        var c = campoDe_(b.dataset.sfecha);
        var sc = subDe_(c, b.dataset.sk);
        var i = +b.dataset.i;
        abrirRueda_(S.vals[c.k][i][sc.k], sc.modo, sc.l, function (v) {
          S.vals[c.k][i][sc.k] = v; repintar_();
        });
      });
    });
    Array.prototype.forEach.call(cont.querySelectorAll('[data-agregar]'), function (b) {
      b.addEventListener('click', function () {
        var c = campoDe_(b.dataset.agregar);
        S.vals[c.k].push(filaVacia_(c));
        repintar_();
      });
    });
    Array.prototype.forEach.call(cont.querySelectorAll('[data-quitar]'), function (b) {
      b.addEventListener('click', function () {
        var c = campoDe_(b.dataset.quitar);
        S.vals[c.k].splice(+b.dataset.i, 1);
        repintar_();
      });
    });

    /* Sí / No dentro de una línea repetible */
    Array.prototype.forEach.call(cont.querySelectorAll('[data-ssino]'), function (b) {
      b.addEventListener('click', function () {
        var c = campoDe_(b.dataset.ssino);
        var i = +b.dataset.i, sk = b.dataset.sk;
        var fila = S.vals[c.k][i];
        fila[sk] = (fila[sk] === b.dataset.v) ? '' : b.dataset.v;
        limpiarLiberados_(c, fila);
        repintar_();
      });
    });

    /* ENTREGA 4 — documentos: ver, elegir, arrastrar y pegar */
    Array.prototype.forEach.call(cont.querySelectorAll('[data-doc]'), function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.doc === 'ver') return verDoc_(b.dataset.k);
        var inp = q('#fm-file-' + b.dataset.k);
        if (inp) inp.click();
      });
    });
    Array.prototype.forEach.call(cont.querySelectorAll('[data-file]'), function (inp) {
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0];
        inp.value = '';
        if (f) subirDoc_(inp.dataset.file, f);
      });
    });
    Array.prototype.forEach.call(cont.querySelectorAll('[data-drop]'), function (drop) {
      var k = drop.dataset.drop;
      dropPintar_(k);
      drop.addEventListener('click', function () { var i = q('#fm-file-' + k); if (i) i.click(); });
      /* La caja es editable SOLO para poder pegar: nadie debe escribir
         dentro. Se deja pasar Ctrl/Cmd+V y las teclas de navegación. */
      drop.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); var i = q('#fm-file-' + k); if (i) i.click(); return; }
        if (e.key === 'Tab' || e.key === 'Escape') return;
        e.preventDefault();
      });
      drop.addEventListener('input', function () { dropPintar_(k); });   // red de seguridad
      ['dragenter', 'dragover'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
          e.preventDefault(); e.stopPropagation(); drop.classList.add('is-drag');
        });
      });
      ['dragleave', 'dragend'].forEach(function (ev) {
        drop.addEventListener(ev, function () { drop.classList.remove('is-drag'); });
      });
      drop.addEventListener('drop', function (e) {
        e.preventDefault(); e.stopPropagation(); drop.classList.remove('is-drag');
        var files = archivosDe_(e.dataTransfer);
        if (!files.length) return dropAviso_(k, '❌ Eso que soltaste no es un archivo válido.');
        if (files.length > 1) dropAviso_(k, '⚠️ En esta casilla va un solo archivo: se tomó el primero.');
        subirDoc_(k, files[0]);
      });
      drop.addEventListener('paste', function (e) {
        e.preventDefault();
        var files = archivosDe_(e.clipboardData);
        if (!files.length) return dropAviso_(k, '❌ En el portapapeles no hay un archivo. Cópialo y vuelve a pegar.');
        if (files.length > 1) dropAviso_(k, '⚠️ En esta casilla va un solo archivo: se tomó el primero.');
        subirDoc_(k, files[0]);
      });
    });

    q('#fm-volver') && q('#fm-volver').addEventListener('click', function () { volverALista(); });
    q('#fm-guardar') && q('#fm-guardar').addEventListener('click', function () { guardar(false); });
    q('#fm-pendiente') && q('#fm-pendiente').addEventListener('click', function () { guardar(true); });
  }

  /* El encabezado del bloque 13 lleva el nombre del estudiante. Los
     datos salen de 'precargados' (NIVEL_INGLES), no los escribe él. */
  function introTexto_(plantilla) {
    var d = (S.data && S.data.precargados) || {};
    return String(plantilla || '')
      .replace('{nombres}', txt(d.nombres))
      .replace('{apellidos}', txt(d.apellidos))
      .replace(/\s+/g, ' ').trim();
  }

  /* Borra de una línea los subcampos que quedaron liberados por
     'reqSalvo'. Es lo mismo que hace el backend al guardar: si no se
     hiciera aquí, la pantalla seguiría validando una fecha que el
     servidor va a tirar. */
  function limpiarLiberados_(c, fila) {
    (c.sub || []).forEach(function (sc) {
      if (sc.reqSalvo && txt(fila[sc.reqSalvo.k]) === sc.reqSalvo.v) fila[sc.k] = '';
    });
  }

  function campoDe_(k) {
    var out = null;
    S.bloque.campos.forEach(function (c) { if (c.k === k) out = c; });
    return out;
  }
  function subDe_(c, k) {
    var out = null;
    (c.sub || []).forEach(function (s) { if (s.k === k) out = s; });
    return out;
  }
  function hayDependientes_(k) {
    var hay = false;
    S.bloque.campos.forEach(function (c) { if (c.ver && c.ver.k === k) hay = true; });
    return hay;
  }

  function volverALista(destino) {
    var seguir = destino || pintarLista;
    var b = S.bloque;
    if (!b.editable) { seguir(); return; }
    var escrito = false;
    b.campos.forEach(function (c) {
      /* Un documento ya subido está GUARDADO: no es trabajo sin
         guardar y no puede disparar el aviso de "se pierde". */
      if (c.t === 'archivo') return;
      var v = S.vals[c.k];
      if (Array.isArray(v)) { v.forEach(function (x) {
        if (typeof x === 'string') { if (txt(x)) escrito = true; }
        else Object.keys(x || {}).forEach(function (kk) { if (txt(x[kk])) escrito = true; });
      }); }
      else if (txt(v)) escrito = true;
    });
    if (!escrito) return seguir();
    Swal.fire({
      icon: 'question', title: '¿Salir del bloque?',
      text: 'Lo que escribiste aquí y no has guardado se pierde.',
      showCancelButton: true, confirmButtonText: 'Sí, salir', cancelButtonText: 'Seguir llenando'
    }).then(function (r) { if (r.isConfirmed) seguir(); });
  }

  /* ============================================================
     VALIDACIÓN EN PANTALLA (la misma regla que el backend)
     ============================================================ */
  function validarValor_(c, v) {
    var s = txt(v);
    if (!s) return '';
    /* Misma regla que el backend: una lista desplegable solo admite
       lo que está en la lista. */
    if (c.t === 'select' && (c.op || []).indexOf(s) < 0) return c.l + ': elige una de las opciones de la lista.';
    if (c.t === 'correo' && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(s)) return c.l + ': escribe un correo válido.';
    if (c.t === 'url' && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(s)) return c.l + ': el enlace debe empezar por http:// o https://';
    if (c.t === 'tel' && dig(s).length !== 10) return c.l + ': debe tener exactamente 10 dígitos.';
    if (c.t === 'num' && c.maxlen && dig(s).length > c.maxlen) {
      return c.l + ': no puede tener más de ' + c.maxlen + ' dígitos.';
    }
    if (c.t === 'num' && c.max && Number(dig(s)) > c.max) return c.l + ': el valor máximo es ' + c.max + '.';
    if (c.t === 'num' && Number(dig(s)) <= 0) return c.l + ': escribe un número mayor que cero.';
    if (c.t === 'fecha') {
      var f = fechaValida_(s);
      if (!f) return c.l + ': la fecha no es válida.';
      var hoy = hoy0_();
      if (c.modo === 'pasada' && f > hoy) return c.l + ': no puede ser una fecha futura.';
      if (c.modo === 'futura' && f < hoy) return c.l + ': no puede ser una fecha pasada.';
      if (c.modo === 'adulto' && f > new Date(hoy.getFullYear() - 20, hoy.getMonth(), hoy.getDate())) {
        return c.l + ': debe ser de una persona mayor de 20 años.';
      }
    }
    return '';
  }

  function obligatorio_(c) {
    if (c.req) return true;
    if (c.reqSi) return !!txt(S.vals[c.reqSi]);
    return false;
  }

  function validarBloque_() {
    var errores = [];
    var b = S.bloque;

    b.campos.forEach(function (c) {
      if (!visible_(c)) return;

      /* ENTREGA 4 — un documento obligatorio que no se subió. */
      if (c.t === 'archivo') {
        if (c.req && !txt(S.vals[c.k])) errores.push('Falta subir: ' + c.l + '.');
        return;
      }

      if (c.t === 'lista') {
        /* Se conserva el número de línea REAL: el backend numera sobre
           todas las líneas y el front tiene que decir lo mismo, o el
           estudiante busca el error en la línea equivocada. */
        var todas = (S.vals[c.k] || []);
        var filas = [];
        todas.forEach(function (f, idx) {
          var algo = false;
          Object.keys(f || {}).forEach(function (kk) { if (txt(f[kk])) algo = true; });
          if (algo) filas.push({ f: f, n: idx + 1 });
        });
        if (obligatorio_(c) && filas.length < Math.max(1, c.min || 1)) {
          errores.push(c.l + ': agrega al menos ' + Math.max(1, c.min || 1) + ' línea.');
          return;
        }
        if (filas.length > (c.maxFilas || MAX_FILAS)) {
          errores.push(c.l + ': no se pueden agregar más de ' + (c.maxFilas || MAX_FILAS) + ' líneas.');
        }
        filas.forEach(function (par0) {
          var f = par0.f, n = par0.n;
          /* Igual que el backend: primero se vacía lo que 'reqSalvo'
             libera y solo después se valida. */
          limpiarLiberados_(c, f);
          c.sub.forEach(function (sc) {
            if (sc.reqSalvo && txt(f[sc.reqSalvo.k]) === sc.reqSalvo.v) return;
            var e = validarValor_(sc, f[sc.k]);
            if (e) { errores.push(c.l + ' (fila ' + n + ') — ' + e); return; }
            if (sc.req && !txt(f[sc.k])) errores.push(c.l + ' (fila ' + n + '): falta ' + sc.l + '.');
          });
          /* Parejas de fechas que deben ir en orden. */
          [['inicio', 'fin', 'la fecha de finalización no puede ser anterior a la de inicio'],
           ['ingreso', 'salida', 'la fecha de salida no puede ser anterior a la de ingreso']].forEach(function (par) {
            var a = fechaValida_(f[par[0]]), b2 = fechaValida_(f[par[1]]);
            if (a && b2 && b2 < a) errores.push(c.l + ' (fila ' + n + '): ' + par[2] + '.');
          });
        });
        return;
      }

      if (c.t === 'chips') {
        var n = c.n || 5;
        var sel = S.vals[c.k] || [];
        if (obligatorio_(c) && sel.length !== n) errores.push(c.l + ': debes elegir exactamente ' + n + '.');
        else if (sel.length && sel.length !== n) errores.push(c.l + ': debes elegir exactamente ' + n + '.');
        return;
      }

      var v = S.vals[c.k];
      var err = validarValor_(c, v);
      if (err) { errores.push(err); return; }
      if (obligatorio_(c) && !txt(v)) {
        errores.push(c.t === 'check' ? 'Debes marcar: ' + c.l : 'Falta: ' + c.l);
      }
    });

    if (b.n === 3) {
      var d1 = fechaValida_(S.vals.DISPONIBLE_DESDE), d2 = fechaValida_(S.vals.DISPONIBLE_HASTA);
      if (d1 && d2 && d2 < d1) errores.push('La última fecha disponible no puede ser anterior a la fecha de inicio.');
    }
    /* El pasaporte no cruza sus dos fechas: una es 'pasada' y la otra
       'futura', así que el vencimiento nunca queda antes. El backend
       tampoco lo hace y las dos validaciones deben decir lo mismo. */
    if (b.n === 6) {
      var c1 = fechaValida_(S.vals.COLEGIO_INICIO), c2 = fechaValida_(S.vals.COLEGIO_FIN);
      if (c1 && c2 && c2 < c1) errores.push('La finalización del colegio no puede ser anterior a su inicio.');
    }
    return errores;
  }

  function vacio_() {
    var algo = false;
    S.bloque.campos.forEach(function (c) {
      if (c.t === 'archivo') return;
      var v = S.vals[c.k];
      if (Array.isArray(v)) v.forEach(function (x) {
        if (typeof x === 'string') { if (txt(x)) algo = true; }
        else Object.keys(x || {}).forEach(function (kk) { if (txt(x[kk])) algo = true; });
      });
      else if (txt(v)) algo = true;
    });
    return !algo;
  }

  /* ============================================================
     GUARDAR
     ============================================================ */
  async function guardar(pendiente) {
    if (S.guardando) return;
    var b = S.bloque;

    if (pendiente && !vacio_()) {
      var sigue = await Swal.fire({
        icon: 'question', title: '¿Dejarlo pendiente?',
        text: 'Escribiste algo en este bloque. Si lo dejas pendiente, eso no se guarda.',
        showCancelButton: true, confirmButtonText: 'Sí, dejarlo pendiente', cancelButtonText: 'Volver'
      });
      if (!sigue.isConfirmed) return;
      b.campos.forEach(function (c) { S.vals[c.k] = (c.t === 'lista' || c.t === 'chips') ? [] : ''; });
    }

    if (!pendiente) {
      var errores = validarBloque_();
      if (errores.length) return avisoFalta(errores);

      var conf = await Swal.fire({
        icon: 'warning',
        title: b.editableSiempre ? '¿Guardar este bloque?' : '¿Enviar este bloque?',
        html: b.editableSiempre
          ? 'Verifica que la información sea correcta. Este bloque lo podrás actualizar más adelante si lo necesitas.'
          : '<b>Verifica que la información sea correcta</b>, porque después de continuar no podrás modificarla.',
        showCancelButton: true,
        confirmButtonText: b.editableSiempre ? 'Sí, guardar' : 'Sí, enviar',
        cancelButtonText: 'Revisar de nuevo'
      });
      if (!conf.isConfirmed) return;
    }

    /* Lo que va al backend: las listas ya vienen como arreglo y él las
       vuelve JSON; los chips van como arreglo. */
    var datos = {};
    b.campos.forEach(function (c) {
      /* Los documentos NO viajan aquí: ya están subidos y su URL vive
         en la hoja. Mandarlos solo abriría la puerta a pisarlos. */
      if (c.t === 'archivo') return;
      datos[c.k] = S.vals[c.k];
    });

    S.guardando = true;
    var btn = q('#fm-guardar');
    var etiqueta = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    try {
      var res = await apiPost('guardarBloque', Object.assign(cred_(), {
        bloque: b.n, datos: datos, pendiente: !!pendiente
      }));
      if (res && res.ok === false) {
        if (btn) { btn.disabled = false; btn.textContent = etiqueta; }
        return avisoFalta(res.errores || ['No pudimos guardar el bloque.']);
      }

      S.data = res;
      /* El inicio también tiene que reflejar el avance. */
      try {
        var e = await apiPost('loginEstudiante', { clave: cred_().clave });
        if (typeof EST !== 'undefined') { EST = e; renderHome_(); }
      } catch (_) { /* el formulario ya quedó guardado: no es grave */ }

      pintarLista();
      if (pendiente) toast_('success', 'Bloque dejado pendiente');
      else if (S.data.terminado) {
        var pend = (S.data.docsPendientes || []);
        Swal.fire({ icon: 'success', title: '¡Terminaste tu formulario!',
          html: 'Guardamos toda tu información y nuestro equipo va a revisarla.' +
                (pend.length ? '<br><br>Cuando los tengas, súbelos en el bloque de documentos: <b>' +
                               pend.map(esc).join('</b>, <b>') + '</b>.' : '') });
      } else toast_('success', 'Bloque guardado 🔒');
    } catch (e) {
      error_(e.message || e);
      /* Si falló, el bloque sigue en pantalla: el botón vuelve a la vida. */
      var b2 = q('#fm-guardar');
      if (b2) { b2.disabled = false; b2.textContent = etiqueta; }
    } finally { S.guardando = false; }
  }

  /* ============================================================
     SALIDA
     ============================================================ */
  /* Salir por la barra superior tiene que preguntar igual que "← Volver":
     si no, un toque perdido se lleva por delante un bloque entero recién
     escrito. Es lo mismo que hace el contrato (CONTRATO.volverInicio). */
  function salir_() {
    if (!S.bloque || !S.bloque.editable) return showView('home');
    volverALista(function () { showView('home'); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var s = q('#fm-salir');
    if (s) s.addEventListener('click', salir_);
  });

  return { tarjeta: tarjeta, bind: bind, abrir: abrir, _s: S };
})();
