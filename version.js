/* ============================================================
 * SEP-AGENDA — VERSIÓN
 * © Oscar Polanía — Experto en Soluciones Digitales · +57 310 323 0712
 * Software propietario; cualquier modificación por terceros anula la garantía.
 * ------------------------------------------------------------
 * ⚠️ ESTE ARCHIVO FALTABA EN EL REPOSITORIO. Se borró el 17/08/2026 y
 * no se volvió a subir, así que index.html lo pedía y no existía: el
 * pie decía "Versión —" y, sobre todo, la app dejó de limpiar la caché
 * y de recargarse sola en los dispositivos. Con este archivo de vuelta,
 * todo eso funciona otra vez.
 * ------------------------------------------------------------
 * RUEDAS iOS EN VEZ DE FECHAS DEL NAVEGADOR (10/10/2026 · 3).
 *   · Las citas del CAS y del Consulado (módulo Visa) se eligen en la
 *     rueda de la app, que ahora suma hora:minuto con a. m./p. m. Lo que
 *     viaja al backend no cambia ('aaaa-mm-ddTHH:MM').
 *   Archivos: index.html, js/formulario.js, js/visa.js,
 *   css/formulario.css, version.js.
 * ------------------------------------------------------------
 * FECHA Y HORA DE LA OFERTA (10/10/2026 · 2).
 *   · "Tu oferta de empleo" y el detalle ya no muestran el texto crudo
 *     del Date ("Wed Sep 16 2026 00:00:00 GMT-0500…"): el backend manda
 *     "16 de septiembre de 2026" y "1:18 p. m."; el front escribe
 *     "a la 1" / "a las 2" y se salta el conector si no hay hora.
 *   Archivos: js/ofertas.js, version.js.
 * ------------------------------------------------------------
 * ANCHO DE PANTALLA Y AVIÓN DE ESCRITURA (10/10/2026).
 *   · Monitores grandes: el inicio, Ofertas, Mis documentos y Recursos
 *     suman columnas del mismo tamaño (3 a 1560 px, 4 a 2040, 5 a 2520);
 *     la barra de arriba va al ancho del contenido. "Mi proceso" y "Mis
 *     documentos" dejan de ser una tira de 560 px. Teléfono sin cambios.
 *   · El avión (#ctr-load) pasa a ser la pieza única js/avion.js +
 *     css/avion.css, la misma de SEP-GROUP con el efecto de
 *     CONTRATISTA-FLANDES. CONTRATO.cargando sigue igual por fuera.
 *     Toda escritura abre el avión y viaja con su rid (antes la capa 5 se
 *     tragaba las opciones y ninguna escritura llevaba rid).
 *   Archivos: index.html, app.js, js/avion.js (nuevo), css/avion.css
 *   (nuevo), css/ancho.css (nuevo), js/contrato.js, js/formulario.js,
 *   js/capa-5-esqueletos.js, css/contrato.css, css/tema-oscuro.css,
 *   version.js.
 * ------------------------------------------------------------
 * AJUSTES FASE 5 · NOTAS DE JAVIER (09/10/2026).
 *   · Tarjeta RECURSOS en el portal: videos e información que publica
 *     SEP (llegan en el mismo viaje del login; el video se monta al
 *     tocarlo, directo de YouTube).
 *   · El tablero se pone al día solo cuando vuelves a la app o regresas
 *     al inicio (un documento rechazado aparece como acción pendiente
 *     sin cerrar sesión). Sin relojes.
 *   Archivos: app.js, js/portal.js, styles.css, version.js.
 * ------------------------------------------------------------
 * PRE-ARRIVAL Y VUELO (08/10/2026 · Fase 5.3-B).
 *   · Con la visa aprobada, el módulo Visa muestra el Pre-Arrival
 *     (video + confirmación) y el mensaje de la rifa: si cargas tu
 *     itinerario dentro de las 72 horas participas por un premio SEP.
 *   · Tu vuelo se carga ahí mismo, en imagen (pantallazo) o PDF; queda
 *     también en Mis documentos. Si SEP lo aprueba: Programa completado.
 *   · Mis documentos: al cargar, el inicio se actualiza en el mismo
 *     viaje (ya no hace una segunda consulta).
 *   Archivos: js/visa.js, css/visa.css, js/documentos.js, version.js.
 * ------------------------------------------------------------
 * MÓDULO VISA (08/10/2026 · Fase 5.3-A).
 *   · Nueva tarjeta "Visa" en Accesos rápidos: se ve desde la
 *     inscripción y se abre al quedar Contratado. Estado actual, lo que
 *     sigue, resultado consular y los 6 pasos con su video.
 *   Archivos: js/visa.js, css/visa.css, js/portal.js, index.html,
 *   version.js.
 * ------------------------------------------------------------
 * UNA SOLA RECARGA POR VERSIÓN (08/10/2026).
 *   · Al publicar, el aviso de versión nueva ya no puede recargar la
 *     app en bucle (app.js, checkVersion).
 * ------------------------------------------------------------
 * TUS DOCUMENTOS SON PRIVADOS (07/10/2026).
 *   · Tu contrato, cédula, comprobantes, formulario, Mis documentos y
 *     hoja de vida ya no se abren con solo tener el enlace: se abren
 *     con tu cuenta de Google (el correo con el que te registraste).
 *     El visor trae "Abrir en Drive" y una nota con tu correo. Si tu
 *     correo no es cuenta de Google, la app te lo explica.
 *   Archivos: app.js, index.html, css/contrato.css, js/contrato.js,
 *   js/formulario.js, js/documentos.js, js/portal.js, version.js.
 * ------------------------------------------------------------
 * RENDIMIENTO (07/10/2026).
 *   · Las respuestas grandes viajan comprimidas (gzip) y los tiempos de
 *     cada pantalla se anotan en la hoja MEDICION pegados a la
 *     siguiente lectura (sin viajes extra).
 *   Archivos tocados: app.js, version.js (y Lectura.gs/Medicion.gs en
 *   el backend).
 * ------------------------------------------------------------
 * AJUSTE 07/10/2026 — TU OFERTA ELEGIDA (pedido de Javier).
 *   · Cuando ya escogiste una oferta, en Ofertas de Empleo solo ves
 *     la tuya: el catálogo queda cerrado aunque se publiquen ofertas
 *     nuevas, y no puedes cambiarte por tu cuenta. Si necesitas
 *     cambiarla, Procesos libera tu selección; entonces vuelves a ver
 *     todas las ofertas (con un aviso de que fue liberada) y te llega
 *     un correo. Si la entrevista sale no aprobada, el catálogo se
 *     reabre solo, como antes.
 *   Archivos tocados: js/ofertas.js (y, en Apps Script,
 *   OfertasEstudiante.gs y OfertasPdf.gs).
 * ------------------------------------------------------------
 * CORRECCIÓN (04/09/2026) — VUELVE "REHACER MI CONTRATO".
 *   Con el rediseño de la Zona de estudiantes (Entrega 6), la tarjeta
 *   del contrato dejaba de pintarse apenas el estudiante firmaba, y
 *   con ella se perdía el botón para rehacerlo mientras SEP todavía
 *   no lo valida. Vuelve: la tarjeta se queda mientras el contrato no
 *   esté validado, y "Mi contrato" tambien ofrece rehacerlo.
 *   Archivos tocados: js/portal.js (y Portal.gs en el backend).
 * ------------------------------------------------------------
 * FASE 4.1 (04/09/2026) — LA OFERTA QUE SEP TE PROPONE.
 *   · Cuando SEP aplica por ti, la oferta llega a tu portal como una
 *     PROPUESTA: la revisas completa (empleador, posición, Sponsor y
 *     condiciones) y la confirmas marcando la misma casilla de
 *     siempre, o la rechazas. Tienes 7 días; si no respondes, la
 *     propuesta se cancela y el cupo queda libre para otro.
 *   · Mis documentos: cuando uno dice "No disponible todavía" ahora
 *     se explica por qué —hace parte de tu proceso, pero todavía no
 *     corresponde pedirlo— y, cuando se abre por fecha, desde cuándo.
 *   · Ofertas: si tu resultado de inglés quedó aceptado con
 *     condición, puedes verlas pero no seleccionarlas hasta que SEP
 *     confirme que estás haciendo el curso de inglés; el aviso lo
 *     dice con esas palabras.
 *   Archivos tocados: js/ofertas.js, js/documentos.js, css/ofertas.css.
 * ------------------------------------------------------------
 * FASE 4 · ENTREGA 6 (04/09/2026) — REDISEÑO DE LA ZONA DE ESTUDIANTES
 * (punto 4 del plan). El inicio responde al avance real: acciones
 * pendientes que desaparecen al cumplirse, accesos rápidos con las
 * nueve reglas de desbloqueo (y el motivo cuando algo está bloqueado),
 * Mis documentos (los 10 centralizados, solo PDF, con el circuito de
 * corrección), Mis pagos leídos de Contador, Seguimiento desplegable,
 * Mi contrato y el bloque de programa y contacto con "Hablar con mi
 * Asesor". Archivos nuevos: css/portal.css, js/portal.js,
 * js/documentos.js. Tocados: index.html, app.js, js/contrato.js.
 * ------------------------------------------------------------
 * FASE 4 · ENTREGA 4 (03/09/2026) — PDF DE LA OFERTA: en la ficha de
 * cualquier oferta hay un botón para descargarla en PDF. Se puede
 * bajar aunque la oferta no le sirva al participante y aunque no la
 * haya seleccionado. El documento lo arma SEP con su plantilla.
 * Archivos tocados: js/ofertas.js, css/ofertas.css.
 * ------------------------------------------------------------
 * FASE 4 · ENTREGA 2 (03/09/2026) — OFERTAS DE EMPLEO en la Zona de
 * estudiantes: lista con filtros y buscador, ficha completa con
 * galería, motivos de bloqueo cuando la oferta no le sirve, y la
 * selección con su modal de confirmación y la reserva del cupo.
 * Archivos nuevos: css/ofertas.css y js/ofertas.js.
 * ------------------------------------------------------------
 * LOTE 17/08/2026 (b) — EL INICIO APROVECHA EL ANCHO EN PC: en un
 * computador la vista de inicio sube a 1040 px y las tarjetas se
 * reparten en dos columnas (el saludo y el pie van a lo ancho). En
 * el teléfono no cambia nada. Archivo tocado: styles.css.
 * ------------------------------------------------------------
 * LOTE 17/08/2026 — 6 ajustes del FORMULARIO (Zona de estudiantes):
 *   1. En PC el formulario aprovecha el ancho (dos columnas).
 *   2. La fecha de nacimiento del contrato ya no abre el calendario del
 *      navegador: usa la misma rueda manejada del formulario.
 *   3. Al pulsar Guardar el botón se bloquea y sale el aviso del avión
 *      ("Se está guardando tu informe del Bloque X").
 *   4. Al subir un documento se queda en el mismo bloque, ya no rebota
 *      al inicio.
 *   5. Al guardar un bloque se vuelve a "Tu formulario", no al inicio.
 *   6. Los nombres de personas, empresas, universidades y colegios, y
 *      las ciudades, departamentos, países y nacionalidad se escriben
 *      en MAYÚSCULAS mientras se teclean y se guardan así.
 * ------------------------------------------------------------
 * FASE 3 SEP · ENTREGAS 3, 4 y 5 (16 y 17/08/2026): FORMULARIO SUMMER
 * con sus 14 bloques y la carga de documentos, y los bloques que el
 * equipo de SEP puede REABRIR para que el estudiante corrija.
 * ------------------------------------------------------------
 * Fase 3 y Fase 5 (11 y 12/08/2026): ZONA DE ESTUDIANTES con lectura y
 * firma del contrato, acuerdo de firma electrónica, modo oscuro,
 * esqueletos como único efecto de carga y resumen antes de firmar.
 * ------------------------------------------------------------
 * FASE 5.5 · ENTREGA D (09/10/2026) — SILUETAS CON LA FORMA REAL.
 *   · Inicio: silueta del tablero del portal (saludo, acciones pendientes,
 *     accesos rápidos en su rejilla y contacto), no la del inicio viejo.
 *   · Mis documentos, Formulario y Ofertas: siluetas de su lista real.
 *   Archivos: js/capa-5-esqueletos.js, css/capa-5-esqueletos.css,
 *   js/documentos.js, js/formulario.js, js/ofertas.js, version.js.
 * ------------------------------------------------------------
 * FASE 5.5 · ENTREGA C (08/10/2026): el contrato sin tablas — datos de
 * las partes en ficha, firmas en recuadros y precios por plan en
 * tarjetas (js/contrato.js, css/contrato.css, css/tema-oscuro.css).
 * ------------------------------------------------------------
 * Sube este número en cada despliegue del frontend. La app lo lee
 * sin caché: si cambia, limpia caches y recarga automáticamente en
 * todos los dispositivos. También alimenta el texto "Versión X".
 * ============================================================ */
var APP_VERSION = "2026.10.10.03";
