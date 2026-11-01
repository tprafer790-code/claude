# Historia de la promesa de vivienda (1-nov-2026)

Objetivo del encargo: que el jugador recuerde una decisión que tomó media hora antes y descubra qué significó para alguien. La historia une la campaña, el gobierno y la reelección mediante **la primera promesa del programa**, la de vivienda, y una sola persona: la oyente de la radio que llama al principio y vuelve en el último debate.

No añade sistemas nuevos: reutiliza las promesas, el presupuesto (partidas), las leyes y la votación real del Parlamento, los efectos diferidos, el guardado y el debate.

## 1. Las tres escenas

| Escena | Cuándo | Qué ocurre | Sistemas que usa |
|---|---|---|---|
| **1. La llamada** | Al entrar en la sede, antes de las otras cinco preguntas del programa | Maite pasa una llamada de la radio. La oyente (Lola Rubio en España, Denise Carter en EE. UU., Rosângela Prado en Brasil) cuenta que le han subido el alquiler (180 €, 240 $ o 600 R$) y pregunta qué harías. Eliges entre tres respuestas literales, cada una con su coste a la vista. Maite clava la respuesta en el corcho de la sede. Es la «Promesa 1 de 6». | Promesas del programa (`answerProgramme`, eje vivienda), registro de decisiones |
| **2. La decisión de gobierno** | Cuando se desbloquea la vivienda (ronda 3). En España sustituye a la ley de esa ronda; en EE. UU. y Brasil ocupa la decisión principal | La promesa vuelve al despacho por teléfono. Tres tarjetas: **cumplirla entera**, **negociarla** o **aplazarla**. Antes de confirmar se ven los recursos que necesita, la prioridad con la que compite (qué partida se recorta y cuánto bajará su sector) y el recuento de votos previsto. | Votación real (`billTally`, mayorías de cada país, filibusterismo, quórum), presupuesto (`budget.lines`), concesiones (`applyOffers`), aprobación de leyes (`passPolicy`), efectos diferidos |
| **3. La rendición de cuentas** | Al empezar el debate de reelección | La periodista pone la grabación con tus palabras exactas. Entra la oyente y su frase depende de lo ocurrido. Si la medida está pendiente, Maite susurra «Técnicamente, el corcho fue la primera fase». Te defiendes con una de tres respuestas, que mueven al público del debate y tu credibilidad, y el tono de la escena se ajusta al resultado. | Debate (`s.debate.audience`), credibilidad, guardado |

Además, el corcho de la sede muestra la nota con un sello cuando ya hay desenlace, la carpeta de promesas recuerda la frase literal y su estado, y el final de la partida añade un epílogo sobre la oyente.

### Las tres respuestas en la radio

| Respuesta | Política | Coste o renuncia que se le explica al jugador |
|---|---|---|
| «Si gano, topo los alquileres el primer año…» | Tope a los alquileres (orientación -1) | Barato para el Estado, pero los propietarios se enfadan y parte de los pisos puede salir del mercado |
| «Si gano, le pagamos una parte del alquiler…» | Ayuda joven al alquiler (0) | Cuesta dinero cada ronda y parte de la ayuda puede acabar en la subida del casero |
| «Si gano, libero suelo para que se construyan muchos más pisos…» | Liberar suelo (+1) | Funciona, pero tarda; durante años solo verá grúas |

### Las tres opciones de gobierno

| Opción | Votación | Presupuesto | Efecto en vivienda |
|---|---|---|---|
| **Cumplirla entera** | Recuento sin concesiones | Sube la partida de vivienda un nivel y recorta la partida que elijas (sanidad, seguridad o inversión) o se financia con déficit | Inmediato y retrasado completos; la partida empuja el indicador de vivienda hacia arriba |
| **Negociarla** | Se ofrece una enmienda a cada partido que no votaría a favor (más votos) | Sin cambios en las partidas; mitad del coste inicial | Al 75 % y **toda** aplazada hasta después de las elecciones. Credibilidad +1 |
| **Aplazarla** | No se vota | Sin cambios | Ninguno. En España se devuelve el turno de ley de esa ronda. Se puede retomar más tarde desde el selector de leyes (tarjeta destacada) |

Si el Parlamento la rechaza, se guarda el intento con la ronda, la vía (entera, negociada, ley ordinaria, vía rápida o ratificación), el resultado y **quién la bloqueó** (partidos y escaños). La promesa se puede volver a intentar.

### Los cuatro desenlaces en el debate

| Desenlace | Condición | La oyente | Susurro de Maite |
|---|---|---|---|
| Ya funciona | Aprobada y sin efectos positivos de vivienda pendientes | Una frase distinta por política (fresas en enero, la bici, las grúas) | No |
| Aprobada, efectos pendientes | Aprobada, con efectos que llegan después | «¿Está en camino, como los paquetes que siempre pone "en reparto"?» | Sí |
| Rechazada en votación | Algún intento fallido y ninguno aprobado | «Al menos lo intentó, que es más de lo que ha hecho mi casero con la caldera» | No |
| Abandonada | Nunca se votó | «¿Se acuerda de mí o tengo que volver a llamar a la radio?» | Sí, si se aplazó expresamente |

Cada desenlace tiene tres defensas con efecto propio en el público y en la credibilidad (por ejemplo, pedir perdón sin excusas baja el público pero sube la credibilidad; prometerlo otra vez sube el público y hunde la credibilidad).

## 2. Comprobaciones pedidas

| Comprobación | Cómo | Resultado |
|---|---|---|
| Dos partidas reproducibles con el mismo país y promesa y distinta decisión | `npm run housing` (robot con semilla fija). Informe completo en [`vivienda-partidas.md`](vivienda-partidas.md) | ✅ España, semilla 2, tope a los alquileres: tres variantes (cumplir, negociar, aplazar). También EE. UU. y Brasil |
| Qué cambia en el presupuesto, la vivienda y la conversación final | Mismo informe (tabla abajo) | ✅ |
| Guardar y continuar conserva la historia | Unitaria: serializar el estado conserva la historia y produce el mismo intercambio final. e2e: se cargan partidas guardadas, «Continuar», y en una se recarga la página a mitad del intercambio y se continúa | ✅ |
| Funciona en los tres países | Unitarias: la promesa vuelve en la ronda 3 en ES, EE. UU. y BR. e2e: intercambio final en las tres | ✅ |
| Diálogos en español e inglés | Unitaria: los más de 80 textos de la historia existen en ES y EN y no dejan variables sin sustituir en ningún país. e2e: intercambio final con la interfaz en inglés | ✅ |
| Tiempo desde «Nueva partida» hasta que se registra la promesa | e2e en escritorio y móvil (ver §3) | ✅ medido con robot; tiempo humano estimado |
| Captura de la llamada y las dos versiones del intercambio final | [`capturas/`](capturas/) (ver §4) | ✅ |

### Partida reproducible · España, semilla 2, «Si gano, topo los alquileres el primer año…»

| | A · Cumplirla entera (recorta inversión) | B · Negociarla | C · Aplazarla |
|---|---|---|---|
| Votación en la ronda 3 | Aprobada, 195 a 128 | Aprobada, 222 a 128 (enmiendas) | No se vota |
| Partidas tras la decisión | Vivienda 1→2, inversión 1→0 | Sin cambios | Sin cambios |
| Indicador de vivienda en la decisión | 37,6 | 37,6 | 37,6 |
| Indicador de vivienda en la reelección | **62,2** | 47,3 | 47,3 |
| Efectos de vivienda pendientes | Ninguno | Ronda 13 (después de las elecciones) | Ninguno |
| Desenlace para la oyente | Ya funciona | Aprobada, efectos pendientes | Abandonada |
| La oyente dice | «Pues funciona… He vuelto a comprar fresas. En enero.» | «¿Está en camino, como los paquetes…?» | «¿Se acuerda de mí o tengo que volver a llamar a la radio?» |
| Maite susurra | — | «Técnicamente, el corcho fue la primera fase» | «Técnicamente, el corcho fue la primera fase» |

En EE. UU. (semilla 2, ayuda al alquiler) las dos opciones las tumba el ala moderada del propio partido y la oposición; el informe lo registra como «bloquean: LIB-m (139), LIB-h (85)». En Brasil (semilla 2, liberar suelo) cumplirla entera lleva la vivienda a 67,9 y negociarla la deja en 47,5.

## 3. Tiempo hasta la promesa

| Medida | Escritorio (1280×720) | Móvil (390×844) |
|---|---|---|
| Robot que pulsa sin leer (e2e, varias ejecuciones) | 0,2–0,7 s | 0,2–0,8 s |
| Pulsaciones necesarias | 5: país, candidatura, orientación, «Siguiente» tras Maite, respuesta | Igual |
| Palabras en pantalla hasta la promesa (ES) | 516 (país 121, candidatura 108, orientación 56, Maite 37, la llamada y las tres respuestas 194) | Igual |

**Estimación humana, no medida:** leyendo todo a 200–250 palabras por minuto son unos 2–2,5 minutos; si se ojean las pantallas de preparación, alrededor de 1–1,5 minutos. Hace falta una prueba con personas para confirmarlo. El juego guarda el dato real de cada partida en `promisedAfterMs` (y en `window.__PI_PROMISE_MS__`) y lo anota en el registro local de pruebas (`housing_promise`).

## 4. Capturas

| Archivo | Qué muestra |
|---|---|
| `capturas/09-llamada-radio.png` | La llamada en escritorio: candidatura y Maite en primer plano, la radio «En directo» y las tres respuestas |
| `capturas/10-llamada-movil.png` | La llamada en móvil vertical |
| `capturas/11-grabacion.png` | La periodista pone la grabación con las palabras exactas |
| `capturas/12-final-cumplida.png` | Intercambio final si la cumpliste entera |
| `capturas/13-final-negociada.png` | Intercambio final si la negociaste |
| `capturas/14-susurro.png` | El susurro de Maite |

Se regeneran con `npm run e2e -- --only vivienda --shots <carpeta>`.

## 5. Dónde se cambia

| Qué | Dónde |
|---|---|
| Textos (ES/EN) de la llamada, la decisión, el debate y el epílogo | `src/data/housingStory.ts` |
| Nombre de la oyente por país | `castNames.caller` en `src/data/countries/*.ts`; aspecto en `src/art/characters.ts` (`caller`) |
| Emisora y subida del alquiler por país | `HOUSING_FLAVOR` en `src/data/housingStory.ts` |
| Público y credibilidad de cada defensa | `HOUSING_DEBATE.defenses` (el público se multiplica por 1,4 en `resolveHousingDefense`) |
| Ronda en que vuelve la promesa | `UNLOCKS` en `src/core/government.ts` (desbloqueo de vivienda) |
| Fuerza de la versión negociada (75 %, mitad del coste inicial, aplazada hasta el final) | `enactNegotiated` y `housingForecast` en `src/core/housingDecision.ts` |
| Lógica de la historia (promesa, intentos, desenlace, debate) | `src/core/housingStory.ts` |
| Escenas | `src/ui/screens/housing.ts` |

## 6. Limitaciones

- El tiempo hasta la promesa se ha medido con un robot; el tiempo humano es una estimación.
- En EE. UU. la promesa se rechaza a menudo: el Senado exige 60 votos y el ala moderada del partido propio vota en contra. Es coherente con el sistema, pero conviene vigilarlo en pruebas con personas.
- La versión negociada llega siempre después de las elecciones, así que en el debate siempre está «pendiente». Es intencionado: es la versión que se puede vender sin haberla notado.
- El formato de guardado pasa a la versión 2: las partidas guardadas con la versión anterior no se pueden continuar.
- En el plató del debate la oyente aparece pequeña y parcialmente tapada por el cuadro de diálogo (el retrato del diálogo sí la muestra entera). El primer plano con manos y caras se hizo para la llamada, que es lo que pedía el encargo.
