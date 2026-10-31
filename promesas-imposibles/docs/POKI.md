# Poki: integración, riesgos de contenido y pruebas

> Fuentes leídas el 31-oct-2026: [SDK HTML5](https://sdk.poki.com/html5), [documentación del SDK](https://sdk.poki.com/sdk-documentation) y [requisitos](https://sdk.poki.com/new-requirements). Las *Quality Guidelines* enlazadas desde allí **no se leyeron**. Este documento no afirma que el juego esté aprobado por Poki: eso solo lo decide Poki tras su revisión.

## 1. Cómo se integra

| Requisito de Poki | Implementación | Verificado |
|---|---|---|
| Cargar `poki-sdk.js` y llamar a `PokiSDK.init()` | Solo en `npm run build:poki` (el plugin de `vite.config.ts` inserta la etiqueta). `src/platform/poki.ts` espera a `init()` con un límite de 4 s y continúa aunque falle. | Prueba e2e «poki con SDK simulado» |
| `gameLoadingFinished()` al terminar la carga | `main.ts`, tras montar la interfaz. | Primera llamada registrada: `loaded` |
| `gameplayStart()` / `gameplayStop()` | Inicio al crear o reanudar una partida y al cerrar la pausa; parada en pausa (ESC o botón), menú, pestaña oculta, finales y pausas publicitarias. El adaptador evita llamadas duplicadas. | Secuencia `loaded→start→stop→break→start→stop` |
| `commercialBreak()` solo en pausas naturales | Tres puntos: al salir de la noche electoral, cada 3 rondas de gobierno (al pasar de ronda) y en la revancha rápida. Como mucho una por minuto. Durante el anuncio: audio silenciado, entrada bloqueada, reloj del debate detenido. | 1 pausa en una partida automática completa (el límite de 1/min la deja en una porque el robot juega en segundos) |
| `rewardedBreak()` | No se usa. Ninguna decisión exige ver un anuncio. | — |
| Jugable con bloqueador de anuncios | Sin `window.PokiSDK` el adaptador funciona en modo local y todas las llamadas son inocuas. | Prueba e2e «poki con bloqueador»: partida completa con `poki.com` bloqueado |
| Sin peticiones externas | Fuentes del sistema, arte SVG generado por código, audio sintetizado. La compilación web no hace ninguna petición externa. | Las pruebas de partida completa comprueban que no hay peticiones fuera del propio servidor |
| `localStorage` protegido | `src/save/storage.ts` envuelve todo en `try/catch` y cae a memoria con aviso visible. | Prueba e2e «sin almacenamiento» (lectura de `localStorage` lanza excepción) |
| Flechas y espacio no desplazan la página anfitriona | `preventScrollKeys()` en `src/platform/poki.ts`. | Prueba e2e «iframe»: `scrollY` del anfitrión sigue a 0 tras pulsar flechas |
| Pausa con ESC, sonido silenciable | Menú de pausa y botón de silencio siempre visibles. | Manual y e2e |
| Tamaño inicial < 8 MB | ~300 KB de JS + 22 KB de CSS (≈ 106 KB comprimido). | `npm run build` |
| Escenas saltables, varios idiomas | Botón «Saltar» en cada diálogo; ES/EN con selector. | e2e «cambio de idioma» |

## 2. Riesgos de contenido y ajustes aplicados

Poki se reserva decidir qué contenido publica. Un simulador político satírico tiene riesgos claros:

| Riesgo | Ajuste en el juego | Riesgo residual |
|---|---|---|
| Representar a políticos reales | Todos los personajes y partidos son inventados. Los datos reales solo aparecen como «contexto, instantánea del 31-oct-2026», dentro de un desplegable, sin mecánicas. | Bajo |
| Atribuir escándalos a personas reales | Los escándalos solo afectan al jugador y a personajes ficticios. | Bajo |
| Sesgo ideológico | Ninguna orientación da ventajas: el centro ideológico de cada país está calibrado para que izquierda y derecha partan igualadas (ver `docs/GUIA_AJUSTES.md` §4). Las sátiras se reparten entre ambos lados y el aspecto del candidato no implica ideología. | Medio: la percepción de sesgo depende del jugador |
| Público joven en Poki | Sin violencia gráfica, sin lenguaje soez y sin contenido sexual. La invasión de un país ficticio (Varnia) es rara, se anuncia con antelación y se resuelve de forma abstracta (decisiones y consecuencias, sin combate). | Medio: el tema bélico podría no aceptarse para todas las edades |
| Corrupción, sobornos y autoritarismo como opciones jugables | Se presentan como tentaciones con consecuencias (sospecha, pruebas, investigación, procesamiento, finales negativos). El simulador confirma que la corrupción y el autoritarismo pierden más a menudo (ver `README.md`). | Medio |
| Banderas reales | Son símbolos nacionales planos dibujados a mano, sin escudos. | Bajo |
| Estilo inspirado en *South Park* | Solo la técnica de recortes de papel; no hay personajes, recursos ni nombres de la serie. Todo el arte es original y está en el código. | Bajo |

Si Poki pidiera una versión más neutra, los cambios más baratos serían: quitar las banderas reales (usar emblemas inventados), desactivar la cadena «varnia» (poner `weight: 0` en `src/data/events/chains.ts`) y suavizar los textos del soborno.

## 3. Pendiente antes de enviar a Poki

1. **Política de privacidad alojada.** El juego no envía datos a ningún servidor y el registro de pruebas es solo local, pero Poki pide una URL. Requiere una decisión del creador.
2. **Leer las *Quality Guidelines*** y revisar los textos satíricos con ellas.
3. **Pruebas en dispositivos reales.** Las pruebas de móvil y tableta se hicieron con emulación de Chromium (viewport, táctil, `isMobile`), no con teléfonos ni con Safari.
4. **Bloqueador real.** Se simuló bloqueando las peticiones a `poki.com`; no se probó con una extensión concreta.
5. **Pruebas con personas** para medir duración, comprensión y retención (ver `README.md`, «Limitaciones»).
