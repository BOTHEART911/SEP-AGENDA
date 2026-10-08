/* ============================================================
 * SEP COLOMBIA — ZONA DE ESTUDIANTES · MÓDULO VISA
 * FASE 5 · SUBFASE 5.3 · ENTREGA A (08/10/2026)
 * ------------------------------------------------------------
 * © Oscar Polanía — Experto en Soluciones Digitales · +57 310 323 0712
 * Software propietario; cualquier modificación por terceros anula
 * la garantía de funcionamiento.
 * ------------------------------------------------------------
 * QUÉ HACE (pliego 5.3.1 a 5.3.3)
 *   · Muestra el estado actual, la acción futura y el resultado
 *     consular del participante.
 *   · Los 6 pasos de la visa, en orden: el que toca se abre solo; los
 *     hechos se pueden volver a consultar; los siguientes quedan con
 *     candado hasta completar el anterior.
 *   · Video incrustado de YouTube SIN enlace visible (al portal solo
 *     llega el ID del video) y el aviso de contenido privado.
 *
 * QUIÉN DECIDE QUÉ
 *   El backend (VisaPortal.gs) manda el módulo ya resuelto dentro del
 *   tablero del login (EST.portal.visa): qué paso toca, cuál está
 *   hecho, qué video va. Aquí solo se pinta y se envía lo que el
 *   participante escribe. Cero lecturas extra: la vista abre al
 *   instante con lo que ya está en memoria.
 *
 * ESCRITURA
 *   Botón ocupado + escudo desde el primer toque, id de petición (rid)
 *   y un solo reintento seguro (apiPost con {escritura:true}). La
 *   respuesta trae el módulo nuevo y se parcha en memoria: no se
 *   recarga el tablero. Si mientras tanto cambió la sesión, la
 *   respuesta vieja se descarta.
 * ============================================================ */
(function () {
  'use strict';

  var S = { abierto: 0, ocupado: false };

  function q(s, c) { return (c || document).querySelector(s); }
  function qq(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return (typeof escapeHtml_ === 'function') ? escapeHtml_(s) : String(s == null ? '' : s); }
  function visa() { return (typeof EST !== 'undefined' && EST && EST.portal && EST.portal.visa) || null; }

  /* 'yyyy-mm-dd HH:mm' → 'mar 3 nov 2026 · 8:00 a. m.' */
  function fechaBonita(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/.exec(String(s || ''));
    if (!m) return String(s || '');
    var d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    var f = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    if (m[4] === undefined) return f;
    return f + ' · ' + d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  }
  function aInput(s) { return String(s || '').replace(' ', 'T').slice(0, 16); }

  /* ============================================================
     PINTADO
     ============================================================ */
  function cabecera(v) {
    var e = v.estado || null;
    var html = '<div class="card vs-head">';
    if (e) {
      html += '' +
        '<div class="vs-est">' +
        '  <span class="vs-est-ic" style="background:' + esc(e.color) + '1f;color:' + esc(e.color) + '">' + esc(e.ic) + '</span>' +
        '  <div class="vs-est-x">' +
        '    <div class="vs-k">Tu estado actual</div>' +
        '    <div class="vs-est-t">' + esc(e.nombre) + '</div>' +
        '  </div>' +
        '</div>' +
        '<div class="vs-sig"><span class="vs-k">Lo que sigue</span><b>' + esc(e.accion) + '</b></div>';
    }
    if (v.resultado) {
      html += '<div class="vs-res vs-res-' + esc(v.resultado.k.toLowerCase()) + '">' +
              '<span>' + esc(v.resultado.ic) + '</span> Resultado consular: <b>' + esc(v.resultado.l) + '</b></div>';
    }
    if (v.habilitado && v.pasos) {
      var n = Number(v.completados || 0);
      html += '<div class="vs-prog"><div class="vs-prog-t"><span>Asesoría de Visa</span><b>' + n + ' de 6</b></div>' +
              '<div class="vs-bar"><i style="width:' + Math.round(n / 6 * 100) + '%"></i></div></div>';
    }
    return html + '</div>';
  }

  function chipEstado(p) {
    if (p.estado === 'hecho') return '<span class="vs-chip ok">✓ Completado</span>';
    if (p.estado === 'activo') return '<span class="vs-chip act">Te toca</span>';
    return '<span class="vs-chip off">🔒</span>';
  }

  /* El reproductor se crea SOLO al abrir el paso (no carga seis videos
     de una) y se destruye al cerrarlo. */
  function bloqueVideo(p, v) {
    if (!p.yt) return '<div class="vs-video vs-video-vacio"><span>🎬</span><p>El video de este paso estará disponible pronto.</p></div>';
    return '<div class="vs-video" data-yt="' + esc(p.yt) + '"><div class="vs-video-ph">▶</div></div>' +
           '<p class="vs-priv">🔒 ' + esc(v.aviso || '') + '</p>';
  }

  function formPaso(p, v) {
    if (p.pide === 'cita') {
      var c = v.cita || {};
      var hecho = p.estado === 'hecho';
      var html = '<div class="vs-ds"><span class="vs-k">Número DS-160 para solicitar tu cita</span>' +
                 '<b class="vs-num">' + esc(v.ds160Int || '—') + '</b></div>';
      if (hecho && !v.citaEditable) {
        return html + '<div class="vs-dato"><span>CAS</span><b>' + esc(fechaBonita(c.cas)) + '</b></div>' +
                      '<div class="vs-dato"><span>Consulado</span><b>' + esc(fechaBonita(c.consul)) + '</b></div>' +
                      '<p class="vs-nota">Tu carpeta ya fue entregada. Si cambió tu cita, avísale a tu asesor(a).</p>';
      }
      return html +
        '<label class="vs-lab">Fecha y hora de tu cita en el CAS' +
        '  <input type="datetime-local" class="vs-in" id="vs-cas" value="' + esc(aInput(c.cas)) + '"></label>' +
        '<label class="vs-lab">Fecha y hora de tu cita en el Consulado' +
        '  <input type="datetime-local" class="vs-in" id="vs-consul" value="' + esc(aInput(c.consul)) + '"></label>' +
        '<button class="btn btn-accent btn-block vs-go" data-paso="1">' + (hecho ? '💾 Actualizar mis fechas' : '🗓️ Registrar mi cita') + '</button>';
    }
    if (p.pide === 'ds160r') {
      var av = p.aviso ? '<div class="vs-alerta">⚠️ ' + esc(p.aviso) + '</div>' : '';
      if (p.estado === 'hecho') {
        return av + '<div class="vs-ds"><span class="vs-k">Tu número DS-160</span><b class="vs-num">' + esc(v.ds160r) + '</b></div>' +
               '<p class="vs-nota">Si hay un error en el número, tu asesor(a) de Procesos lo corrige.</p>';
      }
      return av +
        '<label class="vs-lab">Número de confirmación de tu DS-160' +
        '  <input type="text" class="vs-in" id="vs-ds160" maxlength="30" autocomplete="off" autocapitalize="characters" placeholder="Ej: AA00XXXXXX"></label>' +
        '<button class="btn btn-accent btn-block vs-go" data-paso="2">💾 Guardar mi número</button>';
    }
    /* Confirmaciones (pasos 3 a 6). */
    if (p.estado === 'hecho') {
      return '<div class="vs-ok">✅ ' + esc(p.conf || 'Confirmado') + (p.fecha ? '<br><small>' + esc(p.fecha) + '</small>' : '') + '</div>';
    }
    return '<label class="vs-check"><input type="checkbox" id="vs-conf-' + p.n + '"> <span>' + esc(p.conf) + '</span></label>' +
           '<button class="btn btn-accent btn-block vs-go" data-paso="' + p.n + '" disabled>Continuar</button>';
  }

  function tarjetaPaso(p, v) {
    var abierto = S.abierto === p.n && p.estado !== 'bloqueado';
    var html = '<div class="vs-paso vs-' + p.estado + (abierto ? ' open' : '') + '" data-n="' + p.n + '">' +
      '<button class="vs-paso-h" type="button">' +
      '  <span class="vs-paso-num">' + (p.estado === 'hecho' ? '✓' : p.n) + '</span>' +
      '  <span class="vs-paso-x"><span class="vs-paso-k">Paso ' + p.n + '</span>' +
      '    <span class="vs-paso-t">' + esc(p.ic) + ' ' + esc(p.t) + '</span></span>' +
      chipEstado(p) +
      '</button>';
    if (abierto) {
      html += '<div class="vs-paso-b">' +
        bloqueVideo(p, v) +
        (p.texto ? '<p class="vs-txt">' + esc(p.texto) + '</p>' : '') +
        formPaso(p, v) +
        '</div>';
    }
    return html + '</div>';
  }

  function render() {
    var v = visa();
    var html = '';
    if (!v) {
      html = '<div class="card"><p class="muted center" style="padding:10px 0">El módulo Visa todavía no está disponible.</p></div>';
    } else {
      html = cabecera(v);
      if (!v.habilitado) {
        html += '<div class="card vs-bloq"><div class="vs-bloq-ic">🔒</div><p>' + esc(v.mensaje) + '</p></div>';
      } else {
        if (v.espera) html += '<div class="vs-espera">⏳ ' + esc(v.espera) + '</div>';
        html += '<div class="vs-pasos">' + (v.pasos || []).map(function (p) { return tarjetaPaso(p, v); }).join('') + '</div>';
      }
    }
    var cont = q('#pt-cont');
    cont.innerHTML = html;
    bind(cont, v);
  }

  /* El reproductor: youtube-nocookie, sin videos relacionados de otros
     canales, sin anotaciones. El enlace nunca aparece en pantalla. */
  function montarVideo(caja) {
    var id = caja.getAttribute('data-yt');
    if (!/^[\w-]{11}$/.test(id)) return;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3';
    f.title = 'Video del paso';
    f.loading = 'lazy';
    f.setAttribute('allow', 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    caja.innerHTML = '';
    caja.appendChild(f);
  }

  function bind(cont, v) {
    /* Sin menú contextual sobre el video (no expone el enlace). */
    qq('.vs-video', cont).forEach(function (c) {
      c.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
      if (c.getAttribute('data-yt')) montarVideo(c);
    });

    qq('.vs-paso-h', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var caja = b.parentNode;
        var n = Number(caja.getAttribute('data-n'));
        if (caja.classList.contains('vs-bloqueado')) {
          Swal.fire({ icon: 'info', title: 'Paso ' + n,
            text: n === 1 ? 'Se abre cuando tu asesor(a) de Procesos registre tu DS-160 interno.'
                          : 'Primero completa el Paso ' + (n - 1) + '.' });
          return;
        }
        S.abierto = (S.abierto === n) ? 0 : n;
        render();
        var abierto = q('.vs-paso.open');
        if (abierto && abierto.scrollIntoView) abierto.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    });

    qq('.vs-check input', cont).forEach(function (chk) {
      chk.addEventListener('change', function () {
        var btn = chk.closest('.vs-paso-b').querySelector('.vs-go');
        if (btn && !S.ocupado) btn.disabled = !chk.checked;
      });
    });

    qq('.vs-go', cont).forEach(function (btn) {
      btn.addEventListener('click', function () { enviar(Number(btn.getAttribute('data-paso')), btn); });
    });
  }

  /* ============================================================
     ENVÍO
     ============================================================ */
  function datosPaso(n) {
    if (n === 1) {
      var cas = (q('#vs-cas') || {}).value || '', consul = (q('#vs-consul') || {}).value || '';
      if (!cas || !consul) return { error: 'Escribe la fecha y la hora de tus dos citas (CAS y Consulado).' };
      if (cas > consul) return { error: 'La cita del CAS va antes (o el mismo día) que la del Consulado.' };
      return { cas: cas, consul: consul };
    }
    if (n === 2) {
      var num = String((q('#vs-ds160') || {}).value || '').toUpperCase().replace(/[\s-]/g, '');
      if (!num) return { error: 'Escribe el número de confirmación de tu DS-160.' };
      if (!/^[A-Z0-9]{8,30}$/.test(num)) return { error: 'Revisa el número: solo letras y números (mínimo 8).' };
      return { ds160r: num };
    }
    var chk = q('#vs-conf-' + n);
    if (!chk || !chk.checked) return { error: 'Marca la casilla de confirmación para continuar.' };
    return { confirmo: true };
  }

  async function enviar(n, btn) {
    if (S.ocupado) return;                         // escudo: nada de doble envío
    var datos = datosPaso(n);
    if (datos.error) { Swal.fire({ icon: 'warning', title: 'Falta algo', text: datos.error }); return; }

    if (n === 2) {
      var ok = await Swal.fire({ icon: 'question', title: '¿Tu número es ' + datos.ds160r + '?',
        text: 'Después de guardarlo solo tu asesor(a) de Procesos lo puede corregir.',
        showCancelButton: true, confirmButtonText: 'Sí, guardar', cancelButtonText: 'Revisar' });
      if (!ok.isConfirmed) return;
    }

    S.ocupado = true;
    var txt = btn.innerHTML;
    btn.disabled = true; btn.classList.add('ocupado'); btn.innerHTML = 'Guardando…';
    qq('.vs-go').forEach(function (b) { b.disabled = true; });
    var claveDespacho = cred_().clave;             // la sesión se toma al despachar
    var t0 = performance.now();
    try {
      var res = await apiPost('visaPaso', Object.assign(cred_(), { paso: n }, datos), { escritura: true });
      if (typeof medAnotarFront_ === 'function') medAnotarFront_('visaPaso', performance.now() - t0, 0, '');
      if (cred_().clave !== claveDespacho) return;   // sesión vieja: no pisa la nueva
      parchar(res && res.visa);
      var v = visa();
      var sig = v && v.pasos ? v.pasos.find(function (p) { return p.estado === 'activo'; }) : null;
      S.abierto = sig ? sig.n : 0;
      render();
      toast_('success', n === 6 ? '¡Asesoría de Visa completada!' : (res && res.yaEstaba ? 'Ya estaba guardado' : 'Guardado'));
    } catch (e) {
      btn.innerHTML = txt;
      error_(e && e.message);
    } finally {
      S.ocupado = false;
      var b2 = q('.vs-go[data-paso="' + n + '"]');
      if (b2) { b2.classList.remove('ocupado'); }
      qq('.vs-go').forEach(function (b) {
        var chk = q('#vs-conf-' + b.getAttribute('data-paso'));
        b.disabled = chk ? !chk.checked : false;
      });
    }
  }

  /* Parche en memoria: el módulo, su tarjeta y la acción pendiente. */
  function parchar(nueva) {
    if (!nueva || typeof EST === 'undefined' || !EST || !EST.portal) return;
    EST.portal.visa = nueva;
    var mods = EST.portal.modulos || [];
    mods.forEach(function (m) { if (m.clave === 'VISA') { m.habilitado = !!nueva.habilitado; m.mensaje = nueva.mensaje || ''; } });
    var pend = (EST.portal.pendientes || []).filter(function (a) { return a.clave !== 'VISA'; });
    var act = nueva.habilitado && nueva.pasos ? nueva.pasos.find(function (p) { return p.estado === 'activo'; }) : null;
    if (act) {
      pend.push({ clave: 'VISA', titulo: 'Visa · Paso ' + act.n + ': ' + act.t, ic: '🛂', accion: 'visa',
        texto: act.pide === 'cita' ? 'Agenda tus citas y registra las fechas.'
             : act.pide === 'ds160r' ? 'Diligencia tu DS-160 y registra el número.' : 'Mira el video y confirma.' });
    }
    EST.portal.pendientes = pend;
    /* El inicio queda al día por debajo (sin viajar al servidor). */
    try { if (typeof renderHome_ === 'function') renderHome_(); } catch (_) {}
  }

  function abrir() {
    var v = visa();
    var act = v && v.pasos ? v.pasos.find(function (p) { return p.estado === 'activo'; }) : null;
    S.abierto = act ? act.n : 0;
    q('#pt-sub').textContent = 'Tu proceso de visa';
    q('#pt-title').textContent = 'Visa';
    render();
    showView('portal');
  }

  window.VISA = {
    abrir: abrir,
    /* Puertas para las pruebas automatizadas. */
    _estado: S, _render: render, _parchar: parchar, _datos: datosPaso, _fecha: fechaBonita
  };
})();
