# Auditoría de rendimiento

Fecha: 1 de noviembre de 2026. Script: `npm run perf` (`tests/perf.mjs`).

## 1. Qué exige CrazyGames

| Requisito | Fuente |
|---|---|
| Carga rápida y juego sin errores ni cuelgues | *Gameplay requirements* |
| Fluido en un Chromebook con 4 GB de RAM (si no, se desactiva en ChromeOS) | *Technical requirements* |
| Funcionar bien en Safari y en la app móvil | *Technical requirements* |
| Física idéntica a 60, 144 y 165 Hz | *Gameplay requirements* |
| Descarga inicial ≤ 50 MB (≤ 20 MB para la portada móvil) | *Technical requirements* |

CrazyGames no publica un mínimo de FPS. Como referencia de "fluido" se usa: **media ≥ 50 fps y menos del 10 % de fotogramas por encima de 33 ms** (es decir, bajadas por debajo de 30 fps).

## 2. Método

- Chromium sin GPU, por lo que todo el dibujo se hace por software. Es más exigente que un equipo real, que dibuja con la GPU.
- La CPU se ralentiza con el protocolo de DevTools para simular equipos lentos: ×4 en el Chromebook y en el móvil de gama media, ×6 en el de gama baja.
- Un bot juega de forma realista: recoge rocío y esquiva.
- Se miden tres fases:
  1. **Inicio**: primeros 8 s.
  2. **Final**: todas las armas al nivel 5 y dos jefes.
  3. **Multitud**: 340 enemigos a la vez, el máximo del juego.
- La memoria se mide tras forzar la recolección de basura, para detectar fugas.

## 3. Diagnóstico

El código del juego no era el problema: la simulación cuesta 0,1-1,4 ms y las órdenes de dibujo 0,5-5 ms por fotograma, cuando el presupuesto a 60 fps es de 16,7 ms. El cuello de botella era el **relleno de píxeles**.

| Experimento (Chromebook simulado, tramo final) | fps |
|---|---|
| Versión original | 15,4 |
| Sin viñeta oscura | 20,6 |
| Sin fondo en mosaico | 21,0 |
| Sin viñeta ni fondo | 28,7 |

Cada fotograma rellenaba la pantalla entera dos veces, una con el fondo y otra con la viñeta, y además dibujaba una luz grande alrededor del jugador.

## 4. Correcciones

| Cambio | Efecto |
|---|---|
| Fondo y viñeta pasan a capas HTML que el navegador compone sin volver a pintarlas. El fondo se mueve con `transform`, que solo usa la capa de composición | Elimina dos rellenos de pantalla completa por fotograma |
| La luz del jugador forma parte de la capa de la viñeta | Un relleno grande menos |
| Escalera de calidad automática: resolución interna 2× → 1× → 0,75× → 0,6×. Baja un peldaño si la media supera 24 ms durante 2 s | Los equipos lentos se adaptan solos; los rápidos conservan la nitidez |
| Con calidad reducida, enemigos sin halo y la mitad de partículas | Menos píxeles semitransparentes que mezclar con cientos de enemigos |
| La racha en pantalla se escala con una transformación en lugar de cambiar el tamaño de letra en cada fotograma | Evita recalcular la fuente |

## 5. Resultados antes y después

Las mismas pruebas sobre la versión publicada en `main` y sobre esta versión.

| Perfil | Fase | Antes fps | Después fps | Antes % >33 ms | Después % >33 ms |
|---|---|---|---|---|---|
| Escritorio 1366×768 | Final | 59 | 59 | 0,0 | 0,7 |
| Escritorio 1366×768 | Multitud | 58 | 59 | — | — |
| Pantalla completa 1920×1080 | Final | 39 | **59** | 11,1 | **0,3** |
| Pantalla completa 1920×1080 | Multitud | 32 | **52** | — | — |
| Chromebook 4 GB (CPU ×4) | Inicio | 22 | **60** | — | — |
| Chromebook 4 GB (CPU ×4) | Final | 13 | **54** | 98,7 | **2,7** |
| Chromebook 4 GB (CPU ×4) | Multitud | 10 | **53** | — | — |
| Móvil medio DPR 2,75 (CPU ×4) | Final | 33 | **48** | 20,4 | **5,7** |
| Móvil medio DPR 2,75 (CPU ×4) | Multitud | 33 | **60** | — | — |
| Móvil bajo DPR 2 (CPU ×6) | Final | 21 | **46** | 76,3 | **7,4** |
| Móvil bajo DPR 2 (CPU ×6) | Multitud | 19 | **47** | — | — |

| Indicador | Antes | Después | Límite |
|---|---|---|---|
| Tiempo hasta la partida jugable | 0,15-1,05 s | 0,13-0,64 s | ≤ 20 s |
| Memoria JS tras recolectar basura | 1,5 → 1,8 MB | 1,5 → 1,9 MB | Sin crecimiento sostenido, por tanto sin fugas |
| Ritmo de asignación de memoria | 1,4-1,7 MB/s | 1,7-2,1 MB/s | Bajo: no provoca pausas apreciables |
| Tamaño del paquete | 5 archivos, 75 KB | 7 archivos, 95 KB | ≤ 20 MB |

## 6. Conclusión

- **Cumple** en escritorio y pantalla completa: estable a 60 fps.
- **Cumple** en el Chromebook simulado de 4 GB: más de 50 fps y menos del 3 % de bajadas, frente a 13 fps antes.
- **En los móviles simulados** queda entre 46 y 60 fps, con un 6-7 % de bajadas en el peor tramo. Como la simulación es por software, el resultado real con GPU debería ser mejor.

## 7. Limitaciones y verificación pendiente

1. La simulación no sustituye a los dispositivos reales. Conviene probar en un Chromebook, un Android de gama media y un iPhone (Safari) con el contador de FPS de Chrome DevTools (*Rendering → Frame Rendering Stats*).
2. No se ha medido el consumo de batería ni la temperatura.
3. La memoria del lienzo depende de la resolución. A 1920×1080 con resolución 2× ocupa unos 16 MB, muy por debajo de lo que puede preocupar en un equipo de 4 GB.
