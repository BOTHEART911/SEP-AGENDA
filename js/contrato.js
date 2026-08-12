/* ============================================================
 * ZONA DE ESTUDIANTES — CONTRATO (Fase 3 · 11/08/2026)
 * © Oscar Polanía — Experto en Soluciones Digitales · +57 310 323 0712
 * Software propietario; cualquier modificación por terceros anula la garantía.
 * ------------------------------------------------------------
 * Tarjeta del contrato en el inicio + lectura del contrato en 8
 * bloques (Regresar / Continuar), aceptación, formulario con los
 * datos del estudiante y de su deudor solidario, cédulas en PDF y
 * las dos firmas dibujadas. Al enviar, el backend genera el PDF,
 * lo guarda en Drive y se lo manda por correo.
 *
 * Fase 5 (11/08/2026): campo Universidad (requerido), archivos SOLO en
 * PDF con Ver y Reemplazar sin salir de la app, pantalla de RESUMEN
 * antes de firmar y lectura aprovechando el ancho de la pantalla.
 *
 * Usa lo que ya existe en app.js: apiPost, cred_, escapeHtml_,
 * showView, toast_, error_, hacerLogin_, EST.
 * ============================================================ */

var CONTRATO = (function () {

  var S = {
    estado: null,      // respuesta de contratoEstado
    bloques: [],       // lectura
    idx: 0,            // bloque actual
    acepto: false,
    docUrl: '',        // PDF del documento del estudiante (ya subido)
    cedUrl: '',        // PDF de la cédula del deudor (ya subido)
    firmas: {},        // canvas de firma por id
    enviando: false,
    /* FASE 5 — lo escrito se recuerda para poder ir y volver del
       resumen sin perder nada (incluidas las firmas ya dibujadas). */
    form: null,
    pngs: {},
    /* AJUSTE 3 (11/08) — las dos declaraciones que van bajo las firmas.
       Viven SOLO en el navegador: no se mandan al backend ni se guardan en
       la hoja; se recuerdan aquí para no perderlas al ir y volver del
       resumen. */
    checks: { propia: false, suplantar: false }
  };

  var DECLARACIONES = [
    { id: 'propia', txt: 'Declaro que estoy firmando personalmente este contrato como participante y que el deudor solidario realiza su firma con su propio consentimiento.' },
    { id: 'suplantar', txt: 'Entiendo que no puedo firmar ni suplantar a otra persona y que hacerlo podrá generar las consecuencias legales, judiciales y contractuales correspondientes.' }
  ];

  var MAX_MB = 5;

  /* ---------------- utilidades ---------------- */
  function q(sel) { return document.querySelector(sel); }
  function esc(s) { return (typeof escapeHtml_ === 'function') ? escapeHtml_(s) : String(s == null ? '' : s); }
  function soloDig(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }

  function aviso(msg) { Swal.fire({ icon: 'warning', title: 'Falta algo', text: msg }); return false; }

  function leerArchivo_(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1]); };
      r.onerror = function () { rej(new Error('No se pudo leer el archivo')); };
      r.readAsDataURL(file);
    });
  }

  /* ============================================================
     TARJETA DEL INICIO
     ============================================================ */
  function tarjeta(e) {
    var c = e && e.contrato;
    if (!c) return '';

    if (!c.habilitado) {
      return '' +
        '<div class="card">' +
        '  <h2><span class="em">📄</span> Tu contrato</h2>' +
        '  <p class="muted center" style="padding:6px 0">' + esc(c.mensaje || 'Aquí aparecerá tu contrato cuando esté disponible.') + '</p>' +
        '</div>';
    }

    var video = c.video
      ? '<a class="ctr-video" href="' + esc(c.video) + '" target="_blank" rel="noopener">🎬 Ver el video guía de la firma</a>'
      : '';

    if (c.firmado) {
      return '' +
        '<div class="card">' +
        '  <h2><span class="em">📄</span> Tu contrato</h2>' +
        '  <div class="ctr-ok">' +
        '    <div class="ctr-ok-ic">✅</div>' +
        '    <p>' + (c.validado
                      ? 'Tu contrato está firmado y <b>validado</b> por SEP Colombia Group.'
                      : 'Tu contrato está firmado. Nuestro equipo lo está revisando.') + '</p>' +
        '  </div>' +
        '  <a class="btn btn-accent btn-block" href="' + esc(c.contratoUrl) + '" target="_blank" rel="noopener">⬇️ Descargar mi contrato</a>' +
        (c.puedeFirmar
          ? '  <button class="btn btn-ghost btn-block" id="ctr-abrir" style="margin-top:8px">✍️ Rehacer mi contrato</button>' +
            '  <p class="muted center" style="margin:8px 0 0">Puedes rehacerlo mientras nuestro equipo no lo valide.</p>'
          : '') +
        video +
        '</div>';
    }

    return '' +
      '<div class="card">' +
      '  <h2><span class="em">📄</span> Tu contrato</h2>' +
      '  <div class="ctr-call">' +
      '    <div class="ctr-call-ic">✍️</div>' +
      '    <p>¡Tu pago de inscripción fue validado! Ya puedes leer y firmar el contrato de tu programa.</p>' +
      '  </div>' +
      '  <button class="btn btn-accent btn-block" id="ctr-abrir">Leer y firmar mi contrato</button>' +
      video +
      '</div>';
  }

  function bind() {
    var b = q('#ctr-abrir');
    if (b) b.addEventListener('click', abrir);
  }

  /* ============================================================
     ABRIR EL FLUJO
     ============================================================ */
  /* AJUSTE 2 (11/08) — el esqueleto es el único efecto de carga: la vista del
     contrato se abre YA con siluetas y se rellena cuando llegan las dos
     lecturas (estado + texto). Si algo falla, se vuelve solo al inicio. */
  function pintarEsqueleto(forma) {
    if (window.SEPEsqueleto && typeof window.SEPEsqueleto.pintar === 'function') {
      return window.SEPEsqueleto.pintar('ctr-cont', forma) || function () {};
    }
    return function () {};
  }

  async function abrir() {
    var quitar = pintarEsqueleto('lectura');
    q('#ctr-sub').textContent = 'Cargando tu contrato…';
    q('#ctr-bar').style.width = '10%';
    showView('contrato');

    function alInicio(msg) {
      quitar();
      showView('home');
      if (msg) error_(msg);
      return null;
    }

    try {
      S.estado = await apiPost('contratoEstado', cred_());
      if (!S.estado.habilitado) return alInicio(S.estado.mensaje || 'Tu contrato todavía no está disponible.');
      if (!S.estado.puedeFirmar) return alInicio('Tu contrato ya fue validado. Escríbele a tu asesor(a) si necesitas un cambio.');
      MAX_MB = S.estado.maxMb || 5;

      var r = await apiPost('contratoTexto', cred_());
      S.bloques = r.bloques || [];
      if (!S.bloques.length) return alInicio('No pudimos cargar el texto del contrato. Intenta de nuevo.');

      S.idx = 0; S.acepto = false; S.firmas = {}; S.form = null; S.pngs = {};
      S.checks = { propia: false, suplantar: false };
      S.docUrl = S.estado.datos.documentoUrl || '';
      S.cedUrl = S.estado.datos.cedulaUrl || '';
      quitar();
      pintarLectura();
    } catch (e) { alInicio(e.message || e); }
  }

  function volverInicio() {
    Swal.fire({
      icon: 'question', title: '¿Salir del contrato?',
      text: 'Lo que hayas leído se pierde y tendrás que empezar de nuevo.',
      showCancelButton: true, confirmButtonText: 'Sí, salir', cancelButtonText: 'Seguir aquí'
    }).then(function (res) { if (res.isConfirmed) showView('home'); });
  }

  /* ============================================================
     LECTURA POR BLOQUES
     ============================================================ */
  function itemHtml(it) {
    if (it.t === 'h') return '<h3 class="ctr-h">' + esc(it.x) + '</h3>';
    if (it.t === 'tabla') {
      return '<div class="ctr-tabla-wrap"><table class="ctr-tabla">' +
        it.filas.map(function (f, i) {
          var celdas = f.map(function (c) { return (i === 0 ? '<th>' : '<td>') + esc(c) + (i === 0 ? '</th>' : '</td>'); }).join('');
          return '<tr>' + celdas + '</tr>';
        }).join('') + '</table></div>';
    }
    return '<p class="ctr-p">' + esc(it.x) + '</p>';
  }

  function pintarLectura() {
    var b = S.bloques[S.idx];
    var ultimo = S.idx === S.bloques.length - 1;

    q('#ctr-sub').textContent = 'Bloque ' + (S.idx + 1) + ' de ' + S.bloques.length;
    q('#ctr-bar').style.width = Math.round(((S.idx + 1) / S.bloques.length) * 100) + '%';

    var html = '' +
      '<div class="ctr-lect">' +
      '  <div class="ctr-titulo">' + esc(b.titulo) + '</div>' +
      b.items.map(itemHtml).join('') +
      '</div>';

    if (ultimo) {
      html += '' +
        '<label class="ctr-acepto" id="ctr-acepto-l">' +
        '  <input type="checkbox" id="ctr-acepto"' + (S.acepto ? ' checked' : '') + '>' +
        '  <span>He leído y acepto todos los términos, cláusulas y condiciones de este contrato.</span>' +
        '</label>';
    }

    html += '' +
      '<div class="ctr-nav">' +
      '  <button class="btn btn-ghost" id="ctr-atras-b"' + (S.idx === 0 ? ' disabled' : '') + '>← Regresar</button>' +
      '  <button class="btn btn-accent" id="ctr-sig">' + (ultimo ? 'Continuar a mis datos →' : 'Continuar →') + '</button>' +
      '</div>';

    var cont = q('#ctr-cont');
    cont.innerHTML = html;
    cont.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });

    q('#ctr-atras-b').addEventListener('click', function () { if (S.idx > 0) { S.idx--; pintarLectura(); } });
    q('#ctr-sig').addEventListener('click', function () {
      if (!ultimo) { S.idx++; pintarLectura(); return; }
      S.acepto = q('#ctr-acepto').checked;
      if (!S.acepto) {
        q('#ctr-acepto-l').classList.add('ctr-falta');
        setTimeout(function () { q('#ctr-acepto-l') && q('#ctr-acepto-l').classList.remove('ctr-falta'); }, 1200);
        return aviso('Para continuar debes aceptar los términos del contrato.');
      }
      pintarFormulario();
    });
  }

  /* ============================================================
     FORMULARIO
     ============================================================ */

  /* FASE 5 — bloque de archivo: subir, VER (sin salir de la app) y
     REEMPLAZAR. Solo PDF. */
  function archivoHtml(id, titulo, url) {
    var cargado = !!url;
    return '' +
      '<div class="ctr-f">' +
      '  <label>' + esc(titulo) + ' <span class="ctr-max">(solo PDF, máx. ' + MAX_MB + ' MB)</span></label>' +
      '  <div class="ctr-arch" id="a-' + id + '">' + archivoInterior(id, cargado) + '</div>' +
      '  <input type="file" id="f-' + id + '-file" accept="application/pdf,.pdf" hidden>' +
      '</div>';
  }

  function archivoInterior(id, cargado) {
    if (!cargado) {
      return '<button type="button" class="ctr-file" data-arch="subir" data-id="' + id + '">' +
             '⬆️ Subir el PDF</button>';
    }
    return '' +
      '<div class="ctr-arch-ok">' +
      '  <span class="ctr-arch-ic">📄</span>' +
      '  <span class="ctr-arch-t">Archivo cargado</span>' +
      '  <span class="ctr-arch-b">' +
      '    <button type="button" class="ctr-mini" data-arch="ver" data-id="' + id + '">👁 Ver</button>' +
      '    <button type="button" class="ctr-mini" data-arch="subir" data-id="' + id + '">♻️ Reemplazar</button>' +
      '  </span>' +
      '</div>';
  }

  function urlDe(id) { return id === 'doc' ? S.docUrl : S.cedUrl; }
  function tituloDe(id) { return id === 'doc' ? 'Tu documento' : 'Cédula del deudor solidario'; }

  function pintarArchivo(id) {
    var cont = q('#a-' + id);
    if (!cont) return;
    cont.innerHTML = archivoInterior(id, !!urlDe(id));
    cablearArchivos();
  }

  function cablearArchivos() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-arch]'), function (b) {
      if (b.dataset.listo === '1') return;
      b.dataset.listo = '1';
      b.addEventListener('click', function () {
        var id = b.dataset.id;
        if (b.dataset.arch === 'ver') verArchivo(urlDe(id), tituloDe(id));
        else q('#f-' + id + '-file').click();
      });
    });
  }

  /* Visor dentro de la app: no abre pestaña. */
  function verArchivo(url, titulo) {
    if (!url) return;
    var m = String(url).match(/[-\w]{25,}/);
    q('#ctr-visor-title').textContent = titulo || 'Archivo';
    q('#ctr-visor-frame').src = m ? 'https://drive.google.com/file/d/' + m[0] + '/preview' : url;
    var a = q('#ctr-visor-bajar');
    if (a) a.href = m ? 'https://drive.google.com/uc?export=download&id=' + m[0] : url;
    q('#ctr-visor').classList.remove('hidden');
  }
  function cerrarVisor() {
    var v = q('#ctr-visor'); if (!v) return;
    v.classList.add('hidden');
    var f = q('#ctr-visor-frame'); if (f) f.src = 'about:blank';
  }

  /* Lo que hay escrito ahora mismo en el formulario. */
  function leerForm() {
    return {
      documento:   q('#f-doc') ? soloDig(q('#f-doc').value) : '',
      nacimiento:  q('#f-nac') ? q('#f-nac').value : '',
      direccion:   q('#f-dir') ? q('#f-dir').value.trim() : '',
      universidad: q('#f-uni') ? q('#f-uni').value.replace(/\s+/g, ' ').trim() : '',
      deudor:      q('#f-deu') ? q('#f-deu').value.replace(/\s+/g, ' ').trim() : '',
      cedula:      q('#f-ced') ? soloDig(q('#f-ced').value) : ''
    };
  }

  function pintarFormulario() {
    /* Al volver del resumen mandan los valores ya escritos, no los de
       la hoja: nada de retroceder y encontrarse el formulario vacío. */
    var d = S.form || S.estado.datos || {};
    q('#ctr-sub').textContent = 'Tus datos y firmas';
    q('#ctr-bar').style.width = '100%';

    q('#ctr-cont').innerHTML = '' +
      '<div class="ctr-cols">' +
      '<div class="card">' +
      '  <h2><span class="em">🧾</span> Tus datos</h2>' +
      '  <div class="ctr-f"><label>Nombre completo</label>' +
      '    <input type="text" value="' + esc(((S.estado.datos || {}).nombres || '') + ' ' + ((S.estado.datos || {}).apellidos || '')) + '" disabled></div>' +
      '  <div class="ctr-f"><label>Número de documento</label>' +
      '    <input id="f-doc" type="tel" inputmode="numeric" maxlength="10" placeholder="Solo números" value="' + esc(d.documento || '') + '"></div>' +
      '  <div class="ctr-f"><label>Fecha de nacimiento</label>' +
      '    <input id="f-nac" type="date" min="' + limiteNac_(28) + '" max="' + limiteNac_(17) + '" value="' + esc(d.nacimiento || '') + '"></div>' +
      '  <div class="ctr-f"><label>Dirección de domicilio</label>' +
      '    <input id="f-dir" type="text" placeholder="Calle 00 # 00-00, ciudad" value="' + esc(d.direccion || '') + '"></div>' +
      '  <div class="ctr-f"><label>Universidad</label>' +
      '    <input id="f-uni" type="text" placeholder="Nombre completo de tu universidad" value="' + esc(d.universidad || '') + '"></div>' +
      archivoHtml('doc', 'Tu documento en PDF', S.docUrl) +
      '</div>' +

      '<div class="card">' +
      '  <h2><span class="em">🤝</span> Tu deudor solidario</h2>' +
      '  <div class="ctr-f"><label>Nombre completo del deudor</label>' +
      '    <input id="f-deu" type="text" placeholder="Nombres y apellidos" value="' + esc(d.deudor || '') + '"></div>' +
      '  <div class="ctr-f"><label>Cédula del deudor</label>' +
      '    <input id="f-ced" type="tel" inputmode="numeric" maxlength="10" placeholder="Solo números" value="' + esc(d.cedula || '') + '"></div>' +
      archivoHtml('ced', 'Cédula del deudor en PDF', S.cedUrl) +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '  <h2><span class="em">✍️</span> Firmas</h2>' +
      '  <p class="muted">Dibuja las firmas con el dedo o el mouse. Quedarán tal cual en el contrato.</p>' +
      '  <div class="ctr-cols">' +
      firmaHtml('est', 'Firma del estudiante') +
      firmaHtml('deu', 'Firma del deudor solidario') +
      '  </div>' +
      declaracionesHtml() +
      '</div>' +

      '<div class="ctr-nav">' +
      '  <button class="btn btn-ghost" id="ctr-volver-lect">← Volver a leer</button>' +
      '  <button class="btn btn-accent" id="ctr-resumen">Revisar mis datos →</button>' +
      '</div>' +
      '<p class="muted center" style="margin:10px 0 0">Antes de firmar te mostramos un resumen para que revises todo.</p>';

    window.scrollTo({ top: 0, behavior: 'auto' });

    prepararFirma('est'); prepararFirma('deu');
    q('#f-doc').addEventListener('input', function (e) { e.target.value = soloDig(e.target.value); });
    q('#f-ced').addEventListener('input', function (e) { e.target.value = soloDig(e.target.value); });
    q('#f-doc-file').addEventListener('change', function (ev) { subir(ev, 'documento'); });
    q('#f-ced-file').addEventListener('change', function (ev) { subir(ev, 'cedula'); });
    cablearArchivos();
    q('#ctr-volver-lect').addEventListener('click', function () { S.form = leerForm(); guardarFirmas(); guardarChecks(); pintarLectura(); });
    q('#ctr-resumen').addEventListener('click', irAResumen);
  }

  /* ============================================================
     RESUMEN — última parada antes de firmar
     ============================================================
     Se arma con lo que hay escrito en ese momento, así el estudiante
     ve exactamente lo que va a quedar impreso en su contrato. */
  function fila(etiqueta, valor) {
    return '<div class="ctr-res-f"><span>' + esc(etiqueta) + '</span><b>' + esc(valor || '—') + '</b></div>';
  }

  function fechaTexto_(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return iso || '';
    var m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
             'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return Number(p[2]) + ' de ' + (m[Number(p[1]) - 1] || '') + ' de ' + p[0];
  }

  function pintarResumen() {
    var f = S.form || {};
    var e = S.estado.datos || {};
    q('#ctr-sub').textContent = 'Revisa antes de firmar';

    q('#ctr-cont').innerHTML = '' +
      '<div class="card">' +
      '  <h2><span class="em">🔍</span> Revisa tus datos</h2>' +
      '  <p class="muted">Esto es lo que va a quedar impreso en tu contrato. Si algo está mal, corrígelo antes de firmar.</p>' +
      '  <div class="ctr-res">' +
      fila('Nombre completo', (e.nombres || '') + ' ' + (e.apellidos || '')) +
      fila('Documento', f.documento) +
      fila('Fecha de nacimiento', fechaTexto_(f.nacimiento)) +
      fila('Dirección', f.direccion) +
      fila('Universidad', f.universidad) +
      '  </div>' +
      '</div>' +

      '<div class="card">' +
      '  <h2><span class="em">🤝</span> Tu deudor solidario</h2>' +
      '  <div class="ctr-res">' +
      fila('Nombre completo', f.deudor) +
      fila('Cédula', f.cedula) +
      '  </div>' +
      '</div>' +

      '<div class="card">' +
      '  <h2><span class="em">📎</span> Tus documentos</h2>' +
      '  <div class="ctr-res-arch">' +
      '    <div class="ctr-arch-ok"><span class="ctr-arch-ic">📄</span><span class="ctr-arch-t">Tu documento</span>' +
      '      <span class="ctr-arch-b"><button type="button" class="ctr-mini" data-arch="ver" data-id="doc">👁 Ver</button></span></div>' +
      '    <div class="ctr-arch-ok"><span class="ctr-arch-ic">📄</span><span class="ctr-arch-t">Cédula del deudor</span>' +
      '      <span class="ctr-arch-b"><button type="button" class="ctr-mini" data-arch="ver" data-id="ced">👁 Ver</button></span></div>' +
      '  </div>' +
      '</div>' +

      '<div class="card">' +
      '  <h2><span class="em">✍️</span> Tus firmas</h2>' +
      '  <div class="ctr-cols">' +
      '    <div class="ctr-res-firma"><span>Estudiante</span><img src="data:image/png;base64,' + S.pngs.est + '" alt="Firma del estudiante"></div>' +
      '    <div class="ctr-res-firma"><span>Deudor solidario</span><img src="data:image/png;base64,' + S.pngs.deu + '" alt="Firma del deudor"></div>' +
      '  </div>' +
      '</div>' +

      '<div class="ctr-nav">' +
      '  <button class="btn btn-ghost" id="ctr-corregir">← Corregir</button>' +
      '  <button class="btn btn-accent" id="ctr-enviar">✍️ Firmar y enviar</button>' +
      '</div>';

    window.scrollTo({ top: 0, behavior: 'auto' });
    cablearArchivos();
    q('#ctr-corregir').addEventListener('click', pintarFormulario);
    q('#ctr-enviar').addEventListener('click', enviar);
  }

  function guardarFirmas() {
    var e = firmaPng('est'); if (e) S.pngs.est = e;
    var d = firmaPng('deu'); if (d) S.pngs.deu = d;
  }

  /* Valida TODO y, si está bien, muestra el resumen. */
  function irAResumen() {
    var f = leerForm();

    if (f.documento.length < 6 || f.documento.length > 10) return aviso('Tu número de documento debe tener entre 6 y 10 dígitos.');
    if (!f.nacimiento) return aviso('Selecciona tu fecha de nacimiento.');
    if (f.nacimiento < limiteNac_(28) || f.nacimiento > limiteNac_(17)) return aviso('La edad del programa va de 17 a 28 años. Revisa tu fecha de nacimiento.');
    if (f.direccion.length < 5) return aviso('Escribe tu dirección de domicilio.');
    if (f.universidad.length < 3) return aviso('Escribe el nombre de tu universidad.');
    if (!S.docUrl) return aviso('Sube el PDF de tu documento.');
    if (f.deudor.split(' ').filter(Boolean).length < 2) return aviso('Escribe el nombre completo de tu deudor solidario.');
    if (f.cedula.length < 6 || f.cedula.length > 10) return aviso('La cédula del deudor debe tener entre 6 y 10 dígitos.');
    if (f.cedula === f.documento) return aviso('El deudor solidario debe ser una persona distinta a ti.');
    if (!S.cedUrl) return aviso('Sube el PDF de la cédula de tu deudor solidario.');

    guardarFirmas();
    if (!S.pngs.est) return aviso('Falta tu firma.');
    if (!S.pngs.deu) return aviso('Falta la firma de tu deudor solidario.');

    /* AJUSTE 3 — las dos declaraciones van justo debajo de las firmas y son
       obligatorias para continuar. */
    if (faltaDeclaracion()) return aviso('Para continuar debes marcar las dos casillas que están debajo de las firmas.');

    S.form = f;
    pintarResumen();
  }

  /* Topes de la fecha de nacimiento: el programa va de 17 a 28 años. */
  function limiteNac_(anios) {
    var h = new Date();
    var d = new Date(h.getFullYear() - anios, h.getMonth(), h.getDate());
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* ---------------- AJUSTE 3: declaraciones bajo las firmas ----------------
     Van justo debajo de las dos firmas, dentro del mismo formulario. Son
     requeridas para continuar, pero NO se guardan ni se repiten en el
     resumen: solo son la confirmación de quién está firmando. */
  function declaracionesHtml() {
    return '<div class="ctr-decl">' +
      DECLARACIONES.map(function (d) {
        return '<label class="ctr-check" id="ctr-chk-l-' + d.id + '">' +
               '  <input type="checkbox" id="ctr-chk-' + d.id + '"' + (S.checks[d.id] ? ' checked' : '') + '>' +
               '  <span>' + esc(d.txt) + '</span>' +
               '</label>';
      }).join('') +
      '</div>';
  }

  function guardarChecks() {
    DECLARACIONES.forEach(function (d) {
      var el = q('#ctr-chk-' + d.id);
      if (el) S.checks[d.id] = !!el.checked;
    });
  }

  function faltaDeclaracion() {
    guardarChecks();
    for (var i = 0; i < DECLARACIONES.length; i++) {
      var d = DECLARACIONES[i];
      if (!S.checks[d.id]) {
        var caja = q('#ctr-chk-l-' + d.id);
        if (caja) {
          caja.classList.add('ctr-falta');
          caja.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function () { caja.classList.remove('ctr-falta'); }, 1400);
        }
        return true;
      }
    }
    return false;
  }

  function firmaHtml(id, titulo) {
    return '' +
      '<div class="ctr-firma">' +
      '  <div class="ctr-firma-h"><span>' + esc(titulo) + '</span>' +
      '    <button type="button" class="ctr-borrar" id="f-clr-' + id + '">Borrar</button></div>' +
      '  <canvas id="f-cv-' + id + '" class="ctr-canvas"></canvas>' +
      '  <div class="ctr-firma-linea">Firma aquí</div>' +
      '</div>';
  }

  /* ---------------- firma dibujada ---------------- */
  function prepararFirma(id) {
    var cv = q('#f-cv-' + id);
    var ratio = window.devicePixelRatio || 1;
    var ancho = cv.parentNode.clientWidth - 4;
    var alto = 150;
    cv.width = ancho * ratio; cv.height = alto * ratio;
    cv.style.width = ancho + 'px'; cv.style.height = alto + 'px';

    var ctx = cv.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#16202e';

    var pintando = false, hay = false, ultimo = null;
    S.firmas[id] = { cv: cv, ctx: ctx, hay: function () { return hay; }, ancho: ancho, alto: alto };

    function punto(ev) {
      var r = cv.getBoundingClientRect();
      var t = (ev.touches && ev.touches[0]) || ev;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    }
    function arranca(ev) { ev.preventDefault(); pintando = true; ultimo = punto(ev); }
    function mueve(ev) {
      if (!pintando) return;
      ev.preventDefault();
      var p = punto(ev);
      ctx.beginPath(); ctx.moveTo(ultimo.x, ultimo.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ultimo = p; hay = true;
    }
    function suelta() { pintando = false; }

    cv.addEventListener('mousedown', arranca); cv.addEventListener('mousemove', mueve);
    window.addEventListener('mouseup', suelta);
    cv.addEventListener('touchstart', arranca, { passive: false });
    cv.addEventListener('touchmove', mueve, { passive: false });
    cv.addEventListener('touchend', suelta);

    q('#f-clr-' + id).addEventListener('click', function () {
      ctx.clearRect(0, 0, cv.width, cv.height); hay = false;
      delete S.pngs[id];
    });

    /* FASE 5 — si ya había firma (se volvió del resumen), se repinta
       para que no toque volver a dibujarla. */
    if (S.pngs[id]) {
      var img = new Image();
      img.onload = function () {
        var escala = Math.min(ancho / img.width, alto / img.height);
        var dw = img.width * escala, dh = img.height * escala;
        ctx.drawImage(img, (ancho - dw) / 2, (alto - dh) / 2, dw, dh);
        hay = true;
      };
      img.src = 'data:image/png;base64,' + S.pngs[id];
    }
  }

  /* Recorta la firma y la deja SIEMPRE en un PNG de 600x200 con fondo
     transparente: así el backend la mete al contrato con un tamaño fijo
     y nunca sale deformada. */
  function firmaPng(id) {
    var f = S.firmas[id];
    if (!f || !f.hay()) return '';
    var cv = f.cv, ctx = f.ctx;
    var img = ctx.getImageData(0, 0, cv.width, cv.height).data;
    var x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0, hay = false;
    for (var y = 0; y < cv.height; y++) {
      for (var x = 0; x < cv.width; x++) {
        if (img[(y * cv.width + x) * 4 + 3] > 12) {
          hay = true;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (!hay) return '';
    var m = 6;
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m);
    x1 = Math.min(cv.width - 1, x1 + m); y1 = Math.min(cv.height - 1, y1 + m);
    var w = x1 - x0 + 1, h = y1 - y0 + 1;

    var out = document.createElement('canvas');
    out.width = 600; out.height = 200;
    var o = out.getContext('2d');
    var escala = Math.min(600 / w, 200 / h);
    var dw = w * escala, dh = h * escala;
    o.drawImage(cv, x0, y0, w, h, (600 - dw) / 2, (200 - dh) / 2, dw, dh);
    return out.toDataURL('image/png').split(',')[1];
  }

  /* ---------------- subida de archivos ---------------- */
  async function subir(ev, tipo) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var id = (tipo === 'documento') ? 'doc' : 'ced';
    var cont = q('#a-' + id);

    /* FASE 5 — SOLO PDF. Se mira la extensión y el tipo que declara el
       navegador, para que no pase una foto renombrada a .pdf. */
    var esPdf = /\.pdf$/i.test(file.name || '') &&
                (!file.type || file.type === 'application/pdf');
    if (!esPdf) {
      ev.target.value = '';
      return aviso('El archivo debe estar en formato PDF. Si tienes una foto, conviértela a PDF antes de subirla.');
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      ev.target.value = '';
      return aviso('El archivo pesa más de ' + MAX_MB + ' MB. Comprímelo antes de subirlo.');
    }
    try {
      /* AJUSTE 2 — también aquí manda el esqueleto: la ficha del archivo se
         convierte en silueta mientras sube, sin girador. */
      if (cont) cont.innerHTML = '<div class="ctr-arch-ok sep-sk-arch" aria-busy="true" aria-label="Subiendo">' +
        '<span class="sep-sk sep-sk-ico"></span><span class="sep-sk sep-sk-l"></span></div>';
      var base64 = await leerArchivo_(file);
      var res = await apiPost('contratoArchivo', Object.assign(cred_(), {
        tipo: tipo, filename: file.name, mime: 'application/pdf', base64: base64,
        documento: soloDig(q('#f-doc') ? q('#f-doc').value : '')
      }));
      if (tipo === 'documento') S.docUrl = res.url; else S.cedUrl = res.url;
      pintarArchivo(id);
      toast_('success', 'Archivo cargado');
    } catch (e) {
      pintarArchivo(id);
      error_(e.message || e);
    } finally { ev.target.value = ''; }
  }

  /* ============================================================
     AJUSTE 4 — LOADER DE LA CREACIÓN DEL CONTRATO
     ============================================================
     Es la única espera larga de la app: el backend copia la plantilla de
     Google Docs, reemplaza los marcadores, mete las 5 firmas como imagen,
     exporta el PDF, lo sube a Drive y manda el correo. Puede tardar. Aquí
     no vale un esqueleto: hay que retener al estudiante en la pantalla y
     decirle que no se salga.
     Es la ÚNICA excepción a "el esqueleto es el único efecto de carga". */
  var CREANDO = { t: null, pct: 0, guard: null };

  var PASOS = [
    'Preparando tu documento…',
    'Colocando tus datos en el contrato…',
    'Insertando tu firma y la de tu deudor…',
    'Generando el PDF…',
    'Guardándolo y enviándolo a tu correo…',
    'Ya casi, no cierres esta ventana…'
  ];

  function noSalir(ev) {
    ev.preventDefault();
    ev.returnValue = 'Tu contrato se está creando. Si sales ahora, no quedará firmado.';
    return ev.returnValue;
  }

  function abrirCreando() {
    var caja = q('#ctr-load');
    if (!caja) return;
    caja.classList.remove('hidden');
    caja.classList.remove('listo');
    q('#ctr-load-t').textContent = 'Tu contrato se está creando';
    q('#ctr-load-p').innerHTML = 'Por favor <b>no salgas de esta vista</b> antes de finalizar ✈️🤩';
    q('#ctr-load-paso').textContent = PASOS[0];

    /* La barra avanza sola y se va frenando: nunca llega al 100 % hasta que
       el servidor responde, así no promete un final que no controla. */
    CREANDO.pct = 0;
    var paso = 0;
    q('#ctr-load-bar').style.width = '0%';
    CREANDO.t = setInterval(function () {
      CREANDO.pct += Math.max(0.4, (92 - CREANDO.pct) / 22);
      if (CREANDO.pct > 92) CREANDO.pct = 92;
      q('#ctr-load-bar').style.width = CREANDO.pct.toFixed(1) + '%';
      var quiero = Math.min(PASOS.length - 1, Math.floor(CREANDO.pct / 16));
      if (quiero !== paso) { paso = quiero; q('#ctr-load-paso').textContent = PASOS[paso]; }
    }, 260);

    CREANDO.guard = noSalir;
    window.addEventListener('beforeunload', CREANDO.guard);
  }

  function pararCreando() {
    if (CREANDO.t) { clearInterval(CREANDO.t); CREANDO.t = null; }
    if (CREANDO.guard) { window.removeEventListener('beforeunload', CREANDO.guard); CREANDO.guard = null; }
  }

  function cerrarCreando() {
    pararCreando();
    var caja = q('#ctr-load');
    if (caja) { caja.classList.add('hidden'); caja.classList.remove('listo'); }
  }

  /* Aviso de que YA ESTÁ: la misma ventana cambia a verde antes de dar paso
     a la pantalla del contrato firmado. */
  function creandoListo() {
    return new Promise(function (res) {
      pararCreando();
      var caja = q('#ctr-load');
      if (!caja || caja.classList.contains('hidden')) return res();
      caja.classList.add('listo');
      q('#ctr-load-bar').style.width = '100%';
      q('#ctr-load-t').textContent = '¡Listo! Tu contrato ya está creado';
      q('#ctr-load-p').innerHTML = 'Te enviamos una copia en PDF a tu correo 🎉';
      q('#ctr-load-paso').textContent = 'Firmado correctamente ✅';
      setTimeout(function () { cerrarCreando(); res(); }, 1900);
    });
  }

  /* ---------------- envío ---------------- */
  /* Llega aquí solo desde el RESUMEN, así que los datos ya están
     validados y las firmas guardadas: aquí solo se manda. */
  async function enviar() {
    if (S.enviando) return;
    var f = S.form || {};

    S.enviando = true;
    var btn = q('#ctr-enviar'); if (btn) { btn.disabled = true; btn.textContent = 'Firmando…'; }
    abrirCreando();
    try {
      var res = await apiPost('firmarContrato', Object.assign(cred_(), {
        documento: f.documento, nacimiento: f.nacimiento, direccion: f.direccion,
        universidad: f.universidad, deudor: f.deudor, cedula: f.cedula,
        documentoUrl: S.docUrl, cedulaUrl: S.cedUrl,
        firmaEst: S.pngs.est, firmaDeu: S.pngs.deu, acepta: true
      }));
      await creandoListo();
      pintarListo(res.url);
      /* Refresco CALLADO de los datos del estudiante. Antes se llamaba a
         hacerLogin_, que hace showView('home') y se llevaba por delante la
         pantalla de "contrato firmado" recién pintada. */
      try {
        var datos = await apiPost('loginEstudiante', { clave: cred_().clave }, { silent: true });
        EST = datos;
        renderHome_();
      } catch (e) { /* el inicio se refresca solo al volver */ }
    } catch (e) {
      cerrarCreando();
      error_(e.message || e);
      if (q('#ctr-enviar')) { q('#ctr-enviar').disabled = false; q('#ctr-enviar').textContent = '✍️ Firmar y enviar'; }
    } finally {
      S.enviando = false;
    }
  }

  function pintarListo(url) {
    q('#ctr-sub').textContent = 'Contrato firmado';
    q('#ctr-cont').innerHTML = '' +
      '<div class="card ctr-listo">' +
      '  <div class="ctr-ok-ic">🎉</div>' +
      '  <h2 style="justify-content:center">¡Tu contrato quedó firmado!</h2>' +
      '  <p class="muted center">Te enviamos una copia en PDF a tu correo. Nuestro equipo revisará tus documentos y te avisará el siguiente paso.</p>' +
      '  <a class="btn btn-accent btn-block" href="' + esc(url) + '" target="_blank" rel="noopener" style="margin-top:10px">⬇️ Descargar mi contrato</a>' +
      '  <button class="btn btn-ghost btn-block" id="ctr-fin" style="margin-top:8px">Volver al inicio</button>' +
      '</div>';
    q('#ctr-fin').addEventListener('click', function () { showView('home'); });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ---------------- arranque ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('ctr-salir');
    if (b) b.addEventListener('click', volverInicio);
    var x = document.getElementById('ctr-visor-close');
    if (x) x.addEventListener('click', cerrarVisor);
    var v = document.getElementById('ctr-visor');
    if (v) v.addEventListener('click', function (e) { if (e.target && e.target.id === 'ctr-visor') cerrarVisor(); });
  });

  return { tarjeta: tarjeta, bind: bind, abrir: abrir };
})();
