# Guía de adaptación a un cliente

El proyecto separa **contenido**, **recorrido**, **escena** e **interfaz**. Para adaptar SILVA a otro hotel, alojamiento singular o estudio de arquitectura:

## 1. Marca y contenidos — `src/config/brand.js`
| Clave | Qué cambiar |
|---|---|
| `name`, `descriptor`, `locationLabel`, `coordinates` | Nombre, descriptor, ubicación (o «concepto») |
| `contact.email`, `contact.subject` | **Obligatorio antes de publicar**: sustituir `hola@silva.example` por la dirección real |
| `chapters[]` | Numeral, título en dos líneas, cuerpo, nota técnica de cada capítulo |
| `hotspots[]` | Detalles de la estancia: posición 3D, perspectiva de cámara (`view`), texto y especificaciones |
| `rooms[]` | Estancias: nombre, superficie, imagen, texto alternativo, rasgos |
| `palette` | Colores de referencia (la interfaz usa los tokens de `src/styles/main.css`) |

Los títulos `<title>`, `description` y `og:*` están en `index.html`.

## 2. Tipografía y color — `src/styles/main.css`
Tokens en `:root` (`--ink`, `--bone`, `--stone`, `--ember`, `--f-display`, `--f-body`, `--f-mono`, escala `--t-*`). Las fuentes se importan en `src/main.js` desde `@fontsource/*` (licencia OFL, servidas desde el propio sitio).

## 3. Recorrido — `src/journey/keys.js`
Cada clave define `pos`, `look`, `fov`, `hold` (pausa), `move` (longitud del tramo) y `ch` (capítulo). Marca con `still: true` el plano fijo de cada capítulo (movimiento reducido, navegación y renders estáticos). Tras cualquier cambio:
```bash
npm run check:path   # colisiones con muros/mobiliario y altura sobre el terreno
```

## 4. Escena — `src/scene/`
| Archivo | Contenido |
|---|---|
| `architecture.js` | Volúmenes del edificio (muros con huecos, cubiertas, ventanal, terraza, muelle) |
| `furniture.js` | Mobiliario, textiles, lámparas y sus luces |
| `landscape.js` | Terreno, orilla, lago, montañas, vegetación |
| `textures.js` / `materials.js` | Texturas procedurales y materiales PBR |
| `atmosphere.js` | Cielo, sol, niebla, hora del día por capítulo |
| `engine.js` | Calidad, postprocesado, bucle, proyección de hotspots |

Para un cliente con proyecto real se recomienda sustituir la arquitectura procedural por un modelo **glTF** del estudio (exportado desde Rhino/Revit/Blender) cargado con `GLTFLoader` + compresión Draco/KTX2, manteniendo el sistema de recorrido, capítulos e interfaz.

## 5. Renders de la versión estática
Con la build servida (`npm run build && npm run preview`):
```bash
node scripts/renders.mjs      # genera public/renders/*.webp (horizontal y vertical)
npm run build                 # vuelve a empaquetar con los nuevos renders
```

## 6. Contacto y reservas
- Actual: `mailto:` prerrellenado. Funciona sin servidor y declara que el correo no se ha enviado.
- Pendiente para producción: endpoint de formulario (p. ej. función serverless o servicio de formularios del cliente) con protección antispam y aviso de privacidad. Sustituir el manejador `submit` de `src/ui/contact.js`.
- **Reservas**: no hay motor de reservas conectado. Solo debe enlazarse uno real (el PMS/motor del hotel) cuando esté contratado y probado.

## Alcance vendible (sin precios ni ingresos)
Plantilla de recorrido 3D narrativo por capítulos con: marca configurable, carga progresiva real, versión de movimiento reducido, versión sin WebGL con renders, hotspots con perspectiva de cámara, estancias y contacto operativo. Integraciones pendientes por proyecto: formulario con servidor, motor de reservas, analítica con consentimiento, modelo glTF del cliente, idiomas.
