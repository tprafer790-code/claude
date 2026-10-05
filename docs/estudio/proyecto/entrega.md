# Entrega — SILVA, un refugio que se descubre

**Estado: entregado como INCOMPLETO respecto al contrato de calidad.** El recorrido 3D está completo y funciona de principio a fin. La crítica independiente final puntúa **66,5/100** (objetivo ≥85, ninguna dimensión <7), con Identidad 6,5, Recursos y acabado 5,5 y Rendimiento 6,5 por debajo del umbral.

## Qué se entrega
| Elemento | Ubicación |
|---|---|
| Web ejecutable | `npm install && npm run build` → `dist/` (estático, rutas relativas); `npm run preview` |
| Código fuente | `src/` (marca, recorrido, escena, interfaz, estilos) |
| Recursos | Todo procedural (texturas, geometría, vegetación, sonido); renders reales en `public/renders/`; fuentes OFL vía @fontsource |
| Licencias | `README.md` → Licencias |
| Capturas reales | `docs/estudio/proyecto/capturas/` (5 capítulos × 390/768/1440) |
| Documentación de estudio | `contrato.md`, `referencias.md`, `direccion-visual.md`, `planta.md`, `decisiones.md`, `motion.md`, `3d.md`, `estado.md`, `evidencias.md`, `revisiones/` |
| Guía de adaptación | `docs/guia-adaptacion.md` |

## Verificaciones (observado en este entorno)
| Prueba | Resultado |
|---|---|
| Trayectoria (`npm run check:path`) | Sin colisiones (mín. 0,56 m a sólidos; 1,44 m sobre terreno) |
| QA funcional (`npm run qa`) | 30/30: desbordamientos 390/768/1440, teclado, menú, capítulos, detalles, estancias, formulario y mailto, movimiento reducido, caída sin WebGL, hotspots y perspectiva de detalle, consola sin errores |
| Accesibilidad automática (`node scripts/a11y.mjs`) | axe-core WCAG 2.1 A/AA: 0 incumplimientos en 6 pasadas (no evalúa contraste sobre la escena) |
| Crítica independiente | 59,75 → 62,75 → 66,5 en tres pasadas (otro contexto, sin acceso al razonamiento del autor) |

## No verificado
- **Fluidez real**: el entorno no tiene GPU (SwiftShader, varios segundos por fotograma). No se declara ninguna tasa de fotogramas.
- **Movimiento** entre capítulos: comprobado por código y fotogramas, no observado en tiempo real.
- **Referencias**: el proxy bloqueó la apertura de los sitios; evidencia solo documentada; varios premios «sin verificar».
- Últimos ajustes (contraste del raíl e indicador, retirada de la franja luminosa de la torre, etiqueta «Detalles de la casa») pasaron QA y axe, pero **no** se regeneraron capturas ni renders tras ellos: `renders/descubrimiento*.webp` aún muestra la franja.

## Pendientes priorizados (de la crítica final)
**P1**
1. Paisaje con aspecto de tiempo real: cordilleras lisas, lago del capítulo I opaco, reflejos con borde duro, pinos en abanico, hierba en tarjetas.
2. Plano clave de la Casa Bosque: exceso de suelo, sala de lectura fuera de cuadro, 2 de 5 detalles visibles y sin número, veteado del cabecero, tarima rojiza.
3. Medición en GPU real (portátil y móvil de gama media).

**P2**: raíl a 768–1100 px sobre vanos; corte del velo en II; encuadres verticales de III y V; discontinuidad de la tarima tras el vidrio en IV.

**P3**: interiores de «Suite Agua» y «Estudio Piedra» (sus tarjetas muestran el entorno); profundidad de campo en I; botones de cabecera rellenos solo en V.

## Qué haría falta para alcanzar el umbral (estimación de la crítica, inferida)
- Recursos con licencia: vegetación glTF con LOD, HDRI de atardecer, terreno DEM/fotogrametría; o redefinir la dirección hacia un estilo deliberadamente estilizado.
- Interior modelado en Blender con iluminación horneada.
- GPU real para medir y validar agua y profundidad de campo.
- 4–6 días adicionales y una nueva crítica.

## Integraciones pendientes
Formulario con servidor (hoy `mailto:` prerrellenado que declara que no se ha enviado), dirección de correo real (hoy `hola@silva.example`), motor de reservas (no existe; no se presenta como real), analítica con consentimiento, idiomas.
