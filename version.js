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
 * Sube este número en cada despliegue del frontend. La app lo lee
 * sin caché: si cambia, limpia caches y recarga automáticamente en
 * todos los dispositivos. También alimenta el texto "Versión X".
 * ============================================================ */
var APP_VERSION = "2026.09.04.02";
