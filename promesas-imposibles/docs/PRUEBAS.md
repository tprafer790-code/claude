# Resultados de las pruebas (31-oct-2026)

Todas las pruebas son automáticas y se pueden repetir con los comandos indicados. **No se ha hecho ninguna prueba con personas**: ver «Limitaciones».

## 1. Resumen

| Comprobación | Comando | Resultado |
|---|---|---|
| Tipos estrictos de TypeScript | `npm run typecheck` | Sin errores |
| Validación de datos (referencias, ES/EN, mínimos) | `npm run validate` | Sin errores ni avisos. 64 eventos, 23 en cadenas, 19 con variantes o exclusivos de país, 5 en la rama de invasión, 25 políticas, 12 finales, 293 textos de interfaz |
| Pruebas unitarias del motor | `npm test` | 29/29 |
| Pruebas de extremo a extremo (Playwright, compilación de producción) | `npm run e2e` | 16/16 |
| Compilación web | `npm run build` | 301 KB JS + 22 KB CSS (106 KB comprimido) |
| Compilación Poki | `npm run build:poki` | Igual + etiqueta del SDK |
| Herramientas de desarrollo fuera de producción | búsqueda en `dist/` | No aparecen |

## 2. Lista de verificación del encargo

| Requisito | Cómo se verificó | Estado |
|---|---|---|
| Los tres países | e2e: partida completa en ES, EE. UU. y BR desde izquierda y derecha (6 partidas) | ✅ |
| Victoria y derrota | e2e: hay reelecciones ganadas y derrotas en campaña, en la investidura y en la reelección; unitaria «hay victorias y derrotas en cada país» | ✅ |
| Coaliciones | e2e: negociación de investidura con concesiones; unitaria «en España las concesiones pueden decidir una investidura» (y una partida e2e termina en «Investidura fallida») | ✅ |
| Leyes que se aprueban y que fracasan | unitaria «las concesiones cambian votos» (parlamento sin mayoría en los 3 países) | ✅ |
| Efectos diferidos | unitaria «las consecuencias diferidas se aplican en su ronda» | ✅ |
| Investigación por corrupción | unitaria «las pruebas acumuladas abren una investigación periodística» | ✅ |
| Crisis internacional | unitaria: sin escalada previa no hay invasión; aparece en menos del 20 % de 200 partidas | ✅ |
| Guardar y continuar | e2e: recarga a mitad de campaña, «Continuar» conserva semilla y fase; unitaria: serializar y restaurar produce exactamente el mismo futuro (indicadores, agenda y estado del generador) | ✅ |
| Sin almacenamiento | e2e con `localStorage` que lanza excepción: aviso visible y partida completa | ✅ |
| Táctil y teclado | e2e: partida completa con toques en móvil vertical (390×844) y tableta (1024×768); partida completa solo con teclado; caminar con flechas | ✅ (emulado) |
| Cambio de idioma | e2e: cambio a inglés en mitad de la partida, desde el menú de pausa | ✅ |
| Dentro de un iframe | e2e: las flechas no desplazan la página anfitriona | ✅ |
| Bloqueador de anuncios | e2e: compilación Poki con `poki.com` bloqueado, partida completa | ✅ (simulado) |
| Llamadas al SDK de Poki | e2e con SDK simulado: `gameLoadingFinished → gameplayStart → gameplayStop → commercialBreak → …` | ✅ |
| Sin peticiones externas | e2e: ninguna petición fuera del propio servidor en las 6 partidas completas | ✅ |
| Primera decisión en menos de 1 minuto | Elegir país es la primera pantalla tras «Nueva partida» | ✅ (por diseño) |
| Duración ~60 minutos | **No medida** | ⚠️ Ver §4 |

## 3. Equilibrio (robots, 40 partidas por casilla)

`npm run simulate -- 40`. Estrategias: azar, honesta, corrupta, populista, tecnócrata y autoritaria. «Campaña» es el porcentaje de elecciones iniciales ganadas; los finales con victoria son `winner`, `hollow_winner`, `reformer` y `corrupt_winner`.

| País | Azar | Honesta | Corrupta | Populista | Tecnócrata | Autoritaria |
|---|---|---|---|---|---|---|
| España: campaña / final con victoria | 28 % / 6 % | 83 % / 83 % | 73 % / 5 % | 90 % / 86 % | 53 % / 53 % | 83 % / 53 % |
| EE. UU.: campaña / final con victoria | 57 % / 23 % | 68 % / 60 % | 43 % / 3 % | 65 % / 45 % | 83 % / 79 % | 60 % / 15 % |
| Brasil: campaña / final con victoria | 60 % / 36 % | 73 % / 73 % | 53 % / 0 % | 75 % / 55 % | 93 % / 93 % | 63 % / 33 % |

Lectura:
- La corrupción y el autoritarismo ganan campañas pero casi nunca terminan bien: los finales «procesado», «autócrata» o «derrota» dominan.
- **Equilibrio ideológico** (`npm run symmetry -- 40`, misma estrategia desde cada lado): España 93 % / 95 %, EE. UU. 50 % / 53 %, Brasil 68 % / 75 % de finales con victoria jugando de forma honesta (izquierda / derecha). Las diferencias están dentro del ruido de 40 partidas (±7 puntos aprox.).

Problemas de equilibrio conocidos (pendientes de pruebas con personas):
1. En España, jugar al azar casi nunca gana la campaña (28 %), pero una vez en el Gobierno, la estrategia honesta o la populista se reeligen casi siempre.
2. La estrategia tecnócrata (programa centrista) domina en Brasil (93 %).
3. La calidad de vida final varía poco entre estrategias (46–55 de media): las consecuencias se notan más en los finales que en el indicador.

## 4. Duración (estimación, no medición)

Una partida completa registra unas 29 decisiones con consecuencias (programa, calle, entrevista, eventos, presupuestos, leyes) más unas 20 de campaña, debate, negociación y reelección: alrededor de 50 decisiones. Con 40–70 segundos por decisión (leer, elegir, ver consecuencias), saldría entre 35 y 60 minutos. Una derrota en campaña dura en torno a 8–10 minutos. **Es una hipótesis**: no hay medición con jugadores. El registro local de pruebas (Ajustes → «Exportar registro local de prueba») sirve para medirlo en una sesión con personas.

## 5. Limitaciones

- Sin pruebas con personas: ni duración real, ni comprensión, ni diversión, ni retención.
- Móvil y tableta probados con emulación de Chromium, no en dispositivos reales ni en Safari/iOS.
- El bloqueador de anuncios se simuló bloqueando peticiones a `poki.com`.
- El SDK de Poki se probó con un sustituto que imita su API; no se probó en el inspector oficial de Poki.
- El robot de las pruebas e2e elige al azar: recorre todas las pantallas, pero no evalúa si las decisiones tienen sentido.
- Pendiente para enviar a Poki: URL de la política de privacidad y lectura de las *Quality Guidelines* (`docs/POKI.md`).
