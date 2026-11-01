# Guía de publicación en CrazyGames

## 1. Lista de verificación de requisitos

| Requisito | Estado | Cómo se cumple |
|---|---|---|
| Descarga inicial ≤ 50 MB (≤ 20 MB portada móvil) | ✅ | 5 archivos, ~75 KB |
| ≤ 1500 archivos, rutas relativas | ✅ | `src/*.js` con rutas relativas |
| SDK v3 + `gameplayStart` | ✅ | `src/sdk.js` |
| `gameplayStop` en cada pausa | ✅ | Pausa, subida de nivel, fin de partida, menús, cambio de pestaña |
| `loadingStart` / `loadingStop` | ✅ | En el arranque |
| Entrar directamente en el juego | ✅ | La partida empieza sin clic, con tutorial integrado |
| Física independiente de los Hz | ✅ | Paso fijo de 60 Hz |
| Inglés + idioma del sistema | ✅ | Inglés y español |
| Ratón, teclado y táctil | ✅ | Joystick flotante, WASD/ZQSD, flechas |
| Prevenir desplazamiento (rueda, flechas, espacio) | ✅ | Código de la lista de QA |
| `user-select: none` | ✅ | En `body` |
| Audio en iOS tras gesto | ✅ | `resume()` en `touchend`/`click` |
| Sin botón de pantalla completa propio | ✅ | — |
| Sin Escape | ✅ | Pausa con P |
| Midgame en punto lógico, nunca en botones de navegación | ✅ | Solo al terminar la partida |
| Silenciar al empezar el anuncio | ✅ | `adStarted` → silencio |
| Recompensado: sin recompensa en `adError` | ✅ | Probado |
| No combinar midgame con "seguir jugando" recompensado | ✅ | El recompensado duplica el néctar; no hay "revivir" |
| Jugable con bloqueador de anuncios y sin SDK | ✅ | Probado con el SDK bloqueado |
| Guardado con módulo Data (≤ 1 MB) | ✅ | ~300 bytes; respaldo en localStorage |
| PEGI 12 | ✅ | Fantasía sin violencia gráfica |
| Legible en 800×450 a DPR 1 | ✅ | Capturas en las pruebas |

## 2. Pasos para el envío

1. Ejecutar `npm run build` dentro de `lanternwing/` → genera `dist/lanternwing.zip` (con `index.html` en la raíz).
2. Entrar en el portal de desarrolladores de CrazyGames y crear un juego nuevo **HTML5**.
3. Subir el zip y revisarlo con la **QA Tool** del portal.
4. Rellenar los metadatos:
   - **Descripción** (propuesta en inglés, abajo).
   - **Controles**: "Drag anywhere / WASD / Arrow keys to move. P to pause. Attacks are automatic."
   - **Orientación**: horizontal (funciona también en vertical).
   - **¿Guarda progreso?**: sí.
   - **Compatible con móvil**: sí.
5. Subir **portadas e imágenes**: en el portal se indican tamaños; se pueden obtener capturas con `npm test` (se guardan en `tests/`).
6. Enviar para **Basic Launch**. Dejar `rewarded: false` en `index.html`.
7. Si CrazyGames lo pasa a **Full Launch**, cambiar a `window.LW_CONFIG = { rewarded: true }` y volver a subir.

### Descripción propuesta

> **Lanternwing** is a cozy-yet-frantic night survival game. You are a tiny lantern moth guarding a sleeping garden. Fly through swarms of shadow beetles while your light fights back on its own, collect glowing dew to level up and combine blessings like Petal Halo, Glow Pulse and Firefly Friends. Survive five minutes until dawn, earn nectar and grow your garden's power for the next night.

## 3. Pruebas automatizadas

`npm test` (requiere Playwright y Chromium) comprueba:

- Carga sin errores ni desbordamiento en las 11 resoluciones de referencia, incluida la vertical.
- Secuencia del SDK (init, carga, gameplayStart/Stop, midgame, happytime, guardado).
- Anuncio recompensado con éxito y con error.
- Partida con bot y rendimiento con más de 250 enemigos.
- Funcionamiento con el SDK bloqueado.
- Tamaño y número de archivos.

## 4. Pendiente o a criterio de la responsable

| Asunto | Recomendación |
|---|---|
| Nombre | Comprobar en el buscador de CrazyGames y valorar un nombre más distintivo (ver diseño, apartado 2) |
| Portadas y vídeo | Hay que producirlos; las capturas de las pruebas sirven de base |
| Prueba en dispositivos reales | Probar en un móvil Android, un iPhone (Safari) y un Chromebook antes de enviar |
| Cuenta de CrazyGames | Integración del módulo `user` solo si piden Full Launch con cuentas |
