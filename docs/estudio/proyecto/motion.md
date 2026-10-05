# Coreografía de cámara y motion

## Cámara
- **Claves**: `src/journey/keys.js` (14 claves; 5 son planos fijos `still` para movimiento reducido y navegación).
- **Curvas**: posición y mirada con Catmull-Rom centrípeta (sin bucles ni sobreoscilación en giros cerrados).
- **Aceleración/frenada**: cada tramo usa *smootherstep* (velocidad y aceleración nulas en las claves).
- **Pausas**: `hold` en pantallas de scroll; la cámara se detiene mientras el texto se lee o se exploran detalles.
- **FOV**: 36–58°. Se abre en la apertura (50 → 58) para ampliar el campo visual. En vertical se recalcula para conservar ~78 % del campo horizontal (máx. 76°).
- **Amortiguación**: la cámara sigue al scroll con retardo exponencial; nunca bloquea el scroll.
- **Vida en pausa**: respiración vertical ±1,2 cm y paralaje de puntero (solo ratón, no en movimiento reducido).
- **Colisiones**: `npm run check:path` → distancia mínima 0,78 m a sólidos; altura mínima 1,44 m sobre el terreno exterior.

## Sincronización con el recorrido
| Elemento | Disparador | Duración / curva | Interrupción |
|---|---|---|---|
| Texto del capítulo | capítulo activo | revelado escalonado 0–1,6 s, ease-out cuadrático | se oculta en 0,4 s al salir |
| Hora del día | progreso por capítulo | sol 11° → 1,6°, color y niebla interpolados | continuo, reversible |
| Hoja corredera | permanencia de la clave IV | 10–75 % del tramo, smoothstep | reversible con scroll |
| Detalle (hotspot) | clic/Enter | cámara a perspectiva de detalle, mezcla exponencial ~1 s | Esc, botón cerrar o scroll > 0,35 unidades |
| Salto de capítulo lejano | raíl/menú | fundido a negro 320 ms | — |
| Brasero, viento, agua | tiempo | continuo | se congela en movimiento reducido |

## Movimiento reducido (completo)
Se activa por `prefers-reduced-motion` o en el menú. La cámara no se desplaza: cada capítulo muestra su plano fijo y el cambio se hace con un fundido breve. El texto aparece sin desplazamiento. Detalles, estancias y contacto funcionan igual. La escena solo se renderiza cuando cambia algo.
