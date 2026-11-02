# Mejoras de retención

En el panel de CrazyGames, los indicadores que deciden si un juego pasa de Basic Launch a Full Launch son **conversión a gameplay, tiempo medio de juego y retención**. Este documento recoge qué se ha cambiado para mejorarlos y cómo comprobar el efecto.

## 1. Diagnóstico de la versión anterior

| Momento | Problema | Riesgo |
|---|---|---|
| Primeros 10 s | Los enemigos tardaban unos 5 s en aparecer en pantalla y el primer nivel llegaba hacia los 10-20 s | Abandono antes de entender el juego |
| Durante la partida | Sin refuerzo inmediato más allá de las bajas | Sensación monótona |
| Al terminar | Solo se mostraba un resumen y la tienda | Sin motivo concreto para jugar otra vez |
| Largo plazo | 6 mejoras × 5 niveles. Tras ganar una vez no quedaba ningún reto nuevo | Se agota en 1-2 sesiones |

## 2. Cambios por fase del ciclo del jugador

### 2.1 Primeros 30 segundos (conversión)

| Cambio | Efecto medido con el bot |
|---|---|
| 6 sombras ya visibles al empezar | Acción en el primer segundo |
| Primer nivel con 3 de rocío (antes, 5) | Primera elección de bendición a los **2,8-7,6 s** |
| La primera bendición prioriza un arma nueva | El jugador ve crecer su poder enseguida |

### 2.2 Durante la partida (tiempo de juego)

- **Racha (combo)**: un contador sube con cada baja encadenada (menos de 1 s entre bajas) y "late" al aumentar. Cada 100 de racha da 1 de néctar extra.
- **Aviso de misión cumplida** en el momento en que se cumple, con su recompensa.

### 2.3 Al terminar (otra partida más)

La pantalla de resultados muestra ahora:

| Mensaje | Ejemplo |
|---|---|
| Lo cerca que se estuvo, si se pierde en el último minuto y medio | "¡Casi! Solo faltaban 0:42 para el amanecer." |
| Noche desbloqueada | "¡Noche 2 desbloqueada!" |
| Misiones cumplidas en la partida | "✓ Disipa 100 sombras en una noche +30 ●" |
| La siguiente meta concreta | "Te faltan 12 de néctar para Atracción" o "¡Ya puedes comprar Atracción!" |
| Mejor racha | Nueva fila en la tabla |

### 2.4 Entre sesiones (retención)

| Sistema | Qué ofrece | Por qué retiene |
|---|---|---|
| **Misiones** (siempre 3 activas) | 12 tipos: bajas, supervivencia, nivel, jefes, néctar, armas al máximo, racha, evoluciones, segundos sin daño, objetos, bajas totales y victorias. Al cumplir una aparece otra más difícil, que solo empieza a contar en la partida siguiente | Siempre hay una meta a corto plazo. Al no encadenarse en la misma noche, dan motivo para volver |
| **5 polillas** desbloqueables con néctar (150-650) | Cada una empieza con un arma distinta y una ventaja pequeña | Variedad de estilo de juego y un objetivo de ahorro a medio plazo |
| **5 noches** de dificultad creciente | Se desbloquea una al ganar la anterior. Cada noche: +50 % de vida de las sombras, +20 % de aparición y +50 % de néctar | Reto a largo plazo; el jugador experto gana más néctar |
| **Récord por noche** | Mejor tiempo guardado en cada noche | Superación personal |

## 3. Equilibrio comprobado

Simulación acelerada, eligiendo siempre la primera carta (peor que un jugador real):

| Caso | Resultado |
|---|---|
| Noche 1, polilla inicial, sin mejoras | Entre 2:52 y 4:36; a veces gana. Es una primera victoria alcanzable tras pocas partidas |
| Noche 1, polilla rosa | Gana |
| Noche 1, polilla de escarcha | 3:31: estilo más difícil |
| Noche 2 con 6 mejoras | Gana |
| Noche 3 con 12 mejoras | Gana |
| Misiones por partida | 2-3; antes de corregir el encadenamiento llegaban a 28 |

## 4. Cómo medir el efecto tras publicar

| Indicador del panel de CrazyGames | Qué debería mejorar |
|---|---|
| Conversión a gameplay | Inicio inmediato y tutorial integrado |
| Tiempo medio de juego | "Casi lo consigues", misiones y siguiente meta empujan a otra partida |
| Retención (vuelta otro día) | Misiones pendientes, polillas por desbloquear y noches nuevas |

Recomendación: publicar, esperar unas 2 semanas de datos y ajustar los costes de las polillas y la dificultad de las noches según dónde abandonen los jugadores.

## 5. Ideas descartadas o para más adelante

| Idea | Motivo |
|---|---|
| Recompensa diaria | Encaja mejor tras confirmar la retención básica; añade complejidad de fechas y zonas horarias |
| Revivir con anuncio | Prohibido combinarlo con el *midgame* al final de la partida |
| Tabla de clasificación | Requiere la API de cuentas de CrazyGames (Full Launch) |
| ~~Evolución de armas~~ | Incorporada en la versión 2 ([detalle](07-version-2.md)) |
