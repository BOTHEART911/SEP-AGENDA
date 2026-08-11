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
    enviando: false
  };

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
  async function abrir() {
    try {
      S.estado = await apiPost('contratoEstado', cred_());
      if (!S.estado.habilitado) return error_(S.estado.mensaje || 'Tu contrato todavía no está disponible.');
      if (!S.estado.puedeFirmar) return error_('Tu contrato ya fue validado. Escríbele a tu asesor(a) si necesitas un cambio.');
      MAX_MB = S.estado.maxMb || 5;

      var r = await apiPost('contratoTexto', cred_());
      S.bloques = r.bloques || [];
      if (!S.bloques.length) return error_('No pudimos cargar el texto del contrato. Intenta de nuevo.');

      S.idx = 0; S.acepto = false; S.firmas = {};
      S.docUrl = S.estado.datos.documentoUrl || '';
      S.cedUrl = S.estado.datos.cedulaUrl || '';
      pintarLectura();
      showView('contrato');
    } catch (e) { error_(e.message || e); }
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
  function pintarFormulario() {
    var d = S.estado.datos || {};
    q('#ctr-sub').textContent = 'Tus datos y firmas';
    q('#ctr-bar').style.width = '100%';

    q('#ctr-cont').innerHTML = '' +
      '<div class="card">' +
      '  <h2><span class="em">🧾</span> Tus datos</h2>' +
      '  <div class="ctr-f"><label>Nombre completo</label>' +
      '    <input type="text" value="' + esc((d.nombres || '') + ' ' + (d.apellidos || '')) + '" disabled></div>' +
      '  <div class="ctr-f"><label>Número de documento</label>' +
      '    <input id="f-doc" type="tel" inputmode="numeric" maxlength="10" placeholder="Solo números" value="' + esc(d.documento || '') + '"></div>' +
      '  <div class="ctr-f"><label>Fecha de nacimiento</label>' +
      '    <input id="f-nac" type="date" min="' + limiteNac_(28) + '" max="' + limiteNac_(17) + '" value="' + esc(d.nacimiento || '') + '"></div>' +
      '  <div class="ctr-f"><label>Dirección de domicilio</label>' +
      '    <input id="f-dir" type="text" placeholder="Calle 00 # 00-00, ciudad" value="' + esc(d.direccion || '') + '"></div>' +
      '  <div class="ctr-f"><label>Tu documento en PDF <span class="ctr-max">(máx. ' + MAX_MB + ' MB)</span></label>' +
      '    <label class="ctr-file"><span id="f-doc-txt">' + (S.docUrl ? '✅ Documento cargado — cambiar' : '⬆️ Subir mi documento') + '</span>' +
      '      <input type="file" id="f-doc-file" accept="application/pdf,image/*" hidden></label></div>' +
      '</div>' +

      '<div class="card">' +
      '  <h2><span class="em">🤝</span> Tu deudor solidario</h2>' +
      '  <div class="ctr-f"><label>Nombre completo del deudor</label>' +
      '    <input id="f-deu" type="text" placeholder="Nombres y apellidos" value="' + esc(d.deudor || '') + '"></div>' +
      '  <div class="ctr-f"><label>Cédula del deudor</label>' +
      '    <input id="f-ced" type="tel" inputmode="numeric" maxlength="10" placeholder="Solo números" value="' + esc(d.cedula || '') + '"></div>' +
      '  <div class="ctr-f"><label>Cédula del deudor en PDF <span class="ctr-max">(máx. ' + MAX_MB + ' MB)</span></label>' +
      '    <label class="ctr-file"><span id="f-ced-txt">' + (S.cedUrl ? '✅ Cédula cargada — cambiar' : '⬆️ Subir la cédula') + '</span>' +
      '      <input type="file" id="f-ced-file" accept="application/pdf,image/*" hidden></label></div>' +
      '</div>' +

      '<div class="card">' +
      '  <h2><span class="em">✍️</span> Firmas</h2>' +
      '  <p class="muted">Dibuja las firmas con el dedo o el mouse. Quedarán tal cual en el contrato.</p>' +
      firmaHtml('est', 'Firma del estudiante') +
      firmaHtml('deu', 'Firma del deudor solidario') +
      '</div>' +

      '<div class="ctr-nav">' +
      '  <button class="btn btn-ghost" id="ctr-volver-lect">← Volver a leer</button>' +
      '  <button class="btn btn-accent" id="ctr-enviar">Firmar y enviar</button>' +
      '</div>' +
      '<p class="muted center" style="margin:10px 0 0">Al enviar, generamos tu contrato en PDF y te lo mandamos por correo.</p>';

    window.scrollTo({ top: 0, behavior: 'auto' });

    prepararFirma('est'); prepararFirma('deu');
    q('#f-doc').addEventListener('input', function (e) { e.target.value = soloDig(e.target.value); });
    q('#f-ced').addEventListener('input', function (e) { e.target.value = soloDig(e.target.value); });
    q('#f-doc-file').addEventListener('change', function (ev) { subir(ev, 'documento'); });
    q('#f-ced-file').addEventListener('change', function (ev) { subir(ev, 'cedula'); });
    q('#ctr-volver-lect').addEventListener('click', function () { pintarLectura(); });
    q('#ctr-enviar').addEventListener('click', enviar);
  }

  /* Topes de la fecha de nacimiento: el programa va de 17 a 28 años. */
  function limiteNac_(anios) {
    var h = new Date();
    var d = new Date(h.getFullYear() - anios, h.getMonth(), h.getDate());
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
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
    });
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
    var etiqueta = tipo === 'documento' ? q('#f-doc-txt') : q('#f-ced-txt');
    if (file.size > MAX_MB * 1024 * 1024) {
      ev.target.value = '';
      return aviso('El archivo pesa más de ' + MAX_MB + ' MB. Comprímelo o toma una foto más liviana.');
    }
    try {
      etiqueta.textContent = '⏳ Subiendo…';
      var base64 = await leerArchivo_(file);
      var res = await apiPost('contratoArchivo', Object.assign(cred_(), {
        tipo: tipo, filename: file.name, mime: file.type, base64: base64,
        documento: soloDig(q('#f-doc').value)
      }));
      if (tipo === 'documento') S.docUrl = res.url; else S.cedUrl = res.url;
      etiqueta.textContent = '✅ ' + (tipo === 'documento' ? 'Documento cargado' : 'Cédula cargada') + ' — cambiar';
      toast_('success', 'Archivo cargado');
    } catch (e) {
      etiqueta.textContent = tipo === 'documento' ? '⬆️ Subir mi documento' : '⬆️ Subir la cédula';
      error_(e.message || e);
    } finally { ev.target.value = ''; }
  }

  /* ---------------- envío ---------------- */
  async function enviar() {
    if (S.enviando) return;

    var doc = soloDig(q('#f-doc').value);
    var nac = q('#f-nac').value;
    var dir = q('#f-dir').value.trim();
    var deu = q('#f-deu').value.replace(/\s+/g, ' ').trim();
    var ced = soloDig(q('#f-ced').value);

    if (doc.length < 6 || doc.length > 10) return aviso('Tu número de documento debe tener entre 6 y 10 dígitos.');
    if (!nac) return aviso('Selecciona tu fecha de nacimiento.');
    if (nac < limiteNac_(28) || nac > limiteNac_(17)) return aviso('La edad del programa va de 17 a 28 años. Revisa tu fecha de nacimiento.');
    if (dir.length < 5) return aviso('Escribe tu dirección de domicilio.');
    if (!S.docUrl) return aviso('Sube el PDF de tu documento.');
    if (deu.split(' ').filter(Boolean).length < 2) return aviso('Escribe el nombre completo de tu deudor solidario.');
    if (ced.length < 6 || ced.length > 10) return aviso('La cédula del deudor debe tener entre 6 y 10 dígitos.');
    if (ced === doc) return aviso('El deudor solidario debe ser una persona distinta a ti.');
    if (!S.cedUrl) return aviso('Sube el PDF de la cédula de tu deudor solidario.');

    var fEst = firmaPng('est');
    if (!fEst) return aviso('Falta tu firma.');
    var fDeu = firmaPng('deu');
    if (!fDeu) return aviso('Falta la firma de tu deudor solidario.');

    var conf = await Swal.fire({
      icon: 'question', title: '¿Firmar el contrato?',
      html: 'Se generará tu contrato en PDF con tus datos y tus firmas, y te llegará una copia por correo.',
      showCancelButton: true, confirmButtonText: 'Sí, firmar', cancelButtonText: 'Revisar'
    });
    if (!conf.isConfirmed) return;

    S.enviando = true;
    var btn = q('#ctr-enviar'); if (btn) btn.disabled = true;
    try {
      var res = await apiPost('firmarContrato', Object.assign(cred_(), {
        documento: doc, nacimiento: nac, direccion: dir,
        deudor: deu, cedula: ced,
        documentoUrl: S.docUrl, cedulaUrl: S.cedUrl,
        firmaEst: fEst, firmaDeu: fDeu, acepta: true
      }));
      pintarListo(res.url);
      try { await hacerLogin_(cred_().clave, true); } catch (e) { /* el home se refresca al volver */ }
    } catch (e) {
      error_(e.message || e);
    } finally {
      S.enviando = false;
      if (q('#ctr-enviar')) q('#ctr-enviar').disabled = false;
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
  });

  return { tarjeta: tarjeta, bind: bind, abrir: abrir };
})();
