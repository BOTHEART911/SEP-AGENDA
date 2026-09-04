/* ============================================================
 * SEP COLOMBIA — ZONA DE ESTUDIANTES · OFERTAS DE EMPLEO
 * FASE 4 · ENTREGA 2 (03/09/2026)
 * ------------------------------------------------------------
 * © Oscar Polanía — Experto en Soluciones Digitales · +57 310 323 0712
 * Software propietario; cualquier modificación por terceros anula
 * la garantía de funcionamiento.
 * ------------------------------------------------------------
 * QUÉ HACE
 *   La pantalla donde el participante ve las ofertas, las filtra,
 *   abre la ficha completa y selecciona una.
 *
 *   · tarjeta(e)  la tarjeta del inicio (la pinta app.js).
 *   · bind()      engancha el botón de esa tarjeta.
 *   · abrir()     abre la vista de ofertas.
 *
 * REGLAS QUE VIENEN DEL PLAN
 *   1.17 tarjeta con foto, empleador, posición, ciudad/estado, pago
 *        por hora, nivel exigido, cupos y estado.
 *   1.18 filtros de estado, posición, pago, Sponsor y nivel + buscador.
 *   1.19 galería de 4 fotos con flechas y miniaturas; el mapa va
 *        aparte, dentro de "Know your destination".
 *   1.23 si no cumple, se muestran TODOS los motivos.
 *   1.24 al pulsar "Seleccionar oferta" no se confirma: sale el modal
 *        con el resumen, la advertencia del Sponsor y la casilla
 *        obligatoria. Sin casilla marcada, el botón no se habilita.
 *
 * CARGA
 *   Esqueleto, nunca girador: la vista se abre YA con siluetas y se
 *   rellena cuando llegan los datos (misma regla que el contrato y
 *   el formulario).
 *
 * IDIOMA
 *   El contenido de la oferta llega en inglés (así se digita y así
 *   sale en el PDF). Todo lo que dice el portal va en español.
 * ============================================================ */
(function () {
  'use strict';

  var S = {
    datos: null,       // respuesta de ofertasEstudiante
    lista: [],         // ofertas ya filtradas
    ficha: null,       // respuesta de ofertaEstudiante
    foto: 0,           // foto visible de la galería
    filtros: { estado: '', posicion: '', sponsor: '', nivel: '', orden: '', texto: '' }
  };

  function q(s, c) { return (c || document).querySelector(s); }
  function qq(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function cred() { return (typeof cred_ === 'function') ? cred_() : {}; }

  /* ============================================================
     SILUETAS (capa 5) — se registran en el catálogo de formas
     ============================================================ */
  function sk(w, tit) {
    return '<span class="sep-sk sep-sk-l' + (tit ? ' tit' : '') + ' sep-sk-w' + w + '"></span>';
  }
  function skCard(inner) { return '<div class="sep-sk-card">' + inner + '</div>'; }
  function skRep(html, n) { var s = ''; for (var i = 0; i < n; i++) s += html; return s; }

  function siluetaLista() {
    return '<div class="sep-sk-wrap" aria-busy="true" aria-label="Cargando ofertas">' +
      skCard(sk(45, true) + '<div class="sep-sk-badges">' +
             skRep('<span class="sep-sk sep-sk-badge"></span>', 3) + '</div>') +
      skRep(skCard('<span class="sep-sk sep-sk-media"></span>' +
                   '<div class="sep-sk-rows">' + sk(80, true) + sk(60) + sk(45) + '</div>' +
                   '<div class="sep-sk-acts"><span class="sep-sk sep-sk-btn"></span></div>'), 3) +
      '</div>';
  }
  function siluetaFicha() {
    return '<div class="sep-sk-wrap" aria-busy="true" aria-label="Cargando la oferta">' +
      skCard('<span class="sep-sk sep-sk-media"></span>' +
             '<div class="sep-sk-rows">' + sk(80, true) + sk(60) + '</div>') +
      skRep(skCard(sk(45, true) + '<div class="sep-sk-rows">' + skRep(sk(95), 3) + sk(60) + '</div>'), 3) +
      '</div>';
  }
  /* Las formas se registran al usarlas, no al cargar: este archivo va
     ANTES que capa-5-esqueletos.js en el index, así que al cargar
     todavía no existe window.SEPEsqueleto. */
  function pintarEsqueleto(forma) {
    var nada = function () {};
    var E = window.SEPEsqueleto;
    if (!E || typeof E.pintar !== 'function') return nada;
    if (E.formas && !E.formas.ofertasLista) {
      E.formas.ofertasLista = siluetaLista;
      E.formas.ofertaFicha = siluetaFicha;
    }
    return E.pintar('ofe-cont', forma) || nada;
  }


  /* ============================================================
     ENTREVISTA Y RESULTADO — Entrega 3 (1.27 y 1.28)
     ============================================================
     Lo que Procesos registró por dentro, contado aquí sin jerga:
     cuándo es la entrevista, cómo se conecta y qué salió. Las
     observaciones internas y la nota del evaluador no llegan hasta
     acá: el backend no las manda.                                 */
  function bloqueEntrevista(m) {
    if (!m || !m.entrevista) return '';
    var e = m.entrevista;
    return '' +
      '<div class="ofe-ent">' +
      '  <div class="ofe-ent-t">🗓️ Tu entrevista</div>' +
      '  <div class="ofe-ent-f"><b>' + esc(e.fecha) + '</b> a las <b>' + esc(e.hora) + '</b></div>' +
      (e.link ? '  <a class="btn btn-ghost btn-block" href="' + esc(e.link) +
                '" target="_blank" rel="noopener">Abrir el enlace de la entrevista</a>' : '') +
      (e.instrucciones ? '  <p class="ofe-ent-i">' + esc(e.instrucciones) + '</p>' : '') +
      '</div>';
  }

  function bloqueResultado(m) {
    if (!m || !m.resultado) return '';
    if (m.resultado === 'APROBADA') {
      return '<div class="ofe-res ofe-res--ok">✅ <b>Tu entrevista fue aprobada.</b> ' +
             'Tu oferta queda confirmada y tu Sponsor es <b>' + esc(m.sponsor) + '</b>.' +
             (m.resultadoFecha ? ' <span class="muted">(' + esc(m.resultadoFecha) + ')</span>' : '') +
             '</div>';
    }
    return '<div class="ofe-res ofe-res--no">❌ <b>Tu entrevista no fue aprobada.</b> ' +
           'Tu selección quedó liberada: ya puedes escoger otra oferta.' +
           (m.resultadoFecha ? ' <span class="muted">(' + esc(m.resultadoFecha) + ')</span>' : '') +
           '</div>';
  }

  /* ============================================================
     TARJETA DEL INICIO
     ============================================================
     Se ve cuando el participante ya está inscrito (4.4) y se habilita
     con el pago de la oferta y el formulario aprobado. Si no está
     habilitada, se dice por qué en vez de esconderla.               */
  function tarjeta(e) {
    var o = e && e.ofertas;
    if (!o || !o.visible) return '';

    /* FASE 4.1 · punto 1 — SEP le propuso una oferta y está esperando
       su respuesta: la tarjeta del inicio lo dice con el plazo. */
    if (o.porConfirmar) {
      var pc = o.porConfirmar;
      var dias = (pc.diasRestantes === null || pc.diasRestantes === undefined)
        ? '' : Math.max(0, pc.diasRestantes);
      return '' +
        '  <div class="ofe-mia ofe-mia--conf">' +
        '    <div class="ofe-mia-ic">⏳</div>' +
        '    <div class="ofe-mia-x">' +
        '      <b>' + esc(pc.posicion) + '</b>' +
        '      <span>' + esc(pc.empleador) + (pc.lugar ? ' · ' + esc(pc.lugar) : '') + '</span>' +
        '      <span class="ofe-pill" style="background:' + esc(pc.estadoColor) + '">' +
                 esc(pc.estadoLabel) + '</span>' +
        '    </div>' +
        '  </div>' +
        '  <p class="muted">SEP te propuso esta oferta. Revísala y confírmala' +
             (dias === '' ? '' : ' — te queda(n) <b>' + dias + ' día(s)</b>') + '.</p>';
    }

    if (o.mia) {
      return '' +
        '<div class="card">' +
        '  <h2><span class="em">💼</span> Tu oferta de empleo</h2>' +
        '  <div class="ofe-mia">' +
        '    <div class="ofe-mia-ic">' + esc(o.mia.estadoIc || '📌') + '</div>' +
        '    <div class="ofe-mia-x">' +
        '      <b>' + esc(o.mia.posicion) + '</b>' +
        '      <span>' + esc(o.mia.empleador) + (o.mia.lugar ? ' · ' + esc(o.mia.lugar) : '') + '</span>' +
        '      <span class="ofe-pill" style="background:' + esc(o.mia.estadoColor) + '">' +
                 esc(o.mia.estadoLabel) + '</span>' +
        '    </div>' +
        '  </div>' +
        '  <p class="muted center" style="margin:10px 0 0">' +
             (o.mia.asignadaPorSep ? 'Asignada por SEP' : 'Seleccionada') + ' el ' + esc(o.mia.fecha) +
        '   a las ' + esc(o.mia.hora) + ' · Sponsor ' + esc(o.mia.sponsor) + '</p>' +
             bloqueEntrevista(o.mia) + bloqueResultado(o.mia) +
        '  <button class="btn btn-ghost btn-block" id="ofe-abrir" style="margin-top:10px">Ver mi oferta</button>' +
        '</div>';
    }

    /* Su última aplicación ya cerrada (no aprobada o cancelada): se le
       dice qué pasó y que puede volver a escoger. */
    if (o.ultima && o.ultima.resultado === 'NO_APROBADA') {
      return '' +
        '<div class="card">' +
        '  <h2><span class="em">💼</span> Ofertas de empleo</h2>' +
             bloqueResultado(o.ultima) +
        '  <button class="btn btn-accent btn-block" id="ofe-abrir" style="margin-top:10px">Escoger otra oferta</button>' +
        '</div>';
    }

    if (!o.habilitado) {
      var motivos = (o.motivos || []).map(function (m) {
        return '<li>' + esc(m.texto) + '</li>';
      }).join('');
      return '' +
        '<div class="card">' +
        '  <h2><span class="em">💼</span> Ofertas de empleo</h2>' +
        '  <div class="ofe-lock">' +
        '    <div class="ofe-lock-ic">🔒</div>' +
        '    <p>Todavía no puedes escoger tu oferta de empleo:</p>' +
        '    <ul class="ofe-motivos">' + motivos + '</ul>' +
        '  </div>' +
        '</div>';
    }

    var n = o.disponibles || 0;
    return '' +
      '<div class="card">' +
      '  <h2><span class="em">💼</span> Ofertas de empleo</h2>' +
      '  <div class="ofe-call">' +
      '    <div class="ofe-call-ic">🧳</div>' +
      '    <p>' + (n
                    ? 'Tienes <b>' + n + '</b> oferta' + (n === 1 ? '' : 's') + ' que ' +
                      (n === 1 ? 'cumple' : 'cumplen') + ' con tu perfil. Revísalas con calma antes de elegir.'
                    : 'Ya puedes entrar a ver las ofertas publicadas. Por ahora ninguna coincide con tu perfil; ' +
                      'vuelve a revisar más adelante.') + '</p>' +
      '  </div>' +
      '  <button class="btn btn-accent btn-block" id="ofe-abrir">Ver ofertas de empleo</button>' +
      '</div>';
  }

  function bind() {
    var b = q('#ofe-abrir');
    if (b) b.addEventListener('click', abrir);
  }

  /* ============================================================
     VISTA — LISTA
     ============================================================ */
  function abrir() {
    var quitar = pintarEsqueleto('ofertasLista');
    q('#ofe-sub').textContent = 'Cargando ofertas…';
    showView('ofertas');

    apiPost('ofertasEstudiante', cred()).then(function (r) {
      S.datos = r;
      S.filtros = { estado: '', posicion: '', sponsor: '', nivel: '', orden: '', texto: '' };
      quitar();
      pintarLista();
    }, function (e) {
      quitar();
      showView('home');
      if (typeof error_ === 'function') error_(e.message || e);
    });
  }

  function opciones(lista, sel) {
    return lista.map(function (v) {
      return '<option value="' + esc(v) + '"' + (sel === v ? ' selected' : '') + '>' + esc(v) + '</option>';
    }).join('');
  }

  function aplicarFiltros() {
    var f = S.filtros;
    var txt = String(f.texto || '').trim().toLowerCase();
    var out = (S.datos.ofertas || []).filter(function (o) {
      if (f.estado && o.estadoUsa !== f.estado) return false;
      if (f.posicion && o.posicion !== f.posicion) return false;
      if (f.sponsor && o.sponsor !== f.sponsor) return false;
      if (f.nivel && o.nivelIngles !== f.nivel) return false;
      if (txt) {
        var saco = (o.empleador + ' ' + o.posicion + ' ' + o.ciudad).toLowerCase();
        if (saco.indexOf(txt) < 0) return false;
      }
      return true;
    });
    if (f.orden === 'asc' || f.orden === 'desc') {
      out = out.slice().sort(function (a, b) {
        var x = parseFloat(String(a.pagoHora).replace(',', '.')) || 0;
        var y = parseFloat(String(b.pagoHora).replace(',', '.')) || 0;
        return f.orden === 'asc' ? x - y : y - x;
      });
    }
    S.lista = out;
    return out;
  }

  function tarjetaOferta(o) {
    var motivos = o.elegible ? '' :
      '<ul class="ofe-motivos">' + (o.motivos || []).map(function (m) {
        return '<li>' + esc(m.texto) + '</li>';
      }).join('') + '</ul>';

    var cupos = o.cuposLibres > 0
      ? o.cuposLibres + ' de ' + o.cuposTotal + ' cupos disponibles'
      : 'Sin cupos disponibles';

    return '' +
      '<article class="ofe-card' + (o.elegible ? '' : ' no') + '" data-id="' + esc(o.id) + '">' +
      (o.foto1 ? '  <div class="ofe-foto"><img src="' + esc(o.foto1) + '" alt="' + esc(o.empleador) +
                 '" loading="lazy"></div>' : '') +
      '  <div class="ofe-body">' +
      '    <span class="ofe-pill" style="background:' + esc(o.estadoColor) + '">' + esc(o.estadoLabel) + '</span>' +
      '    <h3>' + esc(o.posicion) + '</h3>' +
      '    <div class="ofe-emp">' + esc(o.empleador) + '</div>' +
      '    <div class="ofe-lugar">📍 ' + esc(o.lugar) + '</div>' +
      '    <div class="ofe-datos">' +
      '      <span>💵 USD $' + esc(o.pagoHora) + '/hour</span>' +
      '      <span>🗣️ ' + esc(o.nivelIngles) + '</span>' +
      '      <span>🎟️ ' + esc(cupos) + '</span>' +
      '    </div>' +
      motivos +
      '    <button class="btn btn-accent btn-block ofe-ver" data-id="' + esc(o.id) + '">Ver oferta</button>' +
      '  </div>' +
      '</article>';
  }

  function pintarLista() {
    var d = S.datos;
    var cont = q('#ofe-cont');
    q('#ofe-sub').textContent = 'Summer Work and Travel';

    var html = '';

    /* FASE 4.1 · punto 1 — la oferta PROPUESTA por SEP, con su plazo y
       los dos botones. La ficha y el modal son los mismos de siempre:
       aquí no se duplica ninguna pantalla. */
    if (d.mia && d.mia.pendienteConfirmacion) {
      var dias = (d.mia.diasRestantes === null || d.mia.diasRestantes === undefined)
        ? null : Math.max(0, d.mia.diasRestantes);
      html += '' +
        '<div class="card ofe-conf-card">' +
        '  <h2><span class="em">⏳</span> SEP te propuso una oferta</h2>' +
        '  <div class="ofe-mia">' +
        '    <div class="ofe-mia-x">' +
        '      <b>' + esc(d.mia.posicion) + '</b>' +
        '      <span>' + esc(d.mia.empleador) + (d.mia.lugar ? ' · ' + esc(d.mia.lugar) : '') + '</span>' +
        '      <span class="ofe-pill" style="background:' + esc(d.mia.estadoColor) + '">' +
                 esc(d.mia.estadoLabel) + '</span>' +
        '    </div>' +
        '  </div>' +
        '  <p class="muted">Sponsor <b>' + esc(d.mia.sponsor) + '</b>' +
             (d.mia.venceDia ? ' · tienes plazo hasta el <b>' + esc(d.mia.venceDia) + '</b>' : '') +
             (dias === null ? '' : ' (' + dias + ' día(s))') + '.</p>' +
        '  <p class="ofe-conf-msg">' + esc((d.textos || {}).propuesta || '') + '</p>' +
        '  <button class="btn btn-accent btn-block" id="ofe-ver-propuesta">Revisar y confirmar</button>' +
        '  <button class="btn btn-ghost btn-block" id="ofe-rechazar">Rechazar esta oferta</button>' +
        '</div>';
    }

    /* Su oferta, si ya escogió. */
    if (d.mia && !d.mia.pendienteConfirmacion) {
      html += '' +
        '<div class="card ofe-mia-card">' +
        '  <h2><span class="em">' + esc(d.mia.estadoIc || '📌') + '</span> Tu oferta seleccionada</h2>' +
        '  <div class="ofe-mia">' +
        '    <div class="ofe-mia-x">' +
        '      <b>' + esc(d.mia.posicion) + '</b>' +
        '      <span>' + esc(d.mia.empleador) + (d.mia.lugar ? ' · ' + esc(d.mia.lugar) : '') + '</span>' +
        '      <span class="ofe-pill" style="background:' + esc(d.mia.estadoColor) + '">' +
                 esc(d.mia.estadoLabel) + '</span>' +
        '    </div>' +
        '  </div>' +
        '  <p class="muted">Sponsor <b>' + esc(d.mia.sponsor) + '</b> · ' +
             (d.mia.asignadaPorSep ? 'asignada por SEP' : 'seleccionada') + ' el ' +
             esc(d.mia.fecha) + ' a las ' + esc(d.mia.hora) + '.</p>' +
             bloqueEntrevista(d.mia) + bloqueResultado(d.mia) +
        '</div>';
    }

    /* Entrega 3 — la aplicación anterior que no fue aprobada. Se
       muestra arriba de la lista para que entienda por qué vuelve a
       poder escoger. */
    if (!d.mia && d.ultima && d.ultima.resultado === 'NO_APROBADA') {
      html += '<div class="card">' + bloqueResultado(d.ultima) + '</div>';
    }

    /* Puerta cerrada: se ven las ofertas, pero no se pueden tomar. */
    if (!d.puerta.ok && !d.mia) {
      html += '' +
        '<div class="card ofe-lock-card">' +
        '  <div class="ofe-lock"><div class="ofe-lock-ic">🔒</div>' +
        '    <p>Puedes mirar las ofertas, pero todavía no seleccionar:</p>' +
        '    <ul class="ofe-motivos">' + d.puerta.motivos.map(function (m) {
             return '<li>' + esc(m.texto) + '</li>'; }).join('') + '</ul>' +
        '  </div>' +
        '</div>';
    }

    /* Filtros (1.18). */
    var f = S.datos.filtros || {};
    html += '' +
      '<div class="ofe-filtros">' +
      '  <input type="search" id="ofe-buscar" class="ofe-input" placeholder="Buscar empleador, posición o ciudad"' +
      '         value="' + esc(S.filtros.texto) + '">' +
      '  <div class="ofe-selects">' +
      '    <select id="ofe-f-estado" class="ofe-input"><option value="">Todos los estados</option>' +
             opciones(f.estadosUsa || [], S.filtros.estado) + '</select>' +
      '    <select id="ofe-f-posicion" class="ofe-input"><option value="">Todas las posiciones</option>' +
             opciones(f.posiciones || [], S.filtros.posicion) + '</select>' +
      '    <select id="ofe-f-sponsor" class="ofe-input"><option value="">Todos los Sponsors</option>' +
             opciones(f.sponsors || [], S.filtros.sponsor) + '</select>' +
      '    <select id="ofe-f-nivel" class="ofe-input"><option value="">Todos los niveles</option>' +
             opciones(f.niveles || [], S.filtros.nivel) + '</select>' +
      '    <select id="ofe-f-orden" class="ofe-input">' +
      '      <option value="">Pago por hora</option>' +
      '      <option value="asc"' + (S.filtros.orden === 'asc' ? ' selected' : '') + '>De menor a mayor</option>' +
      '      <option value="desc"' + (S.filtros.orden === 'desc' ? ' selected' : '') + '>De mayor a menor</option>' +
      '    </select>' +
      '  </div>' +
      '</div>';

    var lista = aplicarFiltros();
    html += '<div class="ofe-conteo" id="ofe-conteo"></div>';
    html += '<div class="ofe-lista" id="ofe-lista">' +
      (lista.length ? lista.map(tarjetaOferta).join('') : vacio()) + '</div>';

    cont.innerHTML = html;
    q('#ofe-conteo').textContent = textoConteo(lista);
    bindLista();
  }

  function vacio() {
    return '<div class="card ofe-vacio"><div class="ofe-vacio-ic">🔎</div>' +
      '<p>No hay ofertas que coincidan con lo que buscas. Quita algún filtro y vuelve a mirar.</p></div>';
  }
  function textoConteo(lista) {
    var total = (S.datos.ofertas || []).length;
    var aptas = lista.filter(function (o) { return o.elegible; }).length;
    if (!total) return 'Todavía no hay ofertas publicadas.';
    return lista.length + ' de ' + total + ' ofertas · ' + aptas + ' para tu perfil';
  }

  function refrescarLista() {
    var lista = aplicarFiltros();
    q('#ofe-lista').innerHTML = lista.length ? lista.map(tarjetaOferta).join('') : vacio();
    q('#ofe-conteo').textContent = textoConteo(lista);
    bindVer();
  }

  function bindVer() {
    qq('.ofe-ver').forEach(function (b) {
      b.addEventListener('click', function () { abrirFicha(b.getAttribute('data-id')); });
    });
  }

  function bindLista() {
    bindVer();
    /* FASE 4.1 — los dos botones de la propuesta. */
    var verProp = q('#ofe-ver-propuesta');
    if (verProp) verProp.addEventListener('click', function () { abrirFicha(S.datos.mia.ofertaId); });
    var rech = q('#ofe-rechazar');
    if (rech) rech.addEventListener('click', rechazar);
    var pares = [['#ofe-f-estado', 'estado'], ['#ofe-f-posicion', 'posicion'],
                 ['#ofe-f-sponsor', 'sponsor'], ['#ofe-f-nivel', 'nivel'], ['#ofe-f-orden', 'orden']];
    pares.forEach(function (p) {
      var el = q(p[0]);
      if (el) el.addEventListener('change', function () { S.filtros[p[1]] = el.value; refrescarLista(); });
    });
    var buscar = q('#ofe-buscar');
    if (buscar) {
      var temp = null;
      buscar.addEventListener('input', function () {
        if (temp) clearTimeout(temp);
        temp = setTimeout(function () { S.filtros.texto = buscar.value; refrescarLista(); }, 180);
      });
    }
  }

  /* ============================================================
     VISTA — FICHA DE LA OFERTA (1.19)
     ============================================================ */
  function abrirFicha(id) {
    var quitar = pintarEsqueleto('ofertaFicha');
    q('#ofe-sub').textContent = 'Cargando la oferta…';
    window.scrollTo({ top: 0, behavior: 'auto' });

    apiPost('ofertaEstudiante', Object.assign(cred(), { id: id })).then(function (r) {
      S.ficha = r; S.foto = 0;
      quitar();
      pintarFicha();
    }, function (e) {
      quitar();
      pintarLista();
      if (typeof error_ === 'function') error_(e.message || e);
    });
  }

  function galeria(o) {
    if (!o.fotos || !o.fotos.length) return '';
    var minis = o.fotos.map(function (f, i) {
      return '<button class="ofe-mini' + (i === S.foto ? ' sel' : '') + '" data-i="' + i + '">' +
        '<img src="' + esc(f) + '" alt="Foto ' + (i + 1) + '" loading="lazy"></button>';
    }).join('');
    return '' +
      '<div class="ofe-gal">' +
      '  <div class="ofe-gal-main">' +
      '    <img id="ofe-gal-img" src="' + esc(o.fotos[S.foto]) + '" alt="' + esc(o.empleador) + '">' +
      (o.fotos.length > 1
        ? '    <button class="ofe-gal-fl izq" id="ofe-gal-prev" aria-label="Foto anterior">‹</button>' +
          '    <button class="ofe-gal-fl der" id="ofe-gal-next" aria-label="Foto siguiente">›</button>' +
          '    <span class="ofe-gal-n" id="ofe-gal-n">' + (S.foto + 1) + ' / ' + o.fotos.length + '</span>'
        : '') +
      '  </div>' +
      (o.fotos.length > 1 ? '  <div class="ofe-minis">' + minis + '</div>' : '') +
      '</div>';
  }

  function bloqueHtml(b, o) {
    var filas = b.campos.map(function (c) {
      return '<div class="kv"><div class="k">' + esc(c.label) + '</div>' +
             '<div class="v">' + esc(c.valor) + '</div></div>';
    }).join('');
    var extra = '';
    if (b.clave === 'destination') {
      if (o.fotoMapa) extra += '<div class="ofe-mapa"><img src="' + esc(o.fotoMapa) + '" alt="Mapa" loading="lazy"></div>';
      if (o.linkMapa) extra += '<a class="btn btn-ghost btn-block" href="' + esc(o.linkMapa) +
        '" target="_blank" rel="noopener">🗺️ Ver detalles del destino</a>';
    }
    return '<div class="card"><h2><span class="em">' + esc(b.ic) + '</span> ' + esc(b.titulo) + '</h2>' +
           filas + extra + '</div>';
  }

  function pintarFicha() {
    var o = S.ficha.oferta;
    var puerta = S.ficha.puerta;
    q('#ofe-sub').textContent = o.posicion;

    var acciones;
    var mia = S.ficha.mia;
    /* FASE 4.1 — si esta ES la oferta que SEP le propuso, aquí se
       confirma o se rechaza: misma ficha, mismo modal, misma casilla. */
    if (mia && mia.pendienteConfirmacion && mia.ofertaId === o.id) {
      acciones = '' +
        '<div class="card ofe-conf-card">' +
        '  <h2><span class="em">⏳</span> Confirma esta oferta</h2>' +
        '  <p class="ofe-conf-msg">' + esc((S.ficha.textos || {}).propuesta || '') + '</p>' +
        (mia.venceDia ? '  <p class="muted">Plazo: hasta el <b>' + esc(mia.venceDia) + '</b>.</p>' : '') +
        '  <button class="btn btn-accent btn-block ofe-sel" id="ofe-confirmar">Confirmar esta oferta</button>' +
        '  <button class="btn btn-ghost btn-block" id="ofe-rechazar-f">Rechazar esta oferta</button>' +
        '</div>';
    } else if (mia) {
      acciones = '<div class="card ofe-lock-card"><div class="ofe-lock">' +
        '<div class="ofe-lock-ic">' + (mia.pendienteConfirmacion ? '⏳' : '📌') + '</div><p>' +
        (mia.pendienteConfirmacion
          ? 'Tienes una oferta pendiente de confirmar: <b>'
          : 'Ya tienes una oferta seleccionada: <b>') +
        esc(mia.posicion) + '</b> en ' + esc(mia.empleador) + '.</p></div></div>';
    } else if (!o.elegible || !puerta.ok) {
      var todos = (o.motivos || []).concat(puerta.ok ? [] : puerta.motivos);
      acciones = '<div class="card ofe-lock-card"><div class="ofe-lock">' +
        '<div class="ofe-lock-ic">🔒</div><p>No puedes seleccionar esta oferta:</p>' +
        '<ul class="ofe-motivos">' + todos.map(function (m) {
          return '<li>' + esc(m.texto) + '</li>'; }).join('') + '</ul></div></div>';
    } else {
      acciones = '<button class="btn btn-accent btn-block ofe-sel" id="ofe-seleccionar">' +
        'Seleccionar esta oferta</button>';
    }

    q('#ofe-cont').innerHTML = '' +
      '<button class="ofe-volver" id="ofe-volver">‹ Volver a las ofertas</button>' +
      '<div class="card ofe-head">' +
      galeria(o) +
      '  <span class="ofe-pill" style="background:' + esc(o.estadoColor) + '">' + esc(o.estadoLabel) + '</span>' +
      '  <h2 class="ofe-titulo">' + esc(o.posicion) + '</h2>' +
      '  <div class="ofe-emp">' + esc(o.empleador) + '</div>' +
      '  <div class="ofe-lugar">📍 ' + esc(o.lugar) + '</div>' +
      '  <div class="ofe-datos">' +
      '    <span>💵 USD $' + esc(o.pagoHora) + '/hour</span>' +
      '    <span>🗣️ ' + esc(o.nivelIngles) + '</span>' +
      '    <span>🤝 ' + esc(o.sponsor) + '</span>' +
      '    <span>🎟️ ' + (o.cuposLibres > 0 ? esc(o.cuposLibres) + ' cupos' : 'Sin cupos') + '</span>' +
      (o.fechaCierre ? '    <span>⏳ Hasta ' + esc(o.fechaCierre) + '</span>' : '') +
      '  </div>' +
      '</div>' +
      o.bloques.map(function (b) { return bloqueHtml(b, o); }).join('') +
      '<button class="btn btn-ghost btn-block ofe-pdf" id="ofe-pdf">📄 Descargar esta oferta en PDF</button>' +
      acciones;

    q('#ofe-volver').addEventListener('click', pintarLista);
    var sel = q('#ofe-seleccionar');
    if (sel) sel.addEventListener('click', function () { confirmar('SELECCION'); });
    /* FASE 4.1 — los dos botones de la propuesta, dentro de la ficha. */
    var conf = q('#ofe-confirmar');
    if (conf) conf.addEventListener('click', function () { confirmar('CONFIRMACION'); });
    var rechF = q('#ofe-rechazar-f');
    if (rechF) rechF.addEventListener('click', rechazar);
    var pdf = q('#ofe-pdf');
    if (pdf) pdf.addEventListener('click', descargarPdf);
    bindGaleria();
  }

  function bindGaleria() {
    var o = S.ficha.oferta;
    function mostrar(i) {
      S.foto = (i + o.fotos.length) % o.fotos.length;
      q('#ofe-gal-img').src = o.fotos[S.foto];
      var n = q('#ofe-gal-n');
      if (n) n.textContent = (S.foto + 1) + ' / ' + o.fotos.length;
      qq('.ofe-mini').forEach(function (b) {
        b.classList.toggle('sel', Number(b.getAttribute('data-i')) === S.foto);
      });
    }
    var p = q('#ofe-gal-prev'), s = q('#ofe-gal-next');
    if (p) p.addEventListener('click', function () { mostrar(S.foto - 1); });
    if (s) s.addEventListener('click', function () { mostrar(S.foto + 1); });
    qq('.ofe-mini').forEach(function (b) {
      b.addEventListener('click', function () { mostrar(Number(b.getAttribute('data-i'))); });
    });
  }

  /* ============================================================
     PDF DE LA OFERTA (1.32)
     ============================================================
     Se puede descargar desde CUALQUIER oferta visible, aunque el
     participante no cumpla los requisitos y aunque no la haya
     seleccionado. El archivo lo arma el backend con la plantilla de
     SEP; aquí solo se pide y se abre.                              */
  function descargarPdf() {
    var b = q('#ofe-pdf');
    if (b) { b.disabled = true; b.textContent = '📄 Preparando el PDF…'; }
    function soltar() {
      if (!b) return;
      b.disabled = false;
      b.textContent = '📄 Descargar esta oferta en PDF';
    }
    apiPost('ofertaPdfEstudiante', Object.assign(cred(), { id: S.ficha.oferta.id }))
      .then(function (r) {
        soltar();
        window.open(r.url, '_blank', 'noopener');
      }, function (e) {
        soltar();
        if (typeof error_ === 'function') error_(e.message || e);
        else Swal.fire({ icon: 'error', title: 'No se pudo generar el PDF',
                         text: String(e.message || e) });
      });
  }

  /* ============================================================
     CONFIRMACIÓN (1.24)
     ============================================================
     Nada se confirma con el primer clic: primero el resumen, la
     advertencia del Sponsor y la casilla obligatoria.             */
  function confirmar(modo) {
    var propuesta = (modo === 'CONFIRMACION');
    var o = S.ficha.oferta;
    var t = S.ficha.textos || {};
    var aviso = String(t.sponsor || '').replace(/\[SPONSOR\]/g, o.sponsor || '');

    var fechas = [];
    (o.bloques || []).forEach(function (b) {
      b.campos.forEach(function (c) {
        if (['inicioMin', 'inicioMax', 'salidaMin', 'salidaMax'].indexOf(c.id) >= 0) {
          fechas.push(c.label + ': ' + c.valor);
        }
      });
    });

    var html = '' +
      '<div class="ofe-conf">' +
      '  <div class="ofe-conf-res">' +
      '    <div class="kv"><div class="k">Empleador</div><div class="v">' + esc(o.empleador) + '</div></div>' +
      '    <div class="kv"><div class="k">Posición</div><div class="v">' + esc(o.posicion) + '</div></div>' +
      '    <div class="kv"><div class="k">Ciudad / Estado</div><div class="v">' + esc(o.lugar) + '</div></div>' +
      '    <div class="kv"><div class="k">Sponsor</div><div class="v">' + esc(o.sponsor) + '</div></div>' +
      '    <div class="kv"><div class="k">Pago por hora</div><div class="v">USD $' + esc(o.pagoHora) + '</div></div>' +
      (fechas.length
        ? '    <div class="kv"><div class="k">Fechas del programa</div><div class="v">' +
          fechas.map(esc).join('<br>') + '</div></div>'
        : '') +
      '  </div>' +
      (propuesta ? '  <p class="ofe-conf-msg">' + esc(t.propuesta || '') + '</p>' : '') +
      '  <p class="ofe-conf-msg">' + esc(t.confirmar || '') + '</p>' +
      '  <p class="ofe-conf-sp"><b>Sponsor:</b> ' + esc(aviso) + '</p>' +
      '  <label class="ofe-conf-chk"><input type="checkbox" id="ofe-chk">' +
      '    <span>' + esc(t.casilla || '') + '</span></label>' +
      '</div>';

    Swal.fire({
      title: propuesta ? 'Confirma la oferta que te propusieron' : 'Confirma tu selección',
      html: html,
      width: 620,
      showCancelButton: true,
      confirmButtonText: propuesta ? 'Confirmar oferta' : 'Confirmar selección',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      didOpen: function () {
        var boton = Swal.getConfirmButton();
        var chk = document.getElementById('ofe-chk');
        boton.disabled = true;
        chk.addEventListener('change', function () { boton.disabled = !chk.checked; });
      },
      preConfirm: function () {
        var chk = document.getElementById('ofe-chk');
        if (!chk || !chk.checked) {
          Swal.showValidationMessage('Debes marcar la casilla para continuar.');
          return false;
        }
        return true;
      }
    }).then(function (res) {
      if (!res.isConfirmed) return;
      enviarSeleccion(o.id, propuesta);
    });
  }

  /* FASE 4.1 — rechazar la propuesta. Se le avisa qué significa antes
     de que pulse: el cupo se libera y no vuelve a escoger por su
     cuenta (queda esperando a que SEP le proponga otra). */
  function rechazar() {
    var t = (S.ficha && S.ficha.textos) || (S.datos && S.datos.textos) || {};
    var mia = (S.ficha && S.ficha.mia) || (S.datos && S.datos.mia) || {};
    Swal.fire({
      icon: 'warning',
      title: 'Rechazar esta oferta',
      html: '<b>' + esc(mia.posicion || '') + '</b><br>' + esc(mia.empleador || '') +
            '<br><br>' + esc(t.rechazo || ''),
      input: 'textarea',
      inputLabel: 'Cuéntanos por qué (opcional)',
      inputAttributes: { maxlength: 300 },
      showCancelButton: true,
      confirmButtonText: 'Sí, rechazarla',
      cancelButtonText: 'Volver'
    }).then(function (res) {
      if (!res.isConfirmed) return;
      var quitar = pintarEsqueleto('ofertaFicha');
      apiPost('rechazarOferta', Object.assign(cred(), { id: mia.ofertaId, motivo: res.value || '' }))
        .then(function (r) {
          if (typeof aplicarEstudiante_ === 'function') aplicarEstudiante_(r.estudiante);
          quitar();
          Swal.fire({
            icon: 'success', title: 'Oferta rechazada',
            html: 'El cupo quedó liberado. Tu asesor(a) de procesos te propondrá otra oferta.',
            confirmButtonText: 'Entendido'
          }).then(function () { abrir(); });
        }, function (e) {
          quitar();
          abrir();
          if (typeof error_ === 'function') error_(e.message || e);
        });
    });
  }

  function enviarSeleccion(id, propuesta) {
    var quitar = pintarEsqueleto('ofertaFicha');
    apiPost(propuesta ? 'confirmarOferta' : 'seleccionarOferta',
            Object.assign(cred(), { id: id, acepto: true }))
      .then(function (r) {
        /* app.js guarda los datos del estudiante y repinta el inicio:
           así la tarjeta del inicio queda al día sin otra lectura. */
        if (typeof aplicarEstudiante_ === 'function') aplicarEstudiante_(r.estudiante);
        quitar();
        Swal.fire({
          icon: 'success',
          title: propuesta ? '¡Oferta confirmada!' : '¡Oferta seleccionada!',
          html: '<b>' + esc(r.seleccion.posicion) + '</b><br>' + esc(r.seleccion.empleador) +
                '<br><br>Tu cupo quedó reservado. SEP Colombia Group continúa con la aplicación ante ' +
                esc(r.seleccion.sponsor) + '.',
          confirmButtonText: 'Entendido'
        }).then(function () { abrir(); });
      }, function (e) {
        quitar();
        pintarFicha();
        if (typeof error_ === 'function') error_(e.message || e);
      });
  }

  /* ============================================================
     SALIDA
     ============================================================ */
  /* El botón vive en el index y este archivo se carga después de la
     sección, así que ya está en el DOM. */
  var btnSalir = document.getElementById('ofe-salir');
  if (btnSalir) btnSalir.addEventListener('click', function () { showView('home'); });

  window.OFERTAS = { tarjeta: tarjeta, bind: bind, abrir: abrir, _estado: S,
    /* Entrega 4 — puerta para las pruebas automatizadas. */
    _pdf: descargarPdf, _rechazar: rechazar, _confirmar: confirmar,
    /* FASE 4.1 — puertas para las pruebas automatizadas. */
    _lista: pintarLista, _ficha: pintarFicha,
    /* Entrega 3 — puerta para las pruebas automatizadas. */
    _entrevista: bloqueEntrevista, _resultado: bloqueResultado };
})();
