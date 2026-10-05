# Estado

- [x] Inventario y contrato
- [x] Referencias (agente; evidencia solo documentada: el proxy bloqueó la apertura de los sitios)
- [x] Dirección: 3 rutas + elección (C · Hora dorada anotada)
- [x] Planta, trayectoria y puntos de interés (`check:path` superado)
- [x] Muestra: exterior + umbral + interior
- [x] Producción completa: 5 capítulos, detalles, estancias, contacto, sonido, movimiento reducido, versión sin WebGL
- [x] Verificación: QA 30/30, axe 0 incumplimientos, capturas 390/768/1440
- [x] Crítica independiente 1 → 59,75/100 (`revisiones/critica-2026-10-05.md`)
- [x] Iteración 1 (ver tabla)
- [ ] Crítica independiente 2 tras iteración 1
- [ ] Entrega

## Iteración 1 — respuesta a la crítica
| Defecto | Corrección aplicada |
|---|---|
| D3 · puntos de detalle «fantasma» en el capítulo IV | Desaparición inmediata (`visibility:hidden`) y fundido de entrada por tiempo, no por fotograma |
| D3 · mismo bloque de texto en los 5 capítulos | Composición por capítulo (`layout`: I/V abajo-izq., II arriba-dcha., III columna arriba-izq. con leyenda numerada, IV centrado en el hueco del ventanal); tamaño de título variable; CTA final único + enlace secundario |
| D3 · raíl sin números en móvil, velo excesivo | Numerales romanos visibles en móvil; velo limitado; leyenda de detalles en una fila desplazable |
| D3 · pulso infinito de los puntos | Eliminado (anillo estático, realce en hover/foco) |
| D1 · suite vacía y desproporcionada (m² incoherentes) | Tabique-armario de roble, alfombra bajo la cama, butaca, jarrón con ramas, cerámica en mesilla, libro; puerta pivotante abierta contra el muro; superficie anunciada corregida a 250 m² (coherente con la geometría) |
| D1 · encuadre que cortaba la cama y oscuro | Clave III en diagonal (cama, bañera, muro de piedra y ventanal en un plano), FOV 48, mirada propia en vertical (`lookP`), exposición +0,4 EV en el capítulo III |
| D1 · lámparas facetadas | Perfil de torneado muestreado (28 puntos) |
| D2 · rocas blancas | Base de piedra oscura, aplanadas y enterradas |
| D2 · halos en follaje | Dilatación de color bajo alfa 0 + `alphaToCoverage` con MSAA |
| D2 · montañas planas | Silueta dentada de bosque en cordilleras cercanas, canchales y nieve en la lejana |

## Pendiente conocido
- Interiores propios de «Suite Agua» y «Estudio Piedra»: sus tarjetas usan planos del muelle y del patio (entorno), no interiores modelados.
- Profundidad de campo en el capítulo I (propuesta de la crítica): no aplicada por coste de render.
- Medición de fluidez en hardware con GPU.
