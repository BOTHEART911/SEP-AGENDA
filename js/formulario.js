/* ============================================================
 * SEP COLOMBIA — ZONA DE ESTUDIANTES · FORMULARIO SUMMER
 * © Oscar Polanía — Experto en Soluciones Digitales · +57 310 323 0712
 * Software propietario; cualquier modificación por terceros anula la garantía.
 * ------------------------------------------------------------
 * FASE 3 SEP · ENTREGA 4 (17/08/2026) — BLOQUES 1 A 14 + DOCUMENTOS
 * LOTE 17/08/2026 — 6 ajustes del formulario: dos columnas en PC ·
 * la rueda de fecha se expone para el contrato (FORMU.rueda) ·
 * botón bloqueado y aviso del avión al guardar un bloque · al
 * subir un documento se queda en el bloque 14 · al guardar se
 * vuelve a "Tu formulario" y no al inicio · y los nombres de
 * personas, empresas, universidades, colegios, ciudades,
 * departamentos, países y nacionalidad se escriben en MAYÚSCULAS
 * mientras se teclean (el backend lo vuelve a aplicar al guardar).
 *
 * FASE 3 SEP · ENTREGA 5 (17/08/2026) — BLOQUES REABIERTOS
 *
 * FASE 3.1 · ENTREGA 2 (19/08/2026) — AJUSTES 1 A 4
 *   · El formulario entero se ve en INGLÉS de Estados Unidos, empezando
 *     por el botón del inicio (FORMS). El resto de la Zona de
 *     estudiantes sigue en español: lo que cambia de idioma es esta
 *     pantalla y su tarjeta, nada más.
 *   · Las FECHAS se siguen escribiendo y guardando en dd/mm/yyyy; lo
 *     único que cambia es el nombre del mes que se lee en pantalla.
 *     La rueda que le presta al contrato (FORMU.rueda) SIGUE saliendo
 *     en español: el contrato no cambió de idioma.
 *   · Los Sí/No se guardan como 'Yes'/'No'. igual_() sigue entendiendo
 *     el 'Si' de las filas anteriores al migrador, así que a nadie se
 *     le pierde una respuesta ya guardada.
 *   · Tipo de campo nuevo 'youtube': enlace del video de presentación,
 *     con previsualización dentro de la misma pantalla.
 *
 *   Novedad de la Entrega 5: un bloque ya aprobado puede volver a
 *   abrirse. Cuando el equipo de SEP necesita que el estudiante corrija
 *   algo, ese bloque llega con estado REABIERTO, editable y con el
 *   motivo que escribió quien lo reabrió. Los bloques de más adelante
 *   NO se cierran: la fila 1 → 2 → 3 se mantiene tal como estaba.
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
  /* FASE 3.1 — el formulario está en inglés, pero la MISMA rueda la usa
     el contrato, que sigue en español. Por eso hay dos juegos de meses
     y quien abre la rueda dice cuál quiere; sin parámetro, español. */
  var MESES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                  'August', 'September', 'October', 'November', 'December'];
  var RUEDA_TX = {
    es: { titulo: 'Elige la fecha', cancelar: 'Cancelar', ok: 'Listo' },
    en: { titulo: 'Choose the date', cancelar: 'Cancel', ok: 'Done' }
  };

  /* ---------------- utilidades ---------------- */
  function q(sel) { return document.querySelector(sel); }
  function esc(s) { return (typeof escapeHtml_ === 'function') ? escapeHtml_(s) : String(s == null ? '' : s); }
  function txt(v) { return String(v === null || v === undefined ? '' : v).trim(); }
  function dig(v) { return txt(v).replace(/\D/g, ''); }

  /* ---- ENTREGA 5 · bloques reabiertos ---------------------- */
  /* Un bloque reabierto es el que ADMIN o DESARROLLADOR le volvió a
     abrir al estudiante después de haberlo aprobado. Se miran las tres
     señales que puede mandar el backend (el estado de vista, el crudo
     y la bandera) para no depender de una sola. */
  function reabierto_(b) {
    return !!b && (b.estadoVista === 'REABIERTO' || b.estado === 'REABIERTO' || b.reabierto === true);
  }
  /* El motivo lo escribe quien reabre el bloque. Puede no llegar; en
     ese caso igual hay que decirle al estudiante qué tiene que hacer. */
  function motivoReab_(b) { return txt(b && b.motivoReapertura); }
  function bloquesReabiertos_() {
    var out = [];
    ((S.data && S.data.bloques) || []).forEach(function (b) { if (reabierto_(b)) out.push(b); });
    return out;
  }

  function avisoFalta(lista) {
    Swal.fire({
      icon: 'warning',
      title: 'Check this section',
      html: '<div style="text-align:left">• ' + lista.slice(0, 6).map(esc).join('<br>• ') +
            (lista.length > 6 ? '<br>• and ' + (lista.length - 6) + ' more…' : '') + '</div>'
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
  /* En pantalla se lee a la gringa (May 15, 2027); lo que viaja y lo
     que se guarda sigue siendo dd/mm/yyyy. */
  function fechaLarga_(s) {
    var f = fechaValida_(s);
    if (!f) return txt(s);
    return MESES_EN[f.getMonth()] + ' ' + f.getDate() + ', ' + f.getFullYear();
  }

  /* FASE 3.1 — comparación tolerante de opciones: la hoja guarda ahora
     'Yes'/'No' y las filas anteriores al migrador siguen con 'Si'. Es
     la misma respuesta y no puede desaparecer de la pantalla. */
  function norm_(v) { return txt(v).toUpperCase().replace(/Í/g, 'I'); }
  function igual_(a, b) {
    var x = norm_(a), y = norm_(b);
    if (x === 'SI') x = 'YES';
    if (y === 'SI') y = 'YES';
    return x === y;
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
    /* LOTE 17/08 — un campo puede pedir un rango EXACTO de años en vez
       de uno de los tres modos con nombre. Lo usa la fecha de
       nacimiento del contrato, que va de 17 a 28 años cumplidos. */
    if (modo && typeof modo === 'object') {
      for (i = modo.min; i <= modo.max; i++) a.push(i);
      return a;
    }
    if (modo === 'futura') { for (i = y; i <= y + 10; i++) a.push(i); return a; }
    if (modo === 'adulto') { for (i = y - 100; i <= y - 20; i++) a.push(i); return a; }
    for (i = y - 100; i <= y; i++) a.push(i);
    return a;
  }

  function abrirRueda_(valor, modo, titulo, onOk, en) {
    FP.onOk = onOk;
    FP.anios = fpAnios_(modo);
    var tx = RUEDA_TX[en ? 'en' : 'es'];

    var f = fechaValida_(valor);
    if (!f) {
      f = (modo === 'futura') ? hoy0_()
        : (modo === 'adulto' || (modo && typeof modo === 'object'))
            ? new Date(FP.anios[FP.anios.length - 1], 0, 1)
        : hoy0_();
    }
    var anioPos = FP.anios.indexOf(f.getFullYear());
    if (anioPos < 0) anioPos = (modo === 'futura') ? 0 : FP.anios.length - 1;

    q('#fpick-title').textContent = titulo || tx.titulo;
    /* Los dos botones de la rueda son los mismos para el formulario y
       para el contrato: se escriben cada vez que se abre. */
    if (q('#fpick-cancel')) q('#fpick-cancel').textContent = tx.cancelar;
    if (q('#fpick-ok')) q('#fpick-ok').textContent = tx.ok;
    q('#form-picker').classList.remove('hidden');

    var total = fpDiasMes_(f.getMonth(), FP.anios[anioPos]);
    FP.dias = []; for (var i = 1; i <= total; i++) FP.dias.push(i);

    fpBuild_(q('#fpick-dia'), FP.dias.map(String), Math.min(f.getDate() - 1, total - 1));
    fpBuild_(q('#fpick-mes'), (en ? MESES_EN : MESES).map(function (m) { return m.charAt(0).toUpperCase() + m.slice(1); }),
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
        '  <h2><span class="em">📝</span> FORMS</h2>' +
        '  <p class="muted center" style="padding:6px 0">' + esc(f.mensaje || '') + '</p>' +
        '</div>';
    }

    var listo = !!f.terminado;
    var pct = f.total ? Math.round((f.completados / f.total) * 100) : 0;
    var video = f.video
      ? '<a class="ctr-video" href="' + esc(f.video) + '" target="_blank" rel="noopener">🎬 Watch the form guide video</a>'
      : '';

    if (f.aprobado) {
      return '' +
        '<div class="card">' +
        '  <h2><span class="em">📝</span> FORMS</h2>' +
        '  <div class="ctr-ok">' +
        '    <div class="ctr-ok-ic">✅</div>' +
        '    <p>Your information has been <b>validated</b>. The form is now closed, but you can review it whenever you want.</p>' +
        '  </div>' +
        '  <button class="btn btn-ghost btn-block" id="form-abrir">👁 View my forms</button>' +
        '</div>';
    }

    /* ENTREGA 5 — al equipo le faltó algo y le reabrió uno o varios
       bloques. La tarjeta del inicio deja de invitarlo a "continuar":
       corregir eso es lo único que le falta para que le vuelvan a
       validar el perfil, así que se le dice sin rodeos. El resumen lo
       arma el backend y empieza por "Reabierto". */
    /* FASE 3.1 — antes esto se decidía leyendo si el resumen empezaba
       por "Reabierto". Ahora el resumen viene en inglés, así que se
       usa el contador que ya manda el backend: no depende del texto. */
    if (Number(f.reabiertos || 0) > 0) {
      return '' +
        '<div class="card">' +
        '  <h2><span class="em">📝</span> FORMS</h2>' +
        '  <div class="fm-reab-aviso">' +
        '    <div class="fm-reab-ic">↩️</div>' +
        '    <p><b>You have sections to correct.</b> We reviewed your form and we need you to fix something. ' +
        'Open them, correct what we asked for and submit them again: everything else stays saved as it was.</p>' +
        '  </div>' +
        '  <div class="fm-prog"><i style="width:' + pct + '%"></i></div>' +
        '  <p class="muted center fm-prog-t">' + esc(f.resumen || '') + '</p>' +
        '  <button class="btn btn-accent btn-block fm-btn-reab" id="form-abrir">↩️ Correct my sections</button>' +
        video +
        '</div>';
    }

    return '' +
      '<div class="card">' +
      '  <h2><span class="em">📝</span> FORMS</h2>' +
      (listo
        ? '  <div class="ctr-ok"><div class="ctr-ok-ic">🎉</div>' +
          '    <p>You completed your form! Our team is reviewing it.' +
          ((f.docsPendientes && f.docsPendientes.length)
            ? ' You still have to upload: <b>' + f.docsPendientes.map(esc).join('</b>, <b>') + '</b>.'
            : '') + '</p></div>'
        : '  <div class="ctr-call"><div class="ctr-call-ic">🗂️</div>' +
          '    <p>Complete your information section by section. You can do it in parts: whatever you save is kept safe.</p></div>') +
      '  <div class="fm-prog"><i style="width:' + pct + '%"></i></div>' +
      '  <p class="muted center fm-prog-t">' + esc(f.resumen || '') + '</p>' +
      '  <button class="btn ' + (listo ? 'btn-ghost' : 'btn-accent') + ' btn-block" id="form-abrir">' +
      (listo ? '👁 View my forms' : (f.completados ? 'Continue my forms' : 'Start my forms')) +
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
    q('#fm-sub').textContent = 'Loading your forms…';
    q('#fm-bar').style.width = '8%';
    showView('formulario');
    try {
      S.data = await apiPost('formEstado', cred_());
      quitar();
      if (!S.data.habilitado) {
        showView('home');
        return error_(S.data.mensaje || 'Your form is not available yet.');
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
    /* ENTREGA 5 — va de primero: un bloque reabierto ya estuvo
       completado, y si se preguntara después seguiría mostrándose
       como si estuviera cerrado con llave. */
    if (reabierto_(b)) return '<span class="fm-pill reab">To correct ↩️</span>';
    if (b.estadoVista === 'COMPLETADO') {
      /* El de Verificación académica queda completado pero SIN candado:
         el pliego pide que se pueda actualizar cuando lo necesite. */
      return b.editableSiempre
        ? '<span class="fm-pill ok">Completed ✏️</span>'
        : '<span class="fm-pill ok">Completed 🔒</span>';
    }
    if (b.estadoVista === 'EN_PROGRESO') return '<span class="fm-pill go">In progress</span>';
    return '<span class="fm-pill">Pending</span>';
  }

  function pintarLista() {
    S.bloque = null;                 // ya no hay bloque abierto
    var d = S.data;
    var pct = d.total ? Math.round((d.completados / d.total) * 100) : 0;
    q('#fm-sub').textContent = d.aprobado ? 'Read only' : d.resumen;
    q('#fm-bar').style.width = Math.max(6, pct) + '%';

    var items = d.bloques.map(function (b) {
      var reab = reabierto_(b);
      /* ENTREGA 5 — el bloque reabierto llega siempre abierto, pero no
         se apaga (nada de la clase 'cerrado'): es justo el que tiene
         que atender. */
      var abierto = b.abierto || reab;
      var sub;
      if (reab) {
        sub = 'We asked you to correct this section';
      } else if (b.estadoVista === 'COMPLETADO') {
        sub = 'Saved on ' + esc(b.fecha || '—') + (b.editableSiempre ? ' · you can update it' : '');
      } else {
        sub = abierto ? (b.opcional ? 'You can leave it pending' : 'It is your turn now')
                      : 'It opens when you complete the previous one';
      }
      return '' +
        '<button type="button" class="fm-item' + (abierto ? '' : ' cerrado') + (reab ? ' reab' : '') +
        '" data-bloque="' + b.n + '">' +
        '  <span class="fm-ic">' + esc(b.icono) + '</span>' +
        '  <span class="fm-tx">' +
        '    <b>Section ' + b.n + ' · ' + esc(b.titulo) + '</b>' +
        '    <small>' + sub + '</small>' +
        '  </span>' +
        pillEstado_(b) +
        '</button>';
    }).join('');

    q('#fm-cont').innerHTML = '' +
      avisoReaperturaHtml_() +
      '<div class="card">' +
      '  <h2><span class="em">🗂️</span> Your Summer forms</h2>' +
      (S.data.aprobado
        ? '  <p class="muted">Your information has been validated. You can review each section, but not change it.</p>'
        : '  <p class="muted">Complete one section at a time. Once you submit it, it is saved and closed: check it carefully before you continue.</p>') +
      '  <div class="fm-lista">' + items + '</div>' +
      '</div>' +
      (S.data.terminado
        ? '<div class="card fm-fin"><div class="fm-fin-ic">🎉</div>' +
          '<p>You finished your form! Our team will review it and we will let you know by WhatsApp and email.</p>' +
          (docsPendientesHtml_() || '') + '</div>'
        : '') +
      '<div class="ctr-nav"><button class="btn btn-ghost btn-block" id="fm-salir-l">← Back to home</button></div>';

    window.scrollTo({ top: 0, behavior: 'auto' });
    Array.prototype.forEach.call(document.querySelectorAll('[data-bloque]'), function (b) {
      b.addEventListener('click', function () { irABloque(+b.dataset.bloque); });
    });
    q('#fm-salir-l').addEventListener('click', function () { showView('home'); });
  }

  /* ENTREGA 5 — el aviso que va ARRIBA de la lista cuando hay bloques
     reabiertos. Si todos comparten el mismo motivo se escribe una sola
     vez; si cada uno trae el suyo, se muestra bloque por bloque para
     que sepa qué corregir en cada uno. */
  function avisoReaperturaHtml_() {
    var lista = bloquesReabiertos_();
    if (!lista.length) return '';

    var uno = lista.length === 1;
    var motivos = [];
    lista.forEach(function (b) {
      var m = motivoReab_(b);
      if (m && motivos.indexOf(m) < 0) motivos.push(m);
    });

    var cuerpo;
    if (!motivos.length) {
      /* Puede llegar sin motivo escrito; aun así hay que decirle qué
         hacer, nunca dejarlo con un aviso vacío. */
      cuerpo = '<p class="fm-reab-m">Open ' + (uno ? 'the marked section' : 'the marked sections') +
               ' and review the information before submitting ' + (uno ? 'it' : 'them') + ' again.</p>';
    } else if (motivos.length === 1) {
      cuerpo = '<p class="fm-reab-m">«' + esc(motivos[0]) + '»</p>';
    } else {
      cuerpo = '<ul class="fm-reab-l">' + lista.map(function (b) {
        var m = motivoReab_(b);
        return '<li><b>Section ' + b.n + ' · ' + esc(b.titulo) + ':</b> ' +
               (m ? '«' + esc(m) + '»' : 'review the information in this section.') + '</li>';
      }).join('') + '</ul>';
    }

    return '' +
      '<div class="fm-reab-aviso">' +
      '  <div class="fm-reab-ic">↩️</div>' +
      '  <h3>' + (uno ? 'You have 1 section to correct' : 'You have ' + lista.length + ' sections to correct') + '</h3>' +
      '  <p>We reviewed your form and we need you to fix this. The other sections stay saved as they were.</p>' +
      cuerpo +
      '</div>';
  }

  /* Los documentos que el estudiante puede subir más adelante. */
  function docsPendientesHtml_() {
    var lista = (S.data && S.data.docsPendientes) || [];
    if (!lista.length || S.data.aprobado) return '';
    return '<p class="fm-pend">📎 You still have to upload: <b>' + lista.map(esc).join('</b>, <b>') +
           '</b>. You can do it when you have it, in the documents section.</p>';
  }

  function irABloque(n) {
    var b = null;
    S.data.bloques.forEach(function (x) { if (x.n === n) b = x; });
    if (!b) return;
    /* ENTREGA 5 — el bloque reabierto llega con abierto:true, así que
       ya entraba por sí solo; se nombra igual para que un cambio futuro
       en la fila de bloques no le cierre la puerta al que tiene que
       corregir. */
    if (!b.abierto && !reabierto_(b)) {
      return Swal.fire({ icon: 'info', title: 'Not yet', text: 'Please complete the previous sections first.' });
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
    /* LOTE 17/08 — lo que se guardó ANTES de esta entrega sigue en la
       hoja como se escribió. Al abrir el bloque se sube a mayúsculas lo
       que corresponde, para que el estudiante no vea media pantalla en
       mayúsculas y media no, y para que al volver a guardar quede
       parejo. Solo toca los campos marcados. */
    b.campos.forEach(function (c) {
      if (c.may && typeof S.vals[c.k] === 'string') S.vals[c.k] = mayus_(S.vals[c.k]);
      if (c.t !== 'lista') return;
      (c.sub || []).forEach(function (sc) {
        if (!sc.may) return;
        S.vals[c.k].forEach(function (fila) { fila[sc.k] = mayus_(txt(fila[sc.k])); });
      });
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
    return igual_(S.vals[c.ver.k], c.ver.v);
  }
  /* ¿De este campo depende algún otro? Si sí, al cambiarlo hay que
     repintar el bloque para mostrar u ocultar lo que corresponda. */
  /* ============================================================
     LOTE 17/08 — MAYÚSCULAS A LA VISTA
     ============================================================
     Los campos marcados con 'may' en FORM_DEF (los manda el backend
     dentro de la definición del bloque) se ven en mayúsculas MIENTRAS
     el estudiante escribe, no solo al guardar: así ve exactamente lo
     que va a quedar en la hoja. El backend vuelve a aplicarlo, que es
     lo que de verdad lo garantiza.
     Se escribe sobre el mismo cuadro de texto, así que hay que devolver
     el cursor a donde estaba: sin esto, corregir una letra en la mitad
     de un apellido manda el cursor al final en cada tecla. Como
     toUpperCase no cambia el largo del texto, la posición es exacta. */
  function mayus_(s) { return String(s == null ? '' : s).toUpperCase(); }

  function aplicarMayus_(el) {
    var v = mayus_(el.value);
    if (v === el.value) return;
    var ini = el.selectionStart, fin = el.selectionEnd;
    el.value = v;
    /* Los campos de tipo correo o número no admiten selección: leerla
       o escribirla lanza en algunos navegadores. Aquí solo llegan de
       texto, pero se protege igual. */
    try { if (ini !== null && ini !== undefined) el.setSelectionRange(ini, fin); } catch (e) { /* no-op */ }
  }

  /* FASE 3.1 — el identificador del video, con las cuatro formas que
     reparte YouTube. Devuelve '' si el enlace no es de YouTube: eso es
     lo que decide si se previsualiza y lo que valida la pantalla. */
  function youtubeId_(u) {
    var s = txt(u);
    var m = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{6,})/i.exec(s) ||
            /^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:shorts|live|embed)\/([\w-]{6,})/i.exec(s) ||
            /^https?:\/\/youtu\.be\/([\w-]{6,})/i.exec(s);
    return m ? m[1] : '';
  }
  function youtubeOk_(u) { return !!youtubeId_(u); }

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
        ['Yes', 'No'].map(function (o) {
          return '<button type="button" class="fm-op' + (igual_(v, o) ? ' sel' : '') + '"' + dis +
                 ' data-sino="' + c.k + '" data-v="' + o + '">' + o + '</button>';
        }).join('') +
        '  </div>' +
        '</div>';
    }

    if (c.t === 'select') {
      return '' +
        '<div class="fm-f" data-campo="' + c.k + '">' +
        '  <label for="' + id + '">' + esc(c.l) + req + '</label>' + ay +
        '  <select id="' + id + '" data-k="' + c.k + '"' + dis + '>' +
        '    <option value="">Select…</option>' +
        c.op.map(function (o) {
          return '<option value="' + esc(o) + '"' + (v === o ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') +
        '  </select>' +
        '</div>';
    }

    if (c.t === 'check') {
      return '' +
        '<div class="fm-f fm-ancho" data-campo="' + c.k + '">' +
        '  <label class="fm-check">' +
        '    <input type="checkbox" data-k="' + c.k + '" data-tipo="check"' + (igual_(v, 'Yes') ? ' checked' : '') + dis + '>' +
        '    <span>' + esc(c.l) + req + '</span>' +
        '  </label>' + ay +
        '</div>';
    }

    if (c.t === 'textarea') {
      return '' +
        '<div class="fm-f fm-ancho" data-campo="' + c.k + '">' +
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
        '    <span class="fm-fecha-t">' + (v ? esc(fechaLarga_(v)) : 'Choose the date') + '</span>' +
        '  </button>' +
        '</div>';
    }

    if (c.t === 'chips') {
      var n = c.n || 5;
      var sel = Array.isArray(v) ? v : [];
      return '' +
        '<div class="fm-f fm-ancho" data-campo="' + c.k + '">' +
        '  <label>' + esc(c.l) + req + '</label>' + ay +
        '  <div class="fm-chips">' +
        c.op.map(function (o) {
          var on = sel.indexOf(o) >= 0;
          return '<button type="button" class="fm-chip' + (on ? ' sel' : '') + '"' + dis +
                 ' data-chip="' + c.k + '" data-v="' + esc(o) + '">' + esc(o) + '</button>';
        }).join('') +
        '  </div>' +
        '  <small class="fm-ay fm-chip-n">' + sel.length + ' of ' + n + ' selected</small>' +
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
                 '<span class="fm-doc-t">Uploading your file…</span></div>';
      } else if (url) {
        cuerpo = '<div class="fm-doc-ok">' +
          '  <span class="fm-doc-ic">' + (c.doc === 'foto' ? '🖼️' : '📄') + '</span>' +
          '  <span class="fm-doc-t">File uploaded</span>' +
          '  <span class="fm-doc-b">' +
          '    <button type="button" class="fm-mini" data-doc="ver" data-k="' + c.k + '">👁 View</button>' +
          (puede ? '    <button type="button" class="fm-mini" data-doc="elegir" data-k="' + c.k + '">♻️ Replace</button>' : '') +
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
                 ' aria-label="' + esc(c.l) + '. Drag the file in, paste it with Control V or tap to choose it"></div>';
      } else {
        cuerpo = '<p class="fm-doc-vacio">No file uploaded</p>';
      }
      return '' +
        '<div class="fm-f fm-f-doc fm-ancho" data-campo="' + c.k + '">' +
        '  <label>' + esc(c.l) + req + ' <span class="fm-doc-max">' +
        (c.doc === 'foto' ? 'PNG or JPG' : 'PDF only') + ' · max. ' + docMaxMb_() + ' MB</span></label>' + ay +
        cuerpo +
        '  <input type="file" id="fm-file-' + c.k + '" data-file="' + c.k + '" hidden' +
        ' accept="' + (c.doc === 'foto' ? '.png,.jpg,.jpeg,image/png,image/jpeg' : '.pdf,application/pdf') + '">' +
        '</div>';
    }

    /* FASE 3.1 · ajuste 1 — ENLACE DE YOUTUBE.
       Es un campo de texto con una previsualización debajo: en cuanto
       el enlace es válido se ve el video incrustado, así el estudiante
       comprueba que pegó el que era antes de enviarlo. Si el enlace no
       sirve, se lo dice ahí mismo (y el backend lo vuelve a rechazar). */
    if (c.t === 'youtube') {
      var yid = youtubeId_(v);
      var previa;
      if (yid) {
        previa = '<div class="fm-yt"><iframe src="https://www.youtube.com/embed/' + esc(yid) + '"' +
                 ' title="' + esc(c.l) + '" loading="lazy" allowfullscreen' +
                 ' referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
      } else if (txt(v)) {
        previa = '<p class="fm-yt-mal">⚠️ That is not a YouTube link.</p>';
      } else {
        previa = '';
      }
      return '' +
        '<div class="fm-f fm-ancho" data-campo="' + c.k + '">' +
        '  <label for="' + id + '">' + esc(c.l) + req + '</label>' + ay +
        '  <input id="' + id + '" type="url" inputmode="url" data-k="' + c.k + '" data-tipo="youtube"' +
        ' maxlength="' + (c.maxlen || MAX_TEXTO) + '" placeholder="' + esc(c.ph || '') + '"' +
        ' value="' + esc(v) + '"' + dis + '>' +
        previa +
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
            return !(sc.reqSalvo && igual_(fila[sc.reqSalvo.k], sc.reqSalvo.v));
          }).map(function (sc) {
            var sid = 'fm-' + c.k + '-' + i + '-' + sc.k;
            var sv = txt(fila[sc.k]);
            if (sc.t === 'fecha') {
              return '<div class="fm-sf"><label>' + esc(sc.l) + '</label>' +
                     '<button type="button" class="fm-fecha' + (sv ? ' con' : '') + '" data-sfecha="' + c.k + '" data-i="' + i + '" data-sk="' + sc.k + '"' + dis + '>' +
                     '<span class="fm-fecha-ic">📅</span><span class="fm-fecha-t">' + (sv ? esc(sv) : 'Choose') + '</span></button></div>';
            }
            /* ENTREGA 4 — un Sí/No dentro de una línea repetible
               (¿actualmente trabajas allí?). */
            if (sc.t === 'sino') {
              return '<div class="fm-sf fm-sf-ancho"><label>' + esc(sc.l) + '</label>' +
                     '<div class="fm-sino fm-sino-mini">' +
                     ['Yes', 'No'].map(function (o) {
                       return '<button type="button" class="fm-op' + (igual_(sv, o) ? ' sel' : '') + '"' + dis +
                              ' data-ssino="' + c.k + '" data-i="' + i + '" data-sk="' + sc.k + '" data-v="' + o + '">' +
                              o + '</button>';
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
                   (sc.may ? ' class="fm-may" autocapitalize="characters" spellcheck="false"' : '') +
                   (sc.t === 'num' ? ' inputmode="numeric"' : '') +
                   ' maxlength="' + (sc.maxlen || (sc.t === 'tel' ? 10 : MAX_TEXTO)) + '"' +
                   ' data-sk="' + sc.k + '" data-slista="' + c.k + '" data-i="' + i + '" value="' + esc(sv) + '"' + dis + '></div>';
          }).join('') +
          '  </div>' +
          '</div>';
      }).join('');

      return '' +
        '<div class="fm-f fm-f-lista fm-ancho" data-campo="' + c.k + '">' +
        '  <label>' + esc(c.l) + req + '</label>' + ay +
        cuerpo +
        (editable
          ? (filas.length >= (c.maxFilas || MAX_FILAS)
              ? '  <p class="muted center">You reached the maximum of ' + (c.maxFilas || MAX_FILAS) + ' rows.</p>'
              : '  <button type="button" class="fm-agregar" data-agregar="' + c.k + '">＋ ' +
                esc(c.agregar || 'Add another row') + '</button>')
          : (filas.length ? '' : '<p class="muted">—</p>')) +
        '</div>';
    }

    /* texto · num · tel · correo · url */
    var tipo = (c.t === 'num' || c.t === 'tel') ? 'tel' : (c.t === 'correo' ? 'email' : 'text');
    return '' +
      '<div class="fm-f" data-campo="' + c.k + '">' +
      '  <label for="' + id + '">' + esc(c.l) + req + '</label>' + ay +
      '  <input id="' + id + '" type="' + tipo + '" data-k="' + c.k + '" data-tipo="' + c.t + '"' +
      /* LOTE 17/08 — los campos de nombre propio se escriben en
         mayúsculas. 'autocapitalize' es lo que hace que el teclado del
         teléfono ya salga en mayúsculas; la clase la usa el cableado
         para transformar lo que se escriba (incluido lo pegado). */
      (c.may ? ' class="fm-may" autocapitalize="characters" spellcheck="false"' : '') +
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
    drop.innerHTML = '<span class="fm-drop-m">📎 <b>Drag</b> the file in, <b>paste</b> it with Ctrl+V or <b>tap</b> to choose it' +
      '<small>' + (c && c.doc === 'foto' ? 'PNG or JPG image' : 'PDF file') + ' · max. ' + docMaxMb_() + ' MB</small></span>';
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
      r.onerror = function () { rej(new Error('We could not read the file')); };
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
      return dropAviso_(k, '⏳ Wait until the file that is uploading finishes.');
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
        ? 'The photo must be a PNG or JPG image.'
        : 'That document must be a PDF file.'));
    }
    if (file.size > docMaxMb_() * 1024 * 1024) {
      return dropAviso_(k, '❌ The file is larger than ' + docMaxMb_() + ' MB. Compress it before uploading.');
    }

    /* Confirmación con vista previa: un pegado sin querer no puede
       cambiarle el documento a nadie. */
    var previa = '';
    if (/^image\//.test(file.type || '')) { try { previa = URL.createObjectURL(file); } catch (e) { previa = ''; } }
    var yaHay = !!txt(S.vals[k]);
    var conf = await Swal.fire({
      title: yaHay ? 'Replace the file?' : 'Upload this file?',
      html: '<div style="font-size:13px;margin-bottom:8px">' + esc(c.l) + '</div>' +
            (previa ? '<img src="' + previa + '" style="max-width:100%;max-height:260px;border-radius:10px;border:1px solid #e3e9f2">'
                    : '<div style="font-size:13px">📄 ' + esc(file.name || nombre) + '</div>') +
            (yaHay ? '<div style="font-size:12px;margin-top:8px;color:#b45309">The file you already uploaded will be replaced.</div>' : ''),
      showCancelButton: true, confirmButtonText: yaHay ? 'Replace' : 'Upload',
      cancelButtonText: 'Cancel', focusCancel: true
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
      /* LOTE 17/08 (ajuste 4) — el refresco del inicio va CALLADO. Sin
         {silent:true}, la capa 5 de esqueletos reconoce la acción
         'loginEstudiante' y hace showView('home'): el estudiante subía
         un documento y aparecía en el inicio, teniendo que volver a
         entrar al formulario y al bloque 14 por cada archivo. El inicio
         se repinta igual (renderHome_ solo escribe dentro de
         #home-content), pero la vista visible no se mueve. */
      try {
        var e2 = await apiPost('loginEstudiante', { clave: cred_().clave }, { silent: true });
        if (typeof EST !== 'undefined') { EST = e2; renderHome_(); }
      } catch (_) { /* el archivo ya quedó guardado: no es grave */ }
      toast_('success', 'File uploaded');
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
    var tit = q('#ctr-visor-title'); if (tit) tit.textContent = (c && c.l) || 'File';
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
      '  <h2><span class="em">🆔</span> Your details</h2>' +
      '  <p class="muted">These details come from your contract. If something is wrong, contact your advisor.</p>' +
      /* LOTE 17/08 — envoltura para poder repartirlos en dos columnas
         en PC sin arrastrar el título ni el aviso de la tarjeta. */
      '  <div class="fm-pre-g">' +
      fila('First names', d.nombres) +
      fila('Last names', d.apellidos) +
      fila('ID number', d.documento) +
      fila('Date of birth', d.nacimiento) +
      fila('Email address', d.correo) +
      fila('WhatsApp', d.whatsapp) +
      fila('Address', d.direccion) +
      '  </div>' +
      '</div>';
  }

  /* ENTREGA 5 — la nota que ve DENTRO del bloque que le reabrieron: por
     qué se le pidió corregirlo, antes que cualquier otra cosa. */
  function notaReaperturaHtml_(b) {
    if (!reabierto_(b)) return '';
    var m = motivoReab_(b);
    return '' +
      '<div class="fm-reab-nota">' +
      '  <h3>↩️ We asked you to correct this section</h3>' +
      (m ? '  <p class="fm-reab-m">«' + esc(m) + '»</p>'
         : '  <p class="fm-reab-m">Review the information you saved before submitting it again.</p>') +
      '  <p class="fm-reab-p">Correct whatever is needed and submit it again. Everything else you already saved is kept.</p>' +
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
    q('#fm-sub').textContent = 'Section ' + b.n + ' of ' + S.data.total;
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
            '  <button class="btn btn-ghost btn-block" id="fm-volver">← Back</button>' +
            '</div>' +
            '<p class="muted center" style="margin:10px 0 0">This section has already been submitted. ' +
            'You can upload the documents that are still pending; the rest cannot be changed.</p>';
    } else if (!editable) {
      pie = '<div class="ctr-nav">' +
            '  <button class="btn btn-ghost" id="fm-volver">← Back</button>' +
            '</div>' +
            '<p class="muted center" style="margin:10px 0 0">' +
            (S.data.aprobado ? 'Your form has already been validated.' : 'This section has already been submitted and is now closed.') + '</p>';
    } else {
      pie = '<div class="ctr-nav">' +
            '  <button class="btn btn-ghost" id="fm-volver">← Back</button>' +
            (b.opcional ? '  <button class="btn btn-ghost" id="fm-pendiente">Leave it pending</button>' : '') +
            '  <button class="btn btn-accent" id="fm-guardar">' +
            (reabierto_(b) ? 'Save the correction'
                           : (b.editableSiempre ? 'Save' : 'Save and continue')) + '</button>' +
            '</div>';
    }

    q('#fm-cont').innerHTML = '' +
      notaReaperturaHtml_(b) +
      (b.n === 1 ? preHtml_(S.data.precargados) : '') +
      '<div class="card">' +
      '  <h2><span class="em">' + esc(b.icono) + '</span> ' + esc(b.titulo) + '</h2>' +
      (b.intro ? '  <p class="fm-intro">' + esc(introTexto_(b.intro)) + '</p>' : '') +
      (b.aviso ? '  <p class="fm-aviso">' + esc(b.aviso) + '</p>' : '') +
      (!editable && b.estado === 'COMPLETADO'
        ? '  <p class="fm-cerrado">🔒 Section completed on ' + esc(b.fecha || '—') + '</p>' : '') +
      /* LOTE 17/08 — envoltura de los campos: en PC se reparte en dos
         columnas (css/formulario.css). En móvil no cambia nada. */
      '<div class="fm-campos">' + html + '</div>' +
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
        el.addEventListener('change', function () { S.vals[k] = el.checked ? 'Yes' : ''; });
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
        if (el.classList.contains('fm-may')) aplicarMayus_(el);
        S.vals[k] = el.value;
      });
      /* FASE 3.1 — la previsualización del video se refresca al salir
         del campo, no en cada tecla: repintar mientras se escribe
         recargaría el iframe letra por letra. */
      if (tipo === 'youtube') {
        el.addEventListener('change', function () { S.vals[k] = el.value; repintar_(); });
        el.addEventListener('blur', function () { S.vals[k] = el.value; repintar_(); });
      }
    });

    /* Sí / No */
    Array.prototype.forEach.call(cont.querySelectorAll('[data-sino]'), function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.sino;
        S.vals[k] = igual_(S.vals[k], b.dataset.v) ? '' : b.dataset.v;
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
            return Swal.fire({ icon: 'info', title: 'You already chose ' + tope,
              text: 'Remove one skill if you want to change it.' });
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
        }, true);
      });
    });

    /* Listas repetibles */
    Array.prototype.forEach.call(cont.querySelectorAll('[data-slista]'), function (el) {
      el.addEventListener('input', function () {
        var c = campoDe_(el.dataset.slista);
        var sc = subDe_(c, el.dataset.sk);
        if (sc && sc.t === 'num') el.value = dig(el.value);
        if (el.classList.contains('fm-may')) aplicarMayus_(el);
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
        }, true);
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
        fila[sk] = igual_(fila[sk], b.dataset.v) ? '' : b.dataset.v;
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
        if (!files.length) return dropAviso_(k, '❌ What you dropped is not a valid file.');
        if (files.length > 1) dropAviso_(k, '⚠️ Only one file goes in this box: we took the first one.');
        subirDoc_(k, files[0]);
      });
      drop.addEventListener('paste', function (e) {
        e.preventDefault();
        var files = archivosDe_(e.clipboardData);
        if (!files.length) return dropAviso_(k, '❌ There is no file in the clipboard. Copy it and paste again.');
        if (files.length > 1) dropAviso_(k, '⚠️ Only one file goes in this box: we took the first one.');
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
      if (sc.reqSalvo && igual_(fila[sc.reqSalvo.k], sc.reqSalvo.v)) fila[sc.k] = '';
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
      icon: 'question', title: 'Leave this section?',
      text: 'Whatever you wrote here and have not saved will be lost.',
      showCancelButton: true, confirmButtonText: 'Yes, leave', cancelButtonText: 'Keep filling it out'
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
    if (c.t === 'select' && (c.op || []).indexOf(s) < 0) return c.l + ': choose one of the options in the list.';
    if (c.t === 'correo' && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(s)) return c.l + ': enter a valid email address.';
    if (c.t === 'url' && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(s)) return c.l + ': the link must start with http:// or https://';
    /* FASE 3.1 · ajuste 1 — el enlace del video: la MISMA regla que el
       backend, para avisar antes de mandar el bloque. */
    if (c.t === 'youtube' && !youtubeOk_(s)) return c.l + ': paste a YouTube link (youtube.com or youtu.be).';
    if (c.t === 'tel' && dig(s).length !== 10) return c.l + ': it must have exactly 10 digits.';
    if (c.t === 'num' && c.maxlen && dig(s).length > c.maxlen) {
      return c.l + ': it cannot have more than ' + c.maxlen + ' digits.';
    }
    if (c.t === 'num' && c.max && Number(dig(s)) > c.max) return c.l + ': the maximum value is ' + c.max + '.';
    if (c.t === 'num' && Number(dig(s)) <= 0) return c.l + ': enter a number greater than zero.';
    if (c.t === 'fecha') {
      var f = fechaValida_(s);
      if (!f) return c.l + ': the date is not valid.';
      var hoy = hoy0_();
      if (c.modo === 'pasada' && f > hoy) return c.l + ': it cannot be a future date.';
      if (c.modo === 'futura' && f < hoy) return c.l + ': it cannot be a past date.';
      if (c.modo === 'adulto' && f > new Date(hoy.getFullYear() - 20, hoy.getMonth(), hoy.getDate())) {
        return c.l + ': it must belong to someone older than 20.';
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
        if (c.req && !txt(S.vals[c.k])) errores.push('Missing upload: ' + c.l + '.');
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
          errores.push(c.l + ': add at least ' + Math.max(1, c.min || 1) + ' row.');
          return;
        }
        if (filas.length > (c.maxFilas || MAX_FILAS)) {
          errores.push(c.l + ': you cannot add more than ' + (c.maxFilas || MAX_FILAS) + ' rows.');
        }
        filas.forEach(function (par0) {
          var f = par0.f, n = par0.n;
          /* Igual que el backend: primero se vacía lo que 'reqSalvo'
             libera y solo después se valida. */
          limpiarLiberados_(c, f);
          c.sub.forEach(function (sc) {
            if (sc.reqSalvo && igual_(f[sc.reqSalvo.k], sc.reqSalvo.v)) return;
            var e = validarValor_(sc, f[sc.k]);
            if (e) { errores.push(c.l + ' (row ' + n + ') — ' + e); return; }
            if (sc.req && !txt(f[sc.k])) errores.push(c.l + ' (row ' + n + '): ' + sc.l + ' is missing.');
          });
          /* Parejas de fechas que deben ir en orden. */
          [['inicio', 'fin', 'the end date cannot be earlier than the start date'],
           ['ingreso', 'salida', 'the exit date cannot be earlier than the entry date']].forEach(function (par) {
            var a = fechaValida_(f[par[0]]), b2 = fechaValida_(f[par[1]]);
            if (a && b2 && b2 < a) errores.push(c.l + ' (row ' + n + '): ' + par[2] + '.');
          });
        });
        return;
      }

      if (c.t === 'chips') {
        var n = c.n || 5;
        var sel = S.vals[c.k] || [];
        if (obligatorio_(c) && sel.length !== n) errores.push(c.l + ': you must choose exactly ' + n + '.');
        else if (sel.length && sel.length !== n) errores.push(c.l + ': you must choose exactly ' + n + '.');
        return;
      }

      var v = S.vals[c.k];
      var err = validarValor_(c, v);
      if (err) { errores.push(err); return; }
      if (obligatorio_(c) && !txt(v)) {
        errores.push(c.t === 'check' ? 'You must check: ' + c.l : 'Missing: ' + c.l);
      }
    });

    if (b.n === 3) {
      var d1 = fechaValida_(S.vals.DISPONIBLE_DESDE), d2 = fechaValida_(S.vals.DISPONIBLE_HASTA);
      if (d1 && d2 && d2 < d1) errores.push('The latest available date cannot be earlier than the start date.');
    }
    /* El pasaporte no cruza sus dos fechas: una es 'pasada' y la otra
       'futura', así que el vencimiento nunca queda antes. El backend
       tampoco lo hace y las dos validaciones deben decir lo mismo. */
    if (b.n === 6) {
      var c1 = fechaValida_(S.vals.COLEGIO_INICIO), c2 = fechaValida_(S.vals.COLEGIO_FIN);
      if (c1 && c2 && c2 < c1) errores.push('The high school graduation date cannot be earlier than its start date.');
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
     ============================================================
     LOTE 17/08 (ajuste 3) — el botón se bloquea y sale el aviso del
     avión mientras el bloque viaja.
       · El seguro (S.guardando) se echa en la PRIMERA línea, antes de
         los Swal de confirmación. Antes se ponía después de dos await:
         entre el clic y la confirmación el botón quedaba vivo, y en un
         teléfono lento dos toques seguidos entraban los dos.
       · Los botones del pie se apagan durante todo el trámite, incluido
         el rato en que el Swal está abierto.
       · El aviso es el MISMO del contrato (#ctr-load, el del avión):
         se reutiliza desde CONTRATO, no se inventa otro.
     ============================================================ */

  /* Apaga o enciende los tres botones del pie del bloque. Se busca cada
     vez porque el bloque se repinta entero muy a menudo. */
  function bloquearPie_(si) {
    ['#fm-guardar', '#fm-pendiente', '#fm-volver'].forEach(function (sel) {
      var b = q(sel);
      if (b) b.disabled = !!si;
    });
  }

  /* El aviso del avión vive en contrato.js (lo pide el pliego: "el
     mismo loader HTML del contrato"). Si por lo que sea no estuviera
     disponible, guardar sigue funcionando sin él: nunca se deja al
     estudiante sin poder enviar por un adorno. */
  function cargando_() {
    return (typeof CONTRATO !== 'undefined' && CONTRATO && CONTRATO.cargando) ? CONTRATO.cargando : null;
  }

  async function guardar(pendiente) {
    if (S.guardando) return;
    S.guardando = true;
    bloquearPie_(true);
    try {
      await guardarPaso_(pendiente);
    } finally {
      S.guardando = false;
      bloquearPie_(false);
    }
  }

  async function guardarPaso_(pendiente) {
    var b = S.bloque;

    if (pendiente && !vacio_()) {
      var sigue = await Swal.fire({
        icon: 'question', title: 'Leave it pending?',
        text: 'You wrote something in this section. If you leave it pending, that will not be saved.',
        showCancelButton: true, confirmButtonText: 'Yes, leave it pending', cancelButtonText: 'Back'
      });
      if (!sigue.isConfirmed) return;
      b.campos.forEach(function (c) { S.vals[c.k] = (c.t === 'lista' || c.t === 'chips') ? [] : ''; });
    }

    if (!pendiente) {
      var errores = validarBloque_();
      if (errores.length) return avisoFalta(errores);

      var conf = await Swal.fire({
        icon: 'warning',
        title: b.editableSiempre ? 'Save this section?' : 'Submit this section?',
        html: b.editableSiempre
          ? 'Check that the information is correct. You will be able to update this section later if you need to.'
          : '<b>Check that the information is correct</b>, because after you continue you will not be able to change it.',
        showCancelButton: true,
        confirmButtonText: b.editableSiempre ? 'Yes, save' : 'Yes, submit',
        cancelButtonText: 'Review it again'
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

    var carga = cargando_();
    if (carga) {
      carga.abrir({
        titulo: 'Saving your Section ' + b.n,
        sub: 'Please <b>do not leave this screen</b> before it finishes ✈️🤩',
        pasos: [
          'Checking what you wrote…',
          'Sending your information…',
          'Saving it to your file…',
          'Updating your progress…',
          'Almost there, do not close this window…'
        ],
        salir: 'Your section is being saved. If you leave now, it will not be saved.'
      });
    }

    try {
      var res = await apiPost('guardarBloque', Object.assign(cred_(), {
        bloque: b.n, datos: datos, pendiente: !!pendiente
      }), { silent: true });
      if (res && res.ok === false) {
        if (carga) carga.cerrar();
        return avisoFalta(res.errores || ['We could not save this section.']);
      }

      S.data = res;
      /* El inicio también tiene que reflejar el avance, pero CALLADO
         (LOTE 17/08, ajuste 5): la capa 5 tiene 'loginEstudiante'
         mapeada con vista 'home', así que sin {silent:true} guardar un
         bloque terminaba en el inicio en vez de en la lista de bloques. */
      try {
        var e = await apiPost('loginEstudiante', { clave: cred_().clave }, { silent: true });
        if (typeof EST !== 'undefined') { EST = e; renderHome_(); }
      } catch (_) { /* el formulario ya quedó guardado: no es grave */ }

      if (carga) {
        await carga.listo({
          titulo: pendiente ? 'Done, it was left pending' : 'Done! Your section was saved',
          sub: pendiente
            ? 'You can come back to it whenever you want 👌'
            : 'It is already in your file 🎉',
          paso: 'Saved successfully ✅',
          espera: 1100
        });
      }

      /* Y se vuelve a "Tu formulario": la lista de bloques, no el inicio. */
      showView('formulario');
      pintarLista();
      if (pendiente) toast_('success', 'Section left pending');
      else if (S.data.terminado) {
        var pend = (S.data.docsPendientes || []);
        Swal.fire({ icon: 'success', title: 'You finished your form!',
          html: 'We saved all your information and our team will review it.' +
                (pend.length ? '<br><br>When you have them, upload them in the documents section: <b>' +
                               pend.map(esc).join('</b>, <b>') + '</b>.' : '') });
      } else toast_('success', 'Section saved 🔒');
    } catch (e) {
      if (carga) carga.cerrar();
      error_(e.message || e);
      /* Si falló, el bloque sigue en pantalla y sus botones vuelven a la
         vida en el 'finally' de guardar(). */
    }
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

  /* La rueda de fecha vive aquí, pero el contrato también la necesita
     (LOTE 17/08, ajuste 2: en toda la app las fechas se eligen en el
     modal manejado, nunca en el calendario del navegador). Se expone
     ya cableada: quien la llame no tiene que acordarse de nada.
       valor  — 'dd/mm/aaaa' o vacío
       modo   — 'pasada' | 'futura' | 'adulto' | {min: año, max: año}
       onOk   — recibe la fecha elegida como 'dd/mm/aaaa' */
  function rueda(valor, modo, titulo, onOk, en) {
    cablearRueda_();
    abrirRueda_(valor, modo, titulo, onOk, !!en);
  }

  return { tarjeta: tarjeta, bind: bind, abrir: abrir, rueda: rueda, _s: S };
})();
