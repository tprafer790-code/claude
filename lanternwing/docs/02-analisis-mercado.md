# Análisis del catálogo de CrazyGames

Captura del 1 de noviembre de 2026 de la portada, `/hot`, `/new`, `/c/io`, `/t/casual`, `/c/action`, `/t/mobile` y cuatro fichas de juego. Las listas solo muestran nombres; género, motor y estilo se han verificado únicamente en las fichas abiertas. El resto es inferencia y se indica así.

## 1. Géneros dominantes

| Tendencia | Ejemplos observados | Rasgos |
|---|---|---|
| .io y multijugador de supervivencia | Bloxd.io, Evowars.io, Blombo.io | Sesiones largas, servidores propios |
| Vóxel / *obby* (parkour) | Bloxd.io, varias *Obby* | 3D sencillo, estética de bloques |
| Acción-horda / *runner* con puertas | Real War: Not Fake (Unity 6), Horde Killer: You vs 100 | Arrastrar para moverse, disparo automático, mejoras por nivel |
| Inactivos, *tycoon* y fusión | Egg-O-Matic Factory Tycoon, Rift War: Merge, Runespire Idle TD | Bucle de mejoras y progreso persistente |
| Casual y puzle | Piece of Cake: Merge and Bake, mahjong, palabras | Ratón o un dedo, 2D limpio |
| Ritmo / arcade | Friday Night Funkin' (HTML5) | 2D de dibujos, sesiones cortas |

Etiquetas del catálogo (recuento aproximado): **Mobile ≈ 2750**, Mouse ≈ 1935, 2D ≈ 1271, Casual ≈ 1078, Action ≈ 760, Arcade ≈ 750, Puzzle ≈ 679, Survival ≈ 411, Multiplayer ≈ 389.

## 2. Nivel gráfico y de rendimiento observado

1. **No se exige un nivel gráfico alto.** Conviven 2D plano, dibujos animados, vóxel y Unity 3D. La propia categoría móvil destaca que "los gráficos sencillos facilitan jugar en móvil".
2. **Lo que sí se exige es fluidez y carga rápida**: límite de 50 MB (20 MB para portada móvil), Chromebook de 4 GB y Safari.
3. **Valoraciones de referencia** (últimos 6 meses): Friday Night Funkin' 9,2; Real War 8,5; Bloxd.io 8,4; Piece of Cake 8,2. Un juego nuevo bien valorado ronda el 8+.

## 3. Rasgos comunes de los éxitos

- **Controles mínimos**: arrastrar con un dedo o WASD/flechas, con acción automática.
- **Progresión visible**: monedas, mejoras permanentes, niveles, aspectos.
- **Sesiones cortas que enganchan** ("5-minute fun", "Can't stop playing").
- **Compatibilidad móvil** como norma, no como extra.

## 4. Conclusiones para el diseño

| Decisión | Motivo |
|---|---|
| Género: supervivencia contra hordas con mejoras (*arena survival*) | Cruza dos tendencias fuertes (acción-horda y progreso persistente) y funciona con un solo dedo |
| 2D con Canvas, sin motor ni recursos externos | Carga instantánea (≪ 1 MB), apto para la portada móvil (≤ 20 MB) y para equipos de 4 GB |
| Partidas de 5 minutos | Encaja con la categoría "5-minute fun" y permite un anuncio *midgame* natural entre partidas |
| Tienda de mejoras permanentes | Retención: el jugador vuelve para mejorar |
| Estética nocturna con brillo (luz frente a sombras) | Se distingue de la estética vóxel y militar dominante y se lee bien en pantallas pequeñas |

## 5. Limitaciones

- No se publican cifras de partidas, tiempo medio ni retención por juego.
- Motor y estilo del resto de títulos de las listas no se han comprobado ficha a ficha.
