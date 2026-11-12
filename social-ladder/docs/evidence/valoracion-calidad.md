# Valoración de calidad — capas, título, cinemáticas, música y apaisado

Fecha: 2026-11-12. Pantalla probada: apaisada, 1280×720.

## Qué se probó

- **Pantalla de título** (`apaisado-1-titulo.jpg`): el barrio actual se mueve detrás del logotipo. Al pulsar cualquier tecla, el juego empieza.
- **Primer ascenso real, a Clase trabajadora** (`apaisado-2…5`): el bucle del motor (`checkRanks`) subió del rango 3 al 9 en cuanto el jugador tuvo los objetos que piden esos rangos. La cinemática se lanzó sola.
- **Segundo ascenso real, a Clase media-baja** (`apaisado-7…9`):
  - El motor subió del rango 9 al 16.
  - En la cinemática, el héroe sale caminando con el ciclo nuevo de cuatro fotogramas.
  - Llegada al barrio nuevo con el rótulo «CAPÍTULO 3 · CLASE MEDIA BAJA».
  - Al cerrar la ventana del ascenso, no apareció ninguna otra durante la pausa de 6 s.
  - La música cambió al tema de Clase media-baja (comprobado en el gestor de audio: etapa 2, secuenciador en marcha).
- **Escenario en apaisado** (`apaisado-6-calle-grande.jpg`): la calle ocupa unos dos tercios de la pantalla y los controles quedan en una columna a la derecha.
- **Fotogramas del héroe** (`heroe-fotogramas.jpg`): reposo, trabajo, celebración y cuatro de caminar.
- **Comprobaciones técnicas:**
  - `tsc` sin errores; tests: 80 superados y 5 omitidos; `vite build` correcto.
  - Ningún error de consola en la sesión probada.

## Cambios de esta ronda

| Problema | Solución |
|---|---|
| La calle era una franja pequeña en pantallas anchas (6/10) | Disposición apaisada a partir de 1100 px de ancho y proporción 3:2: calle grande a la izquierda y columna de controles con desplazamiento propio. Phaser se redimensiona con `ResizeObserver`. |
| Cuatro ventanas seguidas tras el ascenso | Pausa de 6 s después del aviso de ascenso antes de mostrar elecciones, avisos u otras ventanas. |
| Una sola música que solo cambiaba de tono | Ocho temas originales, uno por clase, con tempo, armonía, swing, bajo, batería, pad y arpegios propios. Entre barrios, la música baja y vuelve a empezar desde el primer compás. |
| El héroe «caminaba» con el fotograma de reposo | Ciclo de caminar de cuatro fotogramas (piernas y brazos alternos, rebote del cuerpo), usado en la calle y en la cinemática. |

## Tercera ronda: mezcla de audio y resoluciones

**Mezcla musical**
- Compresor general, filtro cálido sobre la música y reverb de sala.
- Melodía con dos osciladores ligeramente desafinados, ataque suave, vibrato en las notas largas y eco filtrado.
- Señal medida en la salida durante la partida: pico 0,068 y RMS 0,0069 con volumen de música 0,35.

**Resoluciones probadas**

| Resolución | Resultado | Captura |
|---|---|---|
| 1920×1080 | Calle a dos tercios del ancho. La interfaz escala al 130 % para que el texto se lea. Clics comprobados: crítico y combo. | `res-1920x1080-partida.jpg` |
| 1366×768 | Disposición apaisada. Al cambiar el tamaño en caliente, Phaser se adapta. | `res-1366x768-partida.jpg` |
| 1280×720 | Pantalla de título, partida y dos ascensos reales | `apaisado-*.jpg` |
| Móvil 375×812 | Partida en columna, sin desplazamiento horizontal. La cinemática muestra una franja más ancha del barrio (antes era un primer plano excesivo). En el título pone «Toca para empezar». | `res-movil-*.jpg` |

**Ascensos probados en el navegador:** Supervivencia → Trabajadora, Trabajadora → Media-baja, Media-baja → Media y Media → Riqueza.
- En todos, el motor (`checkRanks`) hizo la subida de rango y la cinemática salió sola.
- Para llegar al requisito, el dinero y los objetos se dieron por consola. El juego real tardaría horas.

## Valoración

| Aspecto | Nota |
|---|---|
| Arte de los escenarios | 8/10 |
| Cinemáticas de cambio de clase | 8,5/10 |
| Pantalla de título | 8/10 |
| Partida en apaisado (1366–1920) y móvil | 8,5/10 |
| Ritmo después del ascenso | 8/10 |
| Música y sonido | 8/10 (ocho temas propios con mezcla, reverb y eco; siguen siendo síntesis chiptune, coherente con el pixel art) |

**Resultado:** presentación coherente con un juego comercial de pago. Tiene título animado, siete barrios con parallax, cinemáticas en cada cambio de clase, música propia por barrio y una disposición pensada para PC.
