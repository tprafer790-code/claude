# Versión 2: equipos de 4 GB, gráficos y jugabilidad

Objetivo de esta versión: que el juego funcione con soltura en equipos de 4 GB de RAM y que no quede ningún punto débil evidente en gráficos, misiones ni jugabilidad.

## 1. Equipos de 4 GB de RAM

| Medida | Detalle |
|---|---|
| Detección automática | Si el navegador informa de ≤ 4 GB de RAM (`navigator.deviceMemory`) o ≤ 4 núcleos, el juego arranca directamente con resolución interna 1× en vez de 2×. Ahorra hasta ×4 de memoria de lienzo en pantallas de alta densidad y evita los primeros segundos a tirones |
| Escalera de calidad | Se mantiene: si el fotograma medio supera 24 ms durante 2 s, baja a 0,75× y 0,6× |
| Efectos reducidos | En modo de bajo consumo o con calidad reducida: la mitad de partículas, la mitad de motas de ambiente y enemigos sin halo |
| Amanecer sin coste | El efecto de amanecer va dentro de la capa de viñeta y cambia solo 4 veces. Una capa extra a pantalla completa costaba unos 5 fps en el Chromebook simulado |
| Memoria del juego | Unos 2 MB de memoria JavaScript, sin crecimiento tras recolectar basura (sin fugas). Topes fijos de enemigos (340), partículas (420), rocío (320), esporas (80) y objetos (12) |

### Medición (versión 1 frente a versión 2)

Mismo método que la [auditoría de rendimiento](05-auditoria-rendimiento.md), con las dos versiones medidas una tras otra en la misma máquina. El perfil Chromebook simula ahora también 4 GB de RAM y 4 núcleos, y el tramo final activa todas las evoluciones (peor caso).

| Perfil | Fase | Versión 1 (fps) | Versión 2 (fps) |
|---|---|---|---|
| Escritorio 1366×768 | Final / multitud | 60 / 59 | 59-60 / 59 |
| Pantalla completa 1920×1080 | Final | 58 | 58-60 |
| Chromebook 4 GB (CPU ×4) | Final | 46-52 | 48-56 |
| Chromebook 4 GB (CPU ×4) | Multitud (340 enemigos) | 43-50 | 42-46 |
| Móvil medio DPR 2,75 (CPU ×4) | Final | 55 | 56-58 |
| Móvil bajo DPR 2 (CPU ×6) | Final | 42 | 45-48 |

| Memoria | Valor |
|---|---|
| Memoria JavaScript del juego tras recolectar basura | 1,6 → 2,0-2,2 MB (sin fugas) |
| RAM de todo el navegador (Chromium completo, cota superior) | 450-610 MB, igual que la versión 1 |

Lectura: el contenido nuevo no empeora el rendimiento de forma medible; las diferencias entre pasadas (±4 fps) son mayores que entre versiones. En esta sesión la máquina de pruebas iba algo más lenta que en la auditoría original (53 fps entonces en la multitud del Chromebook), por eso los valores absolutos son algo menores que en el documento 05. El juego ocupa unos 2 MB; lo que pesa en un equipo de 4 GB es el propio navegador, que CrazyGames ya tiene abierto.

## 2. Gráficos

| Mejora | Para qué |
|---|---|
| Amanecer progresivo en el último minuto | La oscuridad se aclara y el horizonte se tiñe de rosa: el jugador "ve" que se acerca la victoria |
| Motas de polen flotando | El jardín se siente vivo incluso sin enemigos |
| 2 enemigos con silueta y color propios | Flor escupidora (naranja, con pétalos en punta) y gemelo de sombra (verde, tres lóbulos) |
| Esporas enemigas con núcleo oscuro | Se distinguen de un vistazo de la luz propia |
| Aviso de embestida | El jefe marca su trayectoria con una franja parpadeante durante 0,8 s |
| Flecha del jefe | Si el jefe está fuera de pantalla, una flecha en el borde indica dónde está |
| Cartas de evolución doradas | Destacan sobre el resto y muestran la etiqueta EVOLUCIÓN |
| Estela del impulso y arco de recarga | El jugador sabe cuándo puede volver a usarlo |

## 3. Jugabilidad

| Novedad | Detalle | Por qué |
|---|---|---|
| **Impulso** | Espacio, Mayús o botón táctil. 0,18 s a ×3,2 de velocidad, invulnerable, recarga 2,4 s | Da al jugador una respuesta activa ante un cerco; sin él, la habilidad se limitaba a moverse |
| **Flor escupidora** (desde 2:00) | Guarda distancia, parpadea y lanza esporas | Obliga a moverse y esquivar, no solo a huir en círculos |
| **Gemelo de sombra** (desde 1:00) | Se divide en tres polillas pequeñas | Cambia las prioridades de ataque |
| **Embestida del jefe** | Aviso de 0,8 s, carga en línea recta y anillo de 8 esporas | El jefe deja de ser una "esponja de daño" y pide reaccionar |
| **Evoluciones** | Arma al nivel 5 + pasiva compañera al nivel 2. Cada carta de arma indica su pasiva | Meta a medio plazo dentro de la partida y momentos de poder memorables |
| **Objetos** | Flor de luna (+25 de luz) y semilla de viento (atrae todo el rocío). Los jefes sueltan ambos | Recompensas sorpresa y una salida cuando queda poca luz |
| **Aviso de poca luz** | Mensaje al bajar del 30 % de vida | El jugador entiende que debe buscar una flor de luna |
| **El pulso disipa esporas** | El arma de área también sirve de defensa | Da valor táctico a un arma |

Las tablas completas de enemigos, evoluciones y objetos están en el [documento de diseño](03-diseno.md).

## 4. Misiones y ajustes

| Cambio | Detalle |
|---|---|
| 3 tipos de misión nuevos | Evolucionar armas, aguantar N segundos sin daño, recoger objetos (12 tipos en total) |
| Ajustes en la pausa | Sonido, **música** y **temblor de pantalla** por separado; se guardan entre sesiones |
| Tutorial | El aviso del impulso aparece a los 14 s de la primera partida y desaparece al usarlo una vez |

## 5. Equilibrio

Bot acelerado que persigue el rocío y esquiva cuerpo a cuerpo, sin esquivar esporas, eligiendo siempre la primera carta (4 semillas por caso):

| Caso | Resultado |
|---|---|
| Noche 1, sin mejoras | Entre 2:37 y la victoria (antes: 2:52-4:36) |
| Noche 2, 6 mejoras | Entre 2:51 y la victoria |
| Noche 3, 12 mejoras, polilla rosa | 2 victorias de 4 |

Lectura: la dificultad se mantiene en el mismo rango. Las nuevas amenazas castigan al bot, que no esquiva proyectiles, pero un jugador las evita con el impulso.

## 6. Pruebas automatizadas añadidas

`npm test` comprueba ahora también: el impulso desplaza y da invulnerabilidad, tiene recarga, la flor escupidora dispara, el gemelo se divide, la flor de luna cura, aparece la carta de evolución, el amanecer se activa y los ajustes de música y temblor se guardan.
