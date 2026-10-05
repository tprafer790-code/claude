# Contrato — SILVA, un refugio que se descubre

| Campo | Contenido |
|---|---|
| Objetivo | Web experiencial con recorrido 3D continuo por un refugio boutique (bosque, piedra, agua) que despierte el deseo de alojarse y termine en «explorar estancias» y «solicitar información». |
| Audiencia | Viajero de alto poder adquisitivo y sensibilidad arquitectónica; secundariamente, hoteles / estudios de arquitectura que comprarían la plantilla. |
| Tareas esenciales | 1) Recorrer los 5 capítulos con scroll. 2) Saltar a un capítulo. 3) Consultar detalles de la suite (hotspots con contenido). 4) Ver las estancias. 5) Solicitar información por un medio operativo. |
| Alcance | Sitio estático (Vite + Three.js), marca configurable, alternativa sin WebGL y con movimiento reducido. |
| Entregables | Código fuente, build ejecutable, capturas reales, documentación de estudio, guía de adaptación, licencias. |
| Restricciones | Sin hotel real, disponibilidad, testimonios ni reservas. Sin backend: contacto por `mailto:` con datos prerrellenados; integración de formulario pendiente y declarada. No publicar ni desplegar. |
| Recursos | Sin modelos ni fotografía con licencia disponibles: geometría y texturas procedurales generadas en código (canvas/shaders). Tipografías de Google Fonts (OFL). |
| Criterios | Rúbrica del estudio ≥85 y ninguna dimensión <7; sin bloqueantes; capturas a 390 y 1440 px de cada capítulo. |

## Requisitos vs supuestos vs propuestas
- **Requisitos**: 5 capítulos, scroll + navegación por capítulos, hotspots útiles, móvil, movimiento reducido, fallback sin WebGL, contacto operativo sin simulación.
- **Supuestos**: «SILVA» provisional; ubicación ficticia no geolocalizada («un valle de montaña»); correo de contacto de ejemplo configurable (`hola@silva.example`), declarado como placeholder de cliente.
- **Propuestas**: sonido ambiental procedural (Web Audio, sin archivos) con activación voluntaria.
