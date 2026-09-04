/* ============================================================
 * SEP COLOMBIA — ZONA DE ESTUDIANTES · TABLERO
 * FASE 4 · ENTREGA 6 (04/09/2026)
 * ------------------------------------------------------------
 * © Oscar Polanía — Experto en Soluciones Digitales · +57 310 323 0712
 * Software propietario; cualquier modificación por terceros anula
 * la garantía de funcionamiento.
 * ------------------------------------------------------------
 * QUÉ HACE
 *   Pinta el inicio de la Zona de estudiantes según el avance REAL
 *   del participante (punto 4 del plan):
 *
 *     4.1  sin inscripción → SOLO asesor comercial y agendar asesoría
 *     4.2  inscrito        → tablero completo
 *     4.3  acciones pendientes dinámicas (solo lo que falta)
 *     4.4  accesos rápidos con las nueve reglas de desbloqueo
 *     4.12 Mis pagos · 4.13 Seguimiento · 4.14 Mi contrato
 *     4.15 programa, asesores y "Hablar con mi Asesor"
 *
 * QUIÉN DECIDE QUÉ
 *   Esta pantalla NO decide nada. El backend (Portal.gs) manda el
 *   tablero ya resuelto en EST.portal: qué módulos se ven, cuáles
 *   están habilitados y qué decir cuando no lo están. Aquí solo se
 *   pinta. Si mañana cambia una regla, cambia allá.
 *
 * CARGA
 *   El aviso del avión (CONTRATO.cargando) es la única espera de
 *   esta app; para lo demás va el esqueleto. No se inventa otro.
 * ============================================================ */
(function () {
  'use strict';

  var S = { vista: '' };

  function q(s, c) { return (c || document).querySelector(s); }
  function qq(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return (typeof escapeHtml_ === 'function') ? escapeHtml_(s) : String(s == null ? '' : s); }
  function cred() { return (typeof cred_ === 'function') ? cred_() : {}; }

  function portal(e) { return (e && e.portal) || null; }
  function modulo(p, clave) {
    var l = (p && p.modulos) || [];
    for (var i = 0; i < l.length; i++) if (l[i].clave === clave) return l[i];
    return null;
  }

  /* ============================================================
     ACCIONES PENDIENTES (4.3)
     ============================================================ */
  function bloquePendientes(p) {
    var lista = (p && p.pendientes) || [];

    if (!lista.length) {
      return '' +
        '<div class="pt-pend">' +
        '  <h2><span class="em">✅</span> Acciones pendientes</h2>' +
        '  <div class="pt-aldia">' +
        '    <div class="pt-aldia-ic">🎉</div>' +
        '    <p>Estás al día. No tienes nada pendiente por ahora.</p>' +
        '  </div>' +
        '</div>';
    }

    var filas = lista.map(function (a) {
      return '' +
        '<button class="pt-act" data-ir="' + esc(a.accion) + '">' +
        '  <span class="pt-act-ic">' + esc(a.ic || '•') + '</span>' +
        '  <span class="pt-act-x">' +
        '    <span class="pt-act-t">' + esc(a.titulo) + '</span>' +
        '    <span class="pt-act-p">' + esc(a.texto || '') + '</span>' +
        '  </span>' +
        '  <span class="pt-act-go">›</span>' +
        '</button>';
    }).join('');

    return '' +
      '<div class="pt-pend">' +
      '  <h2><span class="em">📌</span> Acciones pendientes' +
      '      <span class="pt-pend-n">' + lista.length + '</span></h2>' +
      '  <p class="pt-pend-sub">Cuando completes una, desaparece de aquí.</p>' +
      filas +
      '</div>';
  }

  /* ============================================================
     ACCESOS RÁPIDOS (4.2 y 4.4)
     ============================================================
     Los módulos bloqueados SE VEN igual (el plan lo pide): lo que
     cambia es que están apagados y dicen por qué al tocarlos.     */
  function bloqueAccesos(p, e) {
    /* "Agendar asesoría" y "Firmar contrato" ya viven en sus propias
       tarjetas grandes; en la rejilla van los módulos de consulta. */
    var enRejilla = ['PERFIL', 'DOCUMENTOS', 'OFERTAS', 'PAGOS', 'SEGUIMIENTO', 'MI_CONTRATO'];
    var docs = (p && p.documentos) || {};

    var tiles = enRejilla.map(function (clave) {
      var m = modulo(p, clave);
      if (!m) return '';
      var n = 0;
      if (clave === 'DOCUMENTOS') n = Number(docs.pendientes || 0) + Number(docs.correccion || 0);
      if (clave === 'OFERTAS' && m.habilitado && !(e.ofertas && e.ofertas.mia)) {
        n = Number((e.ofertas && e.ofertas.disponibles) || 0);
      }
      return '' +
        '<button class="pt-tile' + (m.habilitado ? '' : ' pt-off') + '" data-mod="' + esc(m.clave) + '">' +
        (m.habilitado
          ? (n ? '<span class="pt-tile-n">' + n + '</span>' : '')
          : '<span class="pt-lock">🔒</span>') +
        '  <span class="pt-tile-ic">' + esc(m.ic) + '</span>' +
        '  <span class="pt-tile-t">' + esc(m.titulo) + '</span>' +
        '</button>';
    }).join('');

    if (!tiles) return '';
    return '' +
      '<div class="card">' +
      '  <h2><span class="em">⚡</span> Accesos rápidos</h2>' +
      '  <div class="pt-grid">' + tiles + '</div>' +
      '</div>';
  }

  /* ============================================================
     PROGRAMA Y CONTACTO (4.15)
     ============================================================ */
  function bloqueContacto(p, e) {
    var c = (p && p.contacto) || {};
    var wa = String(c.whatsapp || '').replace(/\D/g, '');
    return '' +
      '<div class="card glass">' +
      '  <h2><span class="em">🎓</span> Tu programa y contacto</h2>' +
      '  <div class="kv"><div class="k">Programa</div><div class="v big">' + esc(c.programa || '—') + '</div></div>' +
      (c.promo ? '  <div class="kv"><div class="k">Promoción</div><div class="v">' + esc(c.promo) + '</div></div>' : '') +
      '  <div class="kv"><div class="k">Asesor(a) comercial</div><div class="v">' + esc(c.asesor || 'Por asignar') + '</div></div>' +
      '  <div class="kv"><div class="k">Asesor(a) de Procesos</div><div class="v">' + esc(c.asesorProcesos || 'Por asignar') + '</div></div>' +
      '  <div class="kv"><div class="k">Tu clave</div><div class="v" style="letter-spacing:1px">' + esc(e.claveAcceso || '—') + '</div></div>' +
      (wa
        ? '  <a class="pt-wa" id="pt-wa" href="https://wa.me/' + esc(wa) +
          '" target="_blank" rel="noopener">💬 Hablar con mi Asesor</a>'
        : '') +
      '</div>';
  }

  /* ============================================================
     EL INICIO COMPLETO
     ============================================================ */
  function render(e) {
    var p = portal(e);

    var html = '' +
      '<div class="welcome">' +
      '  <div class="hello">Hola,</div>' +
      '  <div class="name">' + esc(e.nombres) + ' ' + esc(e.apellidos) + '</div>' +
      '  <span class="estado-pill"><span class="dot" style="background:' + esc(e.estadoColor) + '"></span>' +
           esc(e.estadoLabel) + '</span>' +
      '</div>';

    /* ── 4.1 — todavía no inscrito: SOLO asesor y agendar ────── */
    if (!p || !p.inscrito) {
      html += '' +
        '<div class="card glass">' +
        '  <h2><span class="em">🎓</span> Tu asesor(a) comercial</h2>' +
        '  <div class="kv"><div class="k">Programa</div><div class="v big">' + esc(e.programa || '—') + '</div></div>' +
        '  <div class="kv"><div class="k">Asesor(a)</div><div class="v">' + esc(e.asesor || 'Por asignar') + '</div></div>' +
        '  <div class="kv"><div class="k">Tu clave</div><div class="v" style="letter-spacing:1px">' +
             esc(e.claveAcceso || '—') + '</div></div>' +
        '</div>';
      html += (typeof bloqueAsesoria_ === 'function') ? bloqueAsesoria_(e) : '';
      if (e.estado === 'PENDIENTE_PAGO' && e.pago && typeof bloquePago_ === 'function') html += bloquePago_(e.pago);
      html += pie();
      return html;
    }

    /* ── 4.2 — inscrito: tablero completo ────────────────────── */
    if (p.retirado) {
      html += '' +
        '<div class="card">' +
        '  <h2><span class="em">⏸️</span> Proceso pausado</h2>' +
        '  <p class="muted center" style="padding:6px 0">Tu proceso está pausado. Comunícate con tu asesor(a) ' +
        '     para retomarlo. Puedes seguir consultando tus pagos, documentos y seguimiento.</p>' +
        '</div>';
    } else {
      html += bloquePendientes(p);
    }

    /* Las dos tarjetas de acción grandes siguen siendo las de siempre:
       el contrato y el formulario tienen su propio módulo y su propia
       tarjeta, aquí no se reescriben. */
    var mContrato = modulo(p, 'CONTRATO');
    if (mContrato && typeof CONTRATO !== 'undefined') html += CONTRATO.tarjeta(e);
    if (typeof FORMU !== 'undefined') html += FORMU.tarjeta(e);

    /* La tarjeta de ofertas solo cuando ya tiene una: la de "escoger"
       vive en los accesos rápidos y en las acciones pendientes, y no
       hace falta repetirla tres veces. */
    if (typeof OFERTAS !== 'undefined' && e.ofertas && (e.ofertas.mia || e.ofertas.ultima)) {
      html += OFERTAS.tarjeta(e);
    }

    html += bloqueAccesos(p, e);
    html += bloqueContacto(p, e);
    html += pie();
    return html;
  }

  function pie() {
    return '' +
      '<div class="app-foot">' +
      '  <b>SEP Colombia Group SAS</b> · NIT 901.131.347-0<br>' +
      '  © Oscar Polanía — Experto en Soluciones Digitales<br>' +
      '  <span class="app-version-line">Versión —</span>' +
      '</div>';
  }

  /* ============================================================
     CABLEADO
     ============================================================ */
  function bind(e) {
    var p = portal(e);

    qq('.pt-act').forEach(function (b) {
      b.addEventListener('click', function () { ir(b.dataset.ir, e); });
    });

    qq('.pt-tile').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = modulo(p, b.dataset.mod);
        if (!m) return;
        if (!m.habilitado) return bloqueado(m);
        ir(m.accion, e);
      });
    });
  }

  /* 4.2 — "explicar por qué un módulo está bloqueado". */
  function bloqueado(m) {
    Swal.fire({
      icon: 'info',
      title: m.titulo,
      html: '<span style="color:#44546b">' + esc(m.mensaje || 'Este módulo todavía no está disponible.') + '</span>',
      confirmButtonText: 'Entendido'
    });
  }

  /* Enrutador de acciones. Cada módulo abre lo que YA existe: aquí no
     se duplica ni el formulario, ni el contrato, ni las ofertas. */
  function ir(accion, e) {
    switch (accion) {
      case 'agendar':
        if (typeof flujoAgendar_ === 'function') flujoAgendar_(false);
        return;
      case 'contrato':
        if (typeof CONTRATO !== 'undefined') CONTRATO.abrir();
        return;
      case 'formulario':
      case 'perfil':
        /* 4.8 — Mi perfil abre EXACTAMENTE lo que abre "View my forms". */
        if (typeof FORMU !== 'undefined') FORMU.abrir();
        return;
      case 'ofertas':
        if (typeof OFERTAS !== 'undefined') OFERTAS.abrir();
        return;
      case 'documentos':
        if (typeof DOCUMENTOS !== 'undefined') DOCUMENTOS.abrir();
        return;
      case 'pagos':       return abrirPagos(e);
      case 'seguimiento': return abrirSeguimiento(e);
      case 'miContrato':  return abrirMiContrato(e);
    }
  }

  /* ============================================================
     MIS PAGOS (4.12)
     ============================================================
     Todo sale de Contador. Esta vista no guarda ni pide nada. */
  function abrirPagos(e) {
    var p = portal(e);
    var d = (p && p.pagos) || { hayFicha: false, pagos: [] };
    q('#pt-sub').textContent = 'Mis pagos';
    q('#pt-title').textContent = 'Mis pagos';

    var html = '';
    if (!d.hayFicha) {
      html = '<div class="card"><p class="muted center" style="padding:10px 0">' +
             'Todavía no tenemos tu ficha de pagos. Aparecerá aquí cuando tu inscripción quede registrada.' +
             '</p></div>';
    } else {
      html = '<div class="card"><h2><span class="em">💳</span> Mis pagos</h2>' +
             d.pagos.map(tarjetaPago).join('') +
             '<p class="muted center" style="margin:6px 0 0">Si ves algo que no cuadra, escríbele a tu asesor(a).</p>' +
             '</div>';
    }
    q('#pt-cont').innerHTML = html;
    S.vista = 'pagos';
    showView('portal');
  }

  function tarjetaPago(p) {
    return '' +
      '<div class="pay-card">' +
      '  <div class="pay-head">' +
      '    <span class="pay-ic">' + esc(p.ic) + '</span>' +
      '    <span class="pay-t">' + esc(p.titulo) + '</span>' +
      '    <span class="pay-pill" style="background:' + esc(p.estadoColor) + '">' + esc(p.estadoLabel) + '</span>' +
      '  </div>' +
      (p.valor ? '  <div class="pay-val">' + esc(p.valor) + '</div>' : '') +
      (p.fecha ? '  <div class="kv"><div class="k">Fecha</div><div class="v">' + esc(p.fecha) + '</div></div>' : '') +
      (p.metodo ? '  <div class="kv"><div class="k">Método</div><div class="v">' + esc(p.metodo) + '</div></div>' : '') +
      (p.cuenta ? '  <div class="kv"><div class="k">Cuenta</div><div class="v">' + esc(p.cuenta) + '</div></div>' : '') +
      (p.fechaMax ? '  <div class="pay-max">⏰ Fecha máxima de pago: ' + esc(p.fechaMax) + '</div>' : '') +
      (p.comprobante
        ? '  <a class="pay-link" href="' + esc(p.comprobante) + '" target="_blank" rel="noopener">📎 Ver mi comprobante</a>'
        : '') +
      '</div>';
  }

  /* ============================================================
     SEGUIMIENTO (4.13)
     ============================================================ */
  function abrirSeguimiento(e) {
    var p = portal(e);
    var grupos = (p && p.seguimiento) || [];
    q('#pt-sub').textContent = 'Seguimiento';
    q('#pt-title').textContent = 'Seguimiento';

    var html;
    if (!grupos.length) {
      html = '<div class="card"><p class="muted center" style="padding:10px 0">' +
             'Todavía no hay avances registrados en tu proceso.</p></div>';
    } else {
      html = '<div class="card"><h2><span class="em">🧭</span> Seguimiento de tu proceso</h2>' +
        '<p class="muted" style="margin:-6px 0 12px">Toca cada bloque para desplegarlo. Esta información es solo de consulta.</p>' +
        grupos.map(function (g, i) {
          return '' +
            '<div class="seg-g' + (i === 0 ? ' open' : '') + '" data-seg="' + i + '">' +
            '  <button class="seg-h">' +
            '    <span class="em">' + esc(g.ic || '•') + '</span>' +
            '    <span class="seg-t">' + esc(g.titulo) + '</span>' +
            '    <span class="seg-n">' + g.items.length + '</span>' +
            '    <span class="seg-ar">›</span>' +
            '  </button>' +
            '  <div class="seg-b"><ul>' +
                 g.items.map(function (it) { return '<li>' + esc(it.texto) + '</li>'; }).join('') +
            '  </ul></div>' +
            '</div>';
        }).join('') + '</div>';
    }
    q('#pt-cont').innerHTML = html;
    qq('#pt-cont .seg-h').forEach(function (b) {
      b.addEventListener('click', function () { b.parentNode.classList.toggle('open'); });
    });
    S.vista = 'seguimiento';
    showView('portal');
  }

  /* ============================================================
     MI CONTRATO (4.14)
     ============================================================ */
  function abrirMiContrato(e) {
    var c = e.contrato || {};
    if (!c.contratoUrl) {
      return Swal.fire({ icon: 'info', title: 'Mi contrato',
        text: 'Primero debes firmar tu contrato para poder visualizarlo y descargarlo.' });
    }
    q('#pt-sub').textContent = 'Mi contrato';
    q('#pt-title').textContent = 'Mi contrato';
    q('#pt-cont').innerHTML = '' +
      '<div class="card">' +
      '  <h2><span class="em">📄</span> Mi contrato</h2>' +
      '  <div class="ctr-ok">' +
      '    <div class="ctr-ok-ic">✅</div>' +
      '    <p>' + (c.validado
                    ? 'Tu contrato está firmado y <b>validado</b> por SEP Colombia Group.'
                    : 'Tu contrato está firmado. Nuestro equipo lo está revisando.') + '</p>' +
      '  </div>' +
      '  <button class="btn btn-accent btn-block" id="pt-ver-contrato">👁 Ver mi contrato</button>' +
      /* CORRECCIÓN 04/09/2026 — mientras SEP no valide el contrato, el
         estudiante puede rehacerlo. Es la misma salida que existía
         antes del rediseño, con el mismo permiso del backend
         (c.puedeFirmar) y la misma frase de la tarjeta. */
      (c.puedeFirmar
        ? '  <button class="btn btn-ghost btn-block" style="margin-top:8px" id="pt-rehacer">✍️ Rehacer mi contrato</button>' +
          '  <p class="muted center" style="margin:8px 0 0">Puedes rehacerlo mientras nuestro equipo no lo valide.</p>'
        : '') +
      '  <a class="btn btn-ghost btn-block" style="margin-top:8px" href="' + esc(c.contratoUrl) +
         '" target="_blank" rel="noopener">⬇️ Descargar</a>' +
      '</div>';
    var reh = q('#pt-rehacer');
    if (reh) reh.addEventListener('click', function () {
      if (typeof CONTRATO !== 'undefined') CONTRATO.abrir();
    });
    q('#pt-ver-contrato').addEventListener('click', function () {
      if (typeof CONTRATO !== 'undefined' && CONTRATO.visor) CONTRATO.visor(c.contratoUrl, 'Mi contrato');
      else window.open(c.contratoUrl, '_blank');
    });
    S.vista = 'contrato';
    showView('portal');
  }

  /* Salida de la vista genérica del portal. */
  var salir = document.getElementById('pt-salir');
  if (salir) salir.addEventListener('click', function () { showView('home'); });

  window.PORTAL = {
    render: render, bind: bind, ir: ir,
    /* Puertas para las pruebas automatizadas. */
    _pend: bloquePendientes, _acc: bloqueAccesos, _pago: tarjetaPago, _estado: S,
    _miContrato: abrirMiContrato
  };
})();
