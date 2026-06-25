# SEP-AGENDA · Portal del Estudiante

Sitio web (solo **HTML + CSS + JS**) para que cada estudiante de **SEP Colombia Group SAS**
inicie sesión con su **documento + clave dinámica**, vea sus datos y **agende / reagende / cancele**
su asesoría usando la rueda iOS (solo muestra cupos libres). Consume el **mismo** backend
de Apps Script que SEP GROUP (`/exec`), con endpoints nuevos del archivo `Estudiante.gs`.

> © Oscar Polanía — Experto en Soluciones Digitales · +57 310 323 0712
> Software propietario; cualquier modificación por terceros anula la garantía.

---

## 1) Backend (Apps Script) — una sola vez

1. Abre el proyecto de Apps Script de SEP GROUP.
2. Crea un archivo nuevo **`Estudiante.gs`** y pega el contenido entregado.
3. En **`Codigo.gs` → `dispatch_`**, dentro del `switch (action)`, agrega:

   ```js
   // ESTUDIANTE — SEP-AGENDA (Fase 4)
   case 'loginEstudiante':    return apiLoginEstudiante_(params, body);
   case 'miAgenda':           return apiLoginEstudiante_(params, body);
   case 'slotsEstudiante':    return apiSlotsEstudiante_(params, body);
   case 'agendarEstudiante':  return apiAgendarEstudiante_(params, body);
   case 'cancelarEstudiante': return apiCancelarEstudiante_(params, body);
   ```

4. Ejecuta **una vez** la función `migrarFase4Agenda()` (menú ▷ Ejecutar).
   Agrega la columna opcional `DOCUMENTO` a `COMERCIAL` y siembra la plantilla `CANCELACION`.
5. **Publica una versión nueva del Web App** para que los endpoints queden en vivo:
   `Implementar → Administrar implementaciones → (lápiz) Editar → Versión: Nueva → Implementar`.
   La URL `/exec` (`API_BASE`) **no cambia**.

### ¿Hay que volver a autorizar?
**No.** No se agregan scopes nuevos: Calendar, MailApp, Sheets, Drive y Firebase ya estaban
autorizados en la Fase 3.2. Solo necesitas **publicar versión nueva** del Web App.

### Firebase RTDB
SEP-AGENDA **no** lee el RTDB directamente; el backend lo espeja con el token OAuth del
despliegue. No requiere tocar las reglas en esta fase.

---

## 2) Frontend (GitHub Pages) — repo nuevo

1. Crea un repositorio **`SEP-AGENDA`** y sube estos 4 archivos:
   `index.html · styles.css · app.js · version.js`
2. `Settings → Pages → Source: main /(root)` y guarda. Anota la URL pública.
3. Verifica que `API_BASE` en `app.js` apunte al `/exec` correcto (ya viene configurado).
4. Abre la URL en el navegador (móvil o escritorio). Es un sitio web normal, **no se instala**.

### En cada cambio de frontend
- Sube el número de **`version.js`** (`2026.06.25.2` → `2026.06.25.3`).
  La app detecta el cambio y **recarga** sola en todos los dispositivos.

---

## 3) ¿Quién puede entrar?
Solo estudiantes con **clave dinámica** generada (estado **Perfil Apto** en adelante).
La clave se crea automáticamente al pasar el lead a *Perfil Apto* y se envía por correo/WhatsApp.

- **Perfil Apto** → puede **Agendar**.
- **Asesoría Agendada** → ve su cita + botón **Meet** (1 clic) + **Reagendar** / **Cancelar**.
- **Pendiente de Pago** → ve valor con descuento + datos bancarios.
- **Cancelar** → vuelve a *Perfil Apto*, borra el evento de Calendar/Meet y registra trazabilidad.

Todo agendamiento reutiliza `procesarEstado_`, así que Calendar + Meet + trazabilidad +
mensajes (correo HTML + WhatsApp) ocurren automáticamente. **Un cupo por bloque.**

---

## Archivos
| Archivo | Rol |
|---|---|
| `index.html` | Estructura (login, home, rueda iOS) |
| `styles.css` | Tokens SEP + glassmorphism + spinner + rueda |
| `app.js` | Login, render por estado, rueda de cupos, agendar/reagendar/cancelar |
| `version.js` | Versión + auto-actualización |
| `Estudiante.gs` | **(va en el backend)** endpoints + migración |
