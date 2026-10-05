# Evidencias

Entorno de prueba: contenedor Linux, 4 núcleos, **sin GPU**. Chromium 1194 headless con WebGL por SwiftShader (render por CPU). Etiquetas: *observado* (ejecutado aquí), *documentado* (fuente externa), *inferido*.

## Trayectoria (observado)
```
Sólidos: 33 · muestras: 4001 · longitud: 23.95 pantallas
Distancia mínima: 0.782 m en u=11.04 pos=-1.58,1.8,-5.96
OK: ninguna muestra a menos de 0.3 m de un sólido.
Altura mínima sobre el terreno exterior: 1.44 m en 2.6,9.4,74
```

## QA funcional — `node scripts/qa.mjs` (observado, 2026-10-05)
```
OK   Sin desbordamiento horizontal a 390px (estático) — {"sw":390,"W":390,"bad":[]}
OK   Versión estática con 5 planos de capítulo a 390px
OK   Consola sin errores (estático 390px)
OK   Sin desbordamiento horizontal a 768px (estático) — {"sw":768,"W":768,"bad":[]}
OK   Versión estática con 5 planos de capítulo a 768px
OK   Consola sin errores (estático 768px)
OK   Sin desbordamiento horizontal a 1440px (estático) — {"sw":1440,"W":1440,"bad":[]}
OK   Versión estática con 5 planos de capítulo a 1440px
OK   Consola sin errores (estático 1440px)
OK   Primer foco: enlace de salto — Saltar al contenido: estancias y contacto
OK   Menú se abre y enfoca
OK   Esc cierra el menú y devuelve el foco
OK   Menú → capítulo IV navega y enfoca su título — {"ch":"apertura","focus":"t-apertura"}
OK   Raíl → capítulo I
OK   Detalle de la suite se abre con contenido y foco — {"open":true,"title":"Bañera exenta de piedra","focus":"detail-title"}
OK   Esc cierra el detalle y devuelve el foco
OK   Diálogo de estancia abre con datos
OK   Diálogo de estancia cierra con Esc
OK   Formulario vacío marca 3 errores y enfoca el primero — f-name,f-email,f-msg
OK   Formulario válido prepara mailto con datos — mailto:hola@silva.example?subject=Solicitud%20de%20informaci%C3%B3n%20%E2%80%94%
OK   Estado declara que no se ha enviado — Hemos preparado el correo en tu aplicación de correo. Aún no se ha enviado: revísalo y pul
OK   Consola sin errores (recorridos estáticos)
OK   Movimiento reducido activa planos fijos — {"mode":"reduced","rm":true}
OK   Salto a capítulo V usa el plano fijo final (clave 13) — 13
OK   Consola sin errores (movimiento reducido)
OK   Sin WebGL: cae a la versión estática
OK   Carga de la escena (SwiftShader, calidad baja) — 9957 ms hasta escena lista
OK   Hotspots visibles en la suite — lino,lampara
OK   Detalle mueve la cámara a la perspectiva adicional — mezcla 0.93
OK   Consola sin errores (en vivo)

30/30 comprobaciones superadas
```

## Pesos de la build (observado)
| Recurso | Tamaño | gzip |
|---|---|---|
| `index-fzcfVrJc.js` | 196 KB | 57 KB |
| `engine-DA77OYEN.js` | 396 KB | 102 KB |
| `index-Besx72cG.css` | 48 KB | 23 KB |
| Fuentes woff2 (latín) | 78 KB | — |
| Renders estáticos (10 webp, solo versión estática y estancias) | 1828 KB | — |

El motor 3D (`engine-*.js`) se carga de forma diferida tras pintar el HTML. Las texturas no se descargan: se generan en el navegador.
