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
- [x] Crítica independiente 2 → 62,75/100 (`revisiones/critica-2-2026-10-05.md`)
- [x] Iteración 2 (ver tabla)
- [x] Crítica independiente 3 → 66,5/100 (`revisiones/critica-3-2026-10-05.md`)
- [x] Entrega como **incompleta** respecto al umbral de calidad (`entrega.md`)

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

## Iteración 2 — respuesta a la segunda crítica
| Defecto | Corrección aplicada |
|---|---|
| N1 · «250 m²» no creíble para una suite | La unidad pasa a ser **Casa Bosque** (casa de 250 m² con dormitorio, baño abierto y sala de lectura), coherente con la geometría modelada |
| N1 · plano con exceso de techo/suelo, cama cortada | Cámara a 1,5 m, FOV 40, mirada centrada en cama-bañera-ventanal |
| N1 · alfombra roja saturada, roble «cebra», bañera flotando | Alfombra bouclé cruda, roble con menos contraste y relieve, plataforma de piedra bajo la bañera |
| N2 · montañas lisas, destello junto a la torre | Nieve y canchales también en la cordillera intermedia; emisivo de la torre atenuado |
| N2 · MSAA fijo | 4 muestras en calidad alta, 2 en media |
| N3 · móvil con plantilla única y caja de velo | Raíl sustituido por indicador «III / V» en la cabecera; II y IV con texto arriba sobre el cielo; velo a sangre sin bordes; sin puntos de detalle bajo el panel |
| N3 · dos CTA ámbar en V | El CTA de cabecera pasa a contorno en el capítulo final |

## Pendiente conocido
- Interiores propios de «Suite Agua» y «Estudio Piedra»: sus tarjetas usan planos del muelle y del patio (entorno), no interiores modelados.
- Profundidad de campo en el capítulo I (propuesta en ambas críticas): no aplicada; coste alto en móviles y no verificable sin GPU.
- Follaje y hierba de tarjetas: mejorados pero siguen leyéndose como vegetación en tiempo real, no fotorrealista. Para un cliente real: árboles glTF con LOD o fotogrametría con licencia.
- Medición de fluidez en hardware con GPU.
