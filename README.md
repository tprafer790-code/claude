# SILVA — un refugio que se descubre

Web experiencial con **recorrido 3D continuo** (Three.js) por un refugio arquitectónico conceptual entre bosque, piedra y agua. Cinco capítulos controlados por scroll, navegación por capítulos, detalles explorables en la suite, estancias y contacto operativo. Incluye versión de **movimiento reducido** y versión **sin WebGL** con renders reales de la escena.

> Proyecto conceptual: SILVA no es un alojamiento existente. No hay disponibilidad, tarifas, reseñas ni reservas.

## Abrir
```bash
npm install
npm run dev          # desarrollo en http://localhost:5173
npm run build        # genera dist/ (sitio estático, rutas relativas)
npm run preview      # sirve dist/ en http://localhost:4173
```
`dist/` funciona desde cualquier servidor estático o subcarpeta. Abrir `dist/index.html` directamente con `file://` no funciona (los módulos ES requieren servidor).

Parámetros útiles: `?q=high|medium|low` (calidad), `?reduced` (movimiento reducido), `?static` (versión sin 3D), `?capture&dpr=1` (solo escena, para renders).

## Estructura
```
src/config/brand.js     marca, capítulos, detalles, estancias, contacto
src/journey/            claves de cámara y evaluación del recorrido
src/scene/              texturas, materiales, arquitectura, mobiliario, paisaje, atmósfera, motor
src/ui/                 capítulos, contacto, estancias, sonido ambiente
src/styles/main.css     tokens y estilos
scripts/                comprobación de trayectoria, capturas, renders, QA
docs/                   estudio (contrato, referencias, dirección, decisiones, evidencias) y guía de adaptación
public/renders/         renders reales para la versión estática y las estancias
```

## Verificación
```bash
npm run check:path               # colisiones de cámara y altura sobre el terreno
node scripts/qa.mjs              # pruebas funcionales (con preview en marcha)
node scripts/shoot.mjs           # capturas por capítulo
```
Estado de las verificaciones: `docs/estudio/proyecto/evidencias.md`. Estado de entrega y pendientes: `docs/estudio/proyecto/entrega.md`.

## Licencias
| Recurso | Licencia |
|---|---|
| three.js | MIT |
| Vite | MIT |
| Instrument Serif, Hanken Grotesk, Geist Mono (vía @fontsource) | SIL Open Font License 1.1 |
| Texturas, geometría, vegetación, sonido | Generados por código en este repositorio |
| Renders de `public/renders/` | Capturas de la propia escena |

Adaptación a otro cliente: [`docs/guia-adaptacion.md`](docs/guia-adaptacion.md).
