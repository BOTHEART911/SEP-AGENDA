/* ============================================================
 * SEP COLOMBIA — ZONA DE ESTUDIANTES · FORMULARIO SUMMER
 * © Oscar Polanía — Experto en Soluciones Digitales · +57 310 323 0712
 * Software propietario; cualquier modificación por terceros anula la garantía.
 * ------------------------------------------------------------
 * FASE 3 SEP · ENTREGA 3 (16/08/2026) — BLOQUES 1 A 7
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
          '    <p>¡Completaste esta parte del formulario! Muy pronto habilitaremos la siguiente.</p></div>'
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
          '<p>¡Terminaste esta parte del formulario! Te avisaremos por WhatsApp y correo cuando habilitemos la siguiente.</p></div>'
        : '') +
      '<div class="ctr-nav"><button class="btn btn-ghost btn-block" id="fm-salir-l">← Volver al inicio</button></div>';

    window.scrollTo({ top: 0, behavior: 'auto' });
    Array.prototype.forEach.call(document.querySelectorAll('[data-bloque]'), function (b) {
      b.addEventListener('click', function () { irABloque(+b.dataset.bloque); });
    });
    q('#fm-salir-l').addEventListener('click', function () { showView('home'); });
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
          c.sub.map(function (sc) {
            var sid = 'fm-' + c.k + '-' + i + '-' + sc.k;
            var sv = txt(fila[sc.k]);
            if (sc.t === 'fecha') {
              return '<div class="fm-sf"><label>' + esc(sc.l) + '</label>' +
                     '<button type="button" class="fm-fecha' + (sv ? ' con' : '') + '" data-sfecha="' + c.k + '" data-i="' + i + '" data-sk="' + sc.k + '"' + dis + '>' +
                     '<span class="fm-fecha-ic">📅</span><span class="fm-fecha-t">' + (sv ? esc(sv) : 'Elegir') + '</span></button></div>';
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
          ? (filas.length >= MAX_FILAS
              ? '  <p class="muted center">Llegaste al máximo de ' + MAX_FILAS + ' líneas.</p>'
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
    var editable = b.editable;
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
    if (!editable) {
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

    q('#fm-volver') && q('#fm-volver').addEventListener('click', function () { volverALista(); });
    q('#fm-guardar') && q('#fm-guardar').addEventListener('click', function () { guardar(false); });
    q('#fm-pendiente') && q('#fm-pendiente').addEventListener('click', function () { guardar(true); });
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

      if (c.t === 'lista') {
        var filas = (S.vals[c.k] || []).filter(function (f) {
          var algo = false;
          Object.keys(f || {}).forEach(function (kk) { if (txt(f[kk])) algo = true; });
          return algo;
        });
        if (obligatorio_(c) && filas.length < Math.max(1, c.min || 1)) {
          errores.push(c.l + ': agrega al menos ' + Math.max(1, c.min || 1) + ' línea.');
          return;
        }
        filas.forEach(function (f, i) {
          c.sub.forEach(function (sc) {
            var e = validarValor_(sc, f[sc.k]);
            if (e) errores.push(c.l + ' (fila ' + (i + 1) + ') — ' + e);
            else if (sc.req && !txt(f[sc.k])) errores.push(c.l + ' (fila ' + (i + 1) + '): falta ' + sc.l + '.');
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
    b.campos.forEach(function (c) { datos[c.k] = S.vals[c.k]; });

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
        Swal.fire({ icon: 'success', title: '¡Terminaste esta parte!',
          text: 'Guardamos toda tu información. Te avisaremos cuando habilitemos la siguiente parte del formulario.' });
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
