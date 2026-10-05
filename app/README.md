# Sinapsis

App de estudio para iPhone basada en *Aprender a aprender* (Héctor Ruiz Martín), pensada para TDA.

- `sinapsis.html`: código fuente (se publica como Artifact en claude.ai).
- `index.html`, `manifest.webmanifest`, `sw.js`, `icons/`: versión PWA instalable y sin conexión, para alojar en cualquier servidor web (por ejemplo GitHub Pages). Se regenera con `node build.js`.

Funciones: misión diaria (ritual de foco → evocación entrelazada → aprender lo nuevo relacionándolo → comprobación), criterio de dominio 3/3 en días distintos, hoja en blanco, temporizador de foco con ruido marrón opcional, planificación por fecha de examen, reto en equipo, creación de tarjetas con IA (solo dentro de claude.ai), XP, niveles y rachas.
