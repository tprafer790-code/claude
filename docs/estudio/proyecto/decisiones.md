# Decisiones

| # | Decisión | Motivo | Alternativas descartadas |
|---|---|---|---|
| 1 | **Three.js r180 + Vite**, sin React Three Fiber ni GSAP | Repositorio vacío: sin stack previo que respetar. Escena con un único recorrido y pocos estados de interfaz: R3F añade un modelo de reconciliación sin beneficio claro. La coreografía (Catmull-Rom + smootherstep) cabe en ~100 líneas sin dependencias. | R3F + drei (más peso y abstracción); GSAP ScrollTrigger (secuestra scroll si se usa con *pin*/*scrub* mal configurado) |
| 2 | **Scroll nativo** con amortiguación solo en la cámara | El scroll del documento es predecible, accesible (teclado, lectores, barra) y nunca se bloquea; la cámara lo sigue con un retardo exponencial (k = 4,2 s⁻¹). | Lenis/scroll virtual (cambia la física del scroll del usuario) |
| 3 | **Capítulos como `<section>` HTML** con altura proporcional a su tramo | Orden semántico real, anclas, foco y lectura sin 3D; la misma estructura sirve a los tres modos. | Texto pintado en WebGL (inaccesible) |
| 4 | **Texturas procedurales** (canvas/DataTexture) + normales derivadas | No hay fotografía ni modelos con licencia disponibles en el entorno; se generan en el navegador con progreso real. | Descargar texturas CC0 (red restringida; habría que verificar licencias) |
| 5 | Muro de **lajas en hiladas finas** en lugar de sillería regular | La primera versión leía como bloque de hormigón (captura en `capturas/`); las hiladas finas dan escala y luz rasante. | Sillería de 40 cm |
| 6 | **Ladera de llegada** (+8 m) | Desde cota 0 el refugio era solo un muro; desde arriba se leen cubiertas, patio, torre y lago. | Cámara aérea (rompe la escala humana) |
| 7 | Corte a negro de 320 ms para saltos de más de un capítulo | Evita atravesar 4–10 pantallas de recorrido a gran velocidad (desorienta); conserva orientación porque el destino es siempre un plano compuesto. | Desplazamiento suave largo |
| 8 | **Revelado de texto por tiempo en JS** (`--rv`) | En la prueba headless las transiciones CSS no avanzaban con fotogramas de varios segundos; el control por JS es determinista y respeta movimiento reducido. | Transiciones CSS por clase |
| 9 | Contacto por **mailto prerrellenado** | No hay backend; el formulario valida, prepara el correo y declara que no se ha enviado. | Simular envío (prohibido por contrato) |
| 10 | Versión estática con **renders reales** de la escena | La alternativa conserva la calidad editorial y no oculta una escena inacabada: son capturas del mismo mundo. | Ilustraciones o fotos de stock |
| 11 | Una luz puntual para las dos lámparas y sin luz en el pasaje | Medido: cada luz puntual encarece todos los píxeles; el efecto visual se mantiene con emisivos. | 6 luces puntuales |
