# QA — FLOOR/ONE «EL SUELO ES TUYO»

Toda la revisión la ha realizado el propio agente de producción (Claude) sobre renders reales. No ha intervenido ningún revisor externo. Las evidencias están en `qa/`.

## 1. Análisis de referencias y decisiones de modelado

| Ref. | Uso | Decisiones sobre zonas no visibles o ambiguas |
|---|---|---|
| 1 · producto | Autoridad sobre silueta, paneles, colores y marca | Lado medial: espejo del patronaje lateral (franja también en medial). Logo solo en lateral |
| 2 · macro | Escala de trama ≈1 mm/hilo, costura doble, fibra de gamuza | Hilo de costura gris oscuro en gamuza, naranja en la franja |
| 3 · despiece | Orden upper / plantilla / entresuela / suela | No se interpreta como estructura técnica real; sin etiquetas |
| 4 · bailarín | Plano bajo, pantalón negro holgado, luz cálida lateral | Solo piernas y pelvis; torso fuera de cuadro |

- **Franja lateral:** banda de ancho casi constante con curva propia. Se evita a propósito la silueta de logos ajenos.
- **Suela:** anillos concéntricos bajo el antepié y el talón, espiga en el resto y canal de flexión. Es una decisión de diseño conceptual, no un claim de prestaciones.
- **Lazada:** sustituida por un cierre recto entre los dos primeros ojales. La lazada paramétrica se leía como un aro artificial (iteración 3 del modelo).

## 2. Registro de defectos y correcciones

| # | Defecto observado | Causa | Corrección | Evidencia |
|---|---|---|---|---|
| 1 | Agujas que salían del modelo | `solidify` con offset uniforme en triángulos degenerados de los cortes | `use_even_offset=False` + limpieza de astillas | Vistas de control, iteraciones 1→2 |
| 2 | Ojales 1–2 inexistentes, cuello bajo | El recorte de apertura invadía el ojalillo | Apertura limitada y cuello recalibrado | Iteración 2 |
| 3 | Cuello y contrafuerte dentados | El recorte usaba la planta a ras de suelo; las paredes se inclinan hacia dentro con la altura | Solo plano de cuello; piezas superpuestas retiradas 4,5 mm del borde; ribete acolchado real | Iteraciones 3→4 |
| 4 | Lengüeta en forma de tabla o aleta | Tramo libre excesivo | Más corta, punta redondeada, 6,8 mm de acolchado | Iteraciones 2, 5 y v2 |
| 5 | Tirador en forma de paleta | Ancho y grosor invertidos en el barrido | Parámetros corregidos | Iteración 3 |
| 6 | **Ondas concéntricas en la gamuza a 4K** | Escalonado de vóxel: carcasa generada desde ocupación binaria | Carcasa desde campos de distancia **analíticos** (horma normalizada por su gradiente). Prueba con bump y color desactivados: ondas presentes antes y ausentes después | `qa/` hoja de animatic, plano 3; pruebas `rip_a/b/c` |
| 7 | Logo con la «O» deformada | Subdivisión con relleno de rejilla sobre glifos con huecos | Triangulación «beauty» sin subdivisión, offset 0,22 mm | Plano 13, antes y después |
| 8 | Coste de 100 s/fotograma | Pared del estudio iluminada (≈35 % del coste), interpolación cúbica de texturas, prácticas muestreadas como luces | Pared con sombreado no iluminado, prácticas fuera del muestreo, interpolación lineal, 8 muestras + OIDN | Perfil: 54,7 → 31 s |
| 9 | Pista naranja y sobreexpuesta, con aspecto de suelo mojado | Albedo alto, contraluz sin dirección, especular alto | Albedo ×0,24, `spread` 70° en contraluz y llave, especular 0,22, rugosidad +0,16 | `qa/lookdev_ABC.jpg` frente a hoja final |
| 10 | Luz práctica detrás del producto en el plano 1 | Ángulo de 255° en el eje de cámara | Reubicada; prácticas más tenues y anchas | Hoja del animatic |
| 11 | Macros lavados: gamuza negra en gris | Foco estrecho de 70 W a 30 cm | Foco a 18 W | `chk2` |
| 12 | Plano 13b sin silueta | Llave y relleno activos | Llave a 0, relleno a 0,15, contraluz reubicado | Fotograma 770 |
| 13 | Planos 12, 14 y 15 demasiado parecidos | Mismo azimut y altura | Plano 14 bajo, de tres cuartos frontal, a 35 mm | Fotograma 800 |
| 14 | Entresuela desenfocada y quemada en primer término (inicio de 3c) | Cámara demasiado baja | Cámara elevada 2 cm, objetivo en el canto de la puntera | Fotograma 168 |
| 15 | **Doble exposición en los cortes internos** (fotograma 159) | Los subfotogramas del obturador (±0,25) muestreaban el subplano anterior | `INNER_CUTS` en `shots.py`: el obturador no cruza cortes internos. Re-render de 135–136, 158–159, 405–406 y 750–751 | Fotograma 159, antes y después |
| 16 | Texto de línea con poco contraste sobre la pista | Fondo claro en el tercio inferior | Banda inferior oscurecida mientras está visible el texto | Animatic v01 frente al máster |

## 3. Limitaciones conocidas (no corregidas)

| Limitación | Motivo | Impacto |
|---|---|---|
| Máster a 1080p nativo; versión UHD reescalada | 6 min/fotograma a 4K en 4 CPU, unas 90 h | Declarado en nombre de fichero y README |
| Sin versión vertical | Otro render completo de unas 8 h | Pipeline preparado (`--vertical`, `VERTICAL=1`) |
| Bailarín estilizado: pantalón liso sin pliegues de tela, legible como maniquí | Sin simulación de tela ni rig de personaje en el entorno | Planos 9–10. Acción simple y apoyos plausibles; no se oculta con desenfoque |
| El torso asoma como forma clara en el borde superior al inicio del barrido | Encuadre bajo de 24 mm | Visible unos 0,3 s |
| Bordes de la franja naranja con ligera ondulación a corta distancia | Corte por isolínea sobre malla de marching cubes | Solo en macros |
| Luces prácticas visibles al fondo en el despiece | Diseño del estudio | Se leen como tubos de luz, no tapan producto ni texto |
| 8 muestras por píxel + OIDN | Presupuesto de CPU | Posible ruido temporal leve en sombras; ver §4 |

## 4. Verificaciones del máster

Completadas en la entrega final; ver §5.

## 5. Resultados de verificación

Pendiente de completar al finalizar el render.
