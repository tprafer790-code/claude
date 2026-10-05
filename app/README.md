# Sinapsis

App de estudio para iPhone basada en *Aprender a aprender* (Héctor Ruiz Martín), pensada para TDA.

- `sinapsis.html`: código fuente (se publica como Artifact en claude.ai).
- `index.html`, `manifest.webmanifest`, `sw.js`, `icons/`: versión PWA instalable y sin conexión, para alojar en cualquier servidor web (por ejemplo GitHub Pages). Se regenera con `node build.js`.

Funciones: material propio (texto, PDF o fotos) con estimación de tiempo y plan de estudio hacia atrás desde el examen (estudio + 3 evocaciones espaciadas por tema, tope de minutos al día y reorganización si te saltas sesiones); preguntas fabricadas a partir del material: test, verdadero o falso razonado, huecos en un párrafo, desarrollo con rúbrica corregido por Claude y simulacro cronometrado (los fallos pasan a tarjetas); misión diaria (ritual de foco → evocación entrelazada → aprender lo nuevo relacionándolo → comprobación), criterio de dominio 3/3 en días distintos, hoja en blanco, temporizador de foco con ruido marrón opcional, planificación por fecha de examen, reto en equipo, creación de tarjetas con IA (solo dentro de claude.ai), XP, niveles y rachas.
