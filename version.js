/* ============================================================
 * SEP-AGENDA — VERSIÓN
 * © Oscar Polanía — Experto en Soluciones Digitales · +57 310 323 0712
 * Software propietario; cualquier modificación por terceros anula la garantía.
 * ------------------------------------------------------------
 * Capas (07/08 · 2): avisos por encima de la rueda, micro-efectos, onda al
 * tocar y esqueleto del inicio en vez del girador (el girador se queda en
 * agendar, reagendar y cancelar). Las capas viven en css/ y js/.
 * ------------------------------------------------------------
 * Acuerdo de firma (12/08/2026): antes de ver el contrato hay una
 * puerta con las CINCO casillas del Acuerdo de uso de mecanismo de
 * firma electrónica (Decreto 1074 de 2015); se piden cada vez que el
 * estudiante entra. Salen las dos declaraciones que estaban bajo las
 * firmas y se mantiene la aceptación de los términos al final de la
 * lectura. Bajo cada firma del PDF queda la fecha y hora de la firma.
 * ------------------------------------------------------------
 * 4 ajustes (11/08/2026): MODO OSCURO (botón 🌙/☀️ arriba a la derecha,
 * sigue al sistema si no eliges) · el ESQUELETO pasa a ser el único
 * efecto de carga de toda la web (login, inicio, rueda de cupos y
 * lectura del contrato; el girador queda apagado) · dos declaraciones
 * obligatorias debajo de las firmas · y aviso con avión mientras se
 * crea el contrato, con su confirmación al terminar.
 * ------------------------------------------------------------
 * Fase 5 (11/08/2026): campo Universidad (requerido) en el contrato ·
 * los PDF del documento y de la cédula ahora se pueden VER dentro de la
 * app y REEMPLAZAR, y solo se aceptan en PDF · pantalla de RESUMEN para
 * revisar todo antes de firmar · la lectura del contrato aprovecha el
 * ancho de la pantalla y el texto va justificado.
 * ------------------------------------------------------------
 * Fase 3 (11/08/2026): la web pasa a llamarse ZONA DE ESTUDIANTES y
 * suma la lectura y firma del contrato (js/contrato.js + css/contrato.css).
 * ------------------------------------------------------------
 * Lote 07/08: el logo ya no viene de Cloudinary, sino de
 * https://botheart911.github.io/SEP-GROUP/img/sep_logo.png
 * ------------------------------------------------------------
 * FASE 3 SEP · ENTREGA 3 (16/08/2026): FORMULARIO SUMMER en la Zona de
 * estudiantes — bloques 1 a 7 (información personal, pasaporte,
 * disponibilidad del programa, historial migratorio y J-1, familia,
 * información académica y verificación académica). Se guarda y se
 * cierra bloque a bloque, con confirmación antes de enviar y con los
 * estados Pendiente / En progreso / Completado 🔒. El pasaporte se
 * puede dejar pendiente y la verificación académica queda siempre
 * editable. Trae la RUEDA DE FECHA (día · mes · año) portada de
 * SEP GROUP y hecha genérica: fechas pasadas, futuras o de una
 * persona mayor de 20 años según el campo. Archivos nuevos:
 * js/formulario.js y css/formulario.css.
 * ------------------------------------------------------------
 * Sube este número en cada despliegue del frontend. La app lo lee
 * sin caché: si cambia, limpia caches y recarga automáticamente en
 * todos los dispositivos. También alimenta el texto "Versión X".
 * ============================================================ */
var APP_VERSION = "2026.08.17.01";
