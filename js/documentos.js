/* ============================================================
 * SEP COLOMBIA — ZONA DE ESTUDIANTES · MIS DOCUMENTOS
 * FASE 4 · ENTREGA 6 (04/09/2026)
 * ------------------------------------------------------------
 * © Oscar Polanía — Experto en Soluciones Digitales · +57 310 323 0712
 * Software propietario; cualquier modificación por terceros anula
 * la garantía de funcionamiento.
 * ------------------------------------------------------------
 * Puntos 4.9 y 4.10 del plan.
 *
 *   · Los DIEZ documentos en un solo lugar, en el orden del pliego.
 *   · Solo PDF.
 *   · Después de Guardar, el participante NO puede reemplazar el
 *     archivo. Si Procesos le pide corrección, ese documento —y solo
 *     ese— se reabre, y al volver a guardar se bloquea otra vez.
 *   · La cédula y la hoja de vida solo se visualizan y descargan.
 *
 * QUIÉN DECIDE
 *   El backend (Documentos.gs) manda cada documento con su estado y
 *   con `puedeSubir`. Esta pantalla no calcula ninguna regla: si
 *   `puedeSubir` es falso, no hay botón de subir y punto.
 *
 * CARGA
 *   Esqueleto al abrir la vista; el aviso del avión (el mismo del
 *   contrato y del formulario) mientras sube el archivo, que es la
 *   única espera larga. No se inventa otro efecto.
 * ============================================================ */
(function () {
  'use strict';

  var S = { datos: null, maxMb: 5 };

  function q(s, c) { return (c || document).querySelector(s); }
  function qq(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return (typeof escapeHtml_ === 'function') ? escapeHtml_(s) : String(s == null ? '' : s); }
  function cred() { return (typeof cred_ === 'function') ? cred_() : {}; }

  function pintarEsqueleto() {
    if (window.SEPEsqueleto && typeof window.SEPEsqueleto.pintar === 'function') {
      return window.SEPEsqueleto.pintar('doc-cont', 'lectura') || function () {};
    }
    return function () {};
  }

  /* ============================================================
     ABRIR
     ============================================================ */
  function abrir() {
    var quitar = pintarEsqueleto();
    q('#doc-sub').textContent = 'Cargando tus documentos…';
    showView('documentos');

    apiPost('misDocumentos', cred()).then(function (r) {
      S.datos = r;
      S.maxMb = r.maxMb || 5;
      quitar();
      pintar();
    }, function (e) {
      quitar();
      showView('home');
      if (typeof error_ === 'function') error_(e.message || e);
    });
  }

  /* ============================================================
     PINTADO
     ============================================================ */
  function pintar() {
    var lista = (S.datos && S.datos.documentos) || [];
    var porCorregir = lista.filter(function (d) { return d.estado === 'CORRECCION'; }).length;
    var pendientes  = lista.filter(function (d) { return d.estado === 'PENDIENTE'; }).length;

    q('#doc-sub').textContent = pendientes || porCorregir
      ? (pendientes + porCorregir) + ' por cargar'
      : 'Todos al día';

    var aviso = '' +
      '<div class="doc-aviso">' +
      '  📄 Todos los documentos se cargan en <b>PDF</b> y pesan máximo <b>' + S.maxMb + ' MB</b>. ' +
      '  Una vez guardas uno, ya no se puede reemplazar: si necesitas cambiarlo, tu asesor(a) de Procesos ' +
      '  te lo reabre.' +
      '</div>';

    q('#doc-cont').innerHTML = aviso + lista.map(item).join('');
    cablear();
  }

  function item(d) {
    var acciones = [];

    if (d.tieneArchivo) {
      acciones.push('<button class="btn btn-ghost" data-ver="' + esc(d.clave) + '">👁 Ver</button>');
      acciones.push('<a class="btn btn-ghost" href="' + esc(bajar(d.url)) + '" target="_blank" rel="noopener">⬇️ Descargar</a>');
    }
    if (d.puedeSubir) {
      acciones.push('<button class="btn btn-accent" data-subir="' + esc(d.clave) + '">' +
                    (d.estado === 'CORRECCION' ? '↩️ Volver a cargar' : '⬆️ Cargar PDF') + '</button>');
    }

    return '' +
      '<div class="doc-item" data-doc="' + esc(d.clave) + '">' +
      '  <div class="doc-top">' +
      '    <span class="doc-ic">' + esc(d.estadoIc) + '</span>' +
      '    <span class="doc-x">' +
      '      <span class="doc-name">' + esc(d.nombre) + '</span>' +
             (d.ayuda ? '<span class="doc-ay">' + esc(d.ayuda) + '</span>' : '') +
      '      <span class="doc-pill" style="background:' + esc(d.estadoColor) + '">' + esc(d.estadoLabel) + '</span>' +
      '    </span>' +
      '  </div>' +
      (d.estado === 'CORRECCION' && d.nota
        ? '  <div class="doc-nota"><b>Qué debes corregir</b>' + esc(d.nota) + '</div>'
        : '') +
      (d.estado === 'NO_DISPONIBLE' && !d.auto && !d.soloVer
        ? '  <p class="muted" style="margin:10px 0 0">Este documento todavía no está habilitado. ' +
          'Tu asesor(a) de Procesos lo abrirá cuando te toque cargarlo.</p>'
        : '') +
      (acciones.length ? '  <div class="doc-acc">' + acciones.join('') + '</div>' : '') +
      '  <input type="file" accept="application/pdf,.pdf" class="doc-file" data-file="' + esc(d.clave) + '">' +
      '</div>';
  }

  function bajar(url) {
    var m = String(url || '').match(/[-\w]{25,}/);
    return m ? 'https://drive.google.com/uc?export=download&id=' + m[0] : String(url || '');
  }

  function doc(clave) {
    var l = (S.datos && S.datos.documentos) || [];
    for (var i = 0; i < l.length; i++) if (l[i].clave === clave) return l[i];
    return null;
  }

  /* ============================================================
     CABLEADO
     ============================================================ */
  function cablear() {
    qq('#doc-cont [data-ver]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = doc(b.dataset.ver);
        if (!d || !d.url) return;
        if (typeof CONTRATO !== 'undefined' && CONTRATO.visor) CONTRATO.visor(d.url, d.nombre);
        else window.open(d.url, '_blank');
      });
    });

    qq('#doc-cont [data-subir]').forEach(function (b) {
      b.addEventListener('click', function () {
        var inp = q('#doc-cont [data-file="' + b.dataset.subir + '"]');
        if (inp) inp.click();
      });
    });

    qq('#doc-cont [data-file]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0];
        inp.value = '';
        if (f) subir(inp.dataset.file, f);
      });
    });
  }

  /* ============================================================
     SUBIDA
     ============================================================
     La validación de verdad la hace el backend (extensión, tipo y
     firma del contenido). Aquí solo se atajan los dos errores
     evidentes para no gastarle la subida al participante.        */
  function subir(clave, file) {
    var d = doc(clave);
    if (!d) return;

    var nombre = String(file.name || '');
    if (!/\.pdf$/i.test(nombre)) {
      return Swal.fire({ icon: 'warning', title: 'Solo PDF',
        text: d.nombre + ' debe ser un archivo PDF.' });
    }
    if (file.size > S.maxMb * 1024 * 1024) {
      return Swal.fire({ icon: 'warning', title: 'Archivo muy pesado',
        text: 'El archivo pesa más de ' + S.maxMb + ' MB. Compáctalo antes de subirlo.' });
    }

    Swal.fire({
      icon: 'question',
      title: '¿Guardar este documento?',
      html: '<b style="color:#263143">' + esc(d.nombre) + '</b><br>' +
            '<span style="color:#44546b">Una vez guardado no podrás reemplazarlo. ' +
            'Revisa que sea el archivo correcto.</span>',
      showCancelButton: true, confirmButtonText: 'Sí, guardar', cancelButtonText: 'Volver'
    }).then(function (r) {
      if (!r.isConfirmed) return;
      leer(file).then(function (base64) {
        var carga = (typeof CONTRATO !== 'undefined' && CONTRATO.cargando) ? CONTRATO.cargando : null;
        if (carga) carga.abrir({
          titulo: 'Estamos guardando tu documento',
          sub: 'Por favor <b>no salgas de esta vista</b> antes de finalizar ✈️',
          pasos: ['Revisando el archivo…', 'Guardándolo de forma segura…', 'Registrando tu documento…'],
          salir: 'Tu documento se está guardando. Si sales ahora, no quedará cargado.'
        });

        apiPost('subirDocumento', Object.assign(cred(), {
          doc: clave, filename: nombre, mime: file.type || 'application/pdf', base64: base64
        })).then(function (res) {
          S.datos = res;
          var fin = carga
            ? carga.listo({ titulo: '¡Listo! Tu documento quedó guardado',
                            sub: 'Queda en revisión. Te avisaremos cuando lo aprobemos 🎉',
                            paso: 'Cargado correctamente ✅' })
            : Promise.resolve();
          fin.then(function () {
            pintar();
            refrescarInicio();
          });
        }, function (e) {
          if (carga) carga.cerrar();
          if (typeof error_ === 'function') error_(e.message || e);
        });
      }, function () {
        Swal.fire({ icon: 'error', title: 'Ups', text: 'No se pudo leer el archivo.' });
      });
    });
  }

  function leer(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1]); };
      r.onerror = function () { rej(new Error('No se pudo leer el archivo')); };
      r.readAsDataURL(file);
    });
  }

  /* Cargar un documento cambia las acciones pendientes del inicio, así
     que se refresca el estudiante en silencio (una sola llamada). */
  function refrescarInicio() {
    apiPost('loginEstudiante', cred()).then(function (data) {
      if (typeof aplicarEstudiante_ === 'function') aplicarEstudiante_(data);
    }, function () { /* si falla, el inicio se actualiza al volver a entrar */ });
  }

  var salir = document.getElementById('doc-salir');
  if (salir) salir.addEventListener('click', function () { showView('home'); });

  window.DOCUMENTOS = { abrir: abrir, _pintar: pintar, _item: item, _estado: S };
})();
