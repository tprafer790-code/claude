# SILVA — Referencias verificables y principios

Fecha de consulta de todas las fuentes: **2026-10-05**.
Autor: especialista de Investigación de referencias.

## Nota de método (leer antes de usar)

- **Ningún sitio original pudo abrirse.** El proxy de salida de este entorno bloqueó WebFetch a awwwards.com, videinfra.com, immersive-g.com, igloo.inc, 7132.com y engineering.q42.nl (error `EGRESS_BLOCKED`). Por tanto **no hay ninguna referencia «observada»**: todo lo que sigue sale de fragmentos de resultados de WebSearch (títulos, URL y extractos de páginas de awwwards.com, commarts.com, videinfra.com, hontran.dev) → etiqueta **documentado**. Lo que deduzco yo va como **inferido**.
- Aunque se hubieran podido abrir, casi todos son WebGL: WebFetch solo vería el HTML/`<canvas>`, no la cámara ni los materiales. **Hay que comprobarlo a mano en un navegador** (escritorio y móvil, con y sin `prefers-reduced-motion`) antes de usar estas notas en la dirección de arte.
- Premios: se marca **verificado (documentado)** cuando aparece en una URL de awwwards.com / sitio del estudio / jurado en los resultados de búsqueda. Si la única fuente es el propio autor o no hay fuente, se escribe **«sin verificar»**.
- Los análisis de cámara, materiales, etc. se limitan a lo que dicen las fuentes. Donde no dicen nada se escribe «sin datos».

---

## R1 · Igloo Inc

- **URL:** https://www.igloo.inc/ · caso de estudio: https://awwwards.com/igloo-inc-case-study.html
- **Reconocimiento:** Awwwards Site of the Year 2024 + Developer Award (+ Honors Business & Services, julio 2024). Fuente: resultado de búsqueda que apunta al caso de estudio en awwwards.com → **verificado (documentado)**. Autoría: el extracto cita a Bureaux como colaborador del diseño; la atribución del desarrollo a abeto es **sin verificar**.
- **Disciplina:** desarrollo creativo WebGL (Three.js), landing corporativa.
- **Cámara:** transiciones de cámara ligadas al scroll entre escenas 3D (documentado, genérico).
- **Composición:** solo **tres secciones**; el reto declarado fue mantener el interés en un recorrido corto con elementos interactivos (documentado).
- **Materiales:** sin datos en las fuentes (el motivo del hielo es conocido por el nombre; no verificado en esta sesión).
- **Transiciones:** sin datos concretos.
- **Navegación:** «scrollable and user-friendly navigation» para mostrar las empresas del portfolio (documentado).
- **Móvil:** **ejemplar en móvil** según las fuentes: se le describe como uno de los sitios Three.js mejor construidos, que mantiene el rendimiento en dispositivos de gama baja, cosa que a la mayoría de sitios con esa complejidad les cuesta en teléfonos (documentado).
- **Principio extraído:** *pocos capítulos, muy pulidos, con un presupuesto de rendimiento pensado desde la gama baja.* La complejidad visual no excusa una mala experiencia en móvil.
- **Limitación:** marca tecnológica/cripto, no hospitalidad; estética de producto, no de lugar. No sirve de modelo de conversión.
- **Aplicación a SILVA:** nuestros 5 capítulos ya son el máximo razonable; ningún capítulo de relleno. Definir un perfil de calidad «gama baja» (DPR limitado, sombras horneadas, menos vegetación instanciada) y probar primero en un Android medio, no en el portátil.
- **Evidencia:** documentado.

## R2 · Rainforest Foods — Immersive Garden

- **URL:** caso del estudio https://immersive-g.com/projects/rain-forest-food · caso en Awwwards https://awwwards.com/case-study-rainforest-foods-by-immersive-garden.html (23-06-2017)
- **Reconocimiento:** Awwwards Site of the Month (primer SOTM de 2017), Awwwards SOTD, FWA SOTD, CSSDA SOTD. Fuente del SOTM: https://www.awwwards.com/immersive-garden-wins-sotm-with-rainforest-food-experience.html → **verificado (documentado)**. FWA y CSSDA: aparecen solo en la página del estudio → FWA **sin verificar** en thefwa.com.
- **Disciplina:** experiencia de marca inmersiva, naturaleza / bienestar.
- **Cámara:** «dynamic camera movements», distorsión de imagen y parallax (documentado).
- **Composición:** **recorrido horizontal deslizante**; fotomontajes en WebGL más que modelado 3D completo (documentado).
- **Materiales:** fotomontaje + distorsión; difumina la frontera entre 3D y arte digital (documentado).
- **Transiciones:** botón «explore» que revela detalles ocultos (documentado).
- **Navegación:** lineal horizontal con descubrimiento por capas (documentado).
- **Sonido:** sonidos de naturaleza (lluvia), citas filosóficas; detalles interactivos como un camaleón que cambia de color (documentado).
- **Móvil:** sin datos.
- **Principio extraído:** *la naturaleza se cuenta por capas y por sentidos, no por realismo.* El sonido ambiente y los microdetalles vivos dan presencia con poca geometría.
- **Limitación:** es de 2017; el lenguaje visual y la técnica han envejecido; es e-commerce de alimentación, no un lugar habitable.
- **Aplicación a SILVA:** capítulo 1 (descubrimiento entre vegetación): capas de follaje en primer plano (planos con alfa o tarjetas) que se apartan con el scroll en vez de un bosque fotorrealista; audio ambiente (hojas, agua) **opcional y silenciado por defecto**, con control visible; uno o dos detalles vivos por capítulo (insecto, reflejo, hoja que cae).
- **Evidencia:** documentado.

## R3 · Primland Residences / «Explore Primland» — Outpost

- **URL:** ficha https://www.commarts.com/webpicks/primland-luxury-blue-ridge-mountain-resort (URL del sitio vivo no obtenida en las búsquedas).
- **Reconocimiento:** Communication Arts Webpick (documentado por la URL de commarts.com). Un extracto de búsqueda sobre el listado de awwwards.com (https://www.awwwards.com/inspiration_search/hotel/) cita «Explore Primland» como **Site of the Day el 04-02-2026** → documentado, pero **no abierto**; que «Explore Primland» sea el mismo proyecto de Outpost es **inferido**.
- **Disciplina:** inmobiliaria de lujo / resort de naturaleza; entorno virtual 3D.
- **Cámara:** «interactive site tour» por el paisaje de Blue Ridge (documentado; tipo de cámara exacto sin datos).
- **Composición:** sentido del lugar primero (paisaje), luego amenidades, luego cada propiedad en detalle (documentado).
- **Materiales / atmósfera:** **conmutador de estación** verano ↔ otoño; pájaros, niebla a la deriva, sonido ambiente (documentado).
- **Transiciones:** sin datos.
- **Navegación:** del territorio a la parcela: tour → galerías → planos (documentado).
- **Móvil:** concebido como herramienta de venta «accessible on any device», también en tablets y pantalla grande de una sala de ventas (documentado).
- **Conversión:** **referencia de conversión**: es explícitamente una «digital sales tool» con planos y galerías por propiedad (documentado).
- **Principio extraído:** *la atmósfera vende el lugar; los datos concretos (planos, galerías) cierran la venta.* La experiencia inmersiva lleva a contenido útil, no lo sustituye.
- **Limitación:** es venta de residencias, no reserva de noches; el ciclo de decisión es distinto.
- **Aplicación a SILVA:** capítulo 5 (agua al atardecer + CTA): tras la emoción, ofrecer información concreta de estancias (tipos de suite, capacidad, temporadas) y contacto en HTML normal. Una variación atmosférica controlada por el usuario (p. ej. hora del día o estación) es más memorable que otra animación automática; niebla y aves como capa ligera.
- **Evidencia:** documentado (premio Awwwards: documentado de forma indirecta, sin abrir).

## R4 · The Drake Hotel — Locomotive

- **URL:** https://www.thedrake.ca/ (dominio inferido; no abierto) · piezas en Awwwards: https://www.awwwards.com/inspiration/page-hero-the-drake-hotel , https://www.awwwards.com/inspiration/mobile-layouts-the-drake-hotel
- **Reconocimiento:** Awwwards Site of the Day, **02-09-2025**, según extracto de búsqueda sobre el listado de hoteles de awwwards.com → documentado, sin abrir. Autoría de Locomotive: documentada en las fichas de inspiración de Awwwards.
- **Disciplina:** web editorial de hospitalidad (hotel urbano con cultura, gastronomía y eventos).
- **Cámara:** no es 3D (inferido por la tipología de las piezas: heros, cabeceras, tarjetas, blog).
- **Composición:** heros de página, cabeceras, tarjetas, blog y contenido editorial (documentado por los nombres de las piezas de inspiración).
- **Materiales / transiciones:** sin datos.
- **Navegación:** arquitectura de contenido multipágina con blog (documentado).
- **Móvil:** tiene maquetaciones móviles destacadas en Awwwards (documentado: ficha «mobile layouts»). Calidad concreta: sin datos.
- **Principio extraído:** *el hotel se cuenta también con tipografía, voz editorial y contenido actualizable,* no solo con efectos.
- **Limitación:** sin 3D; marca urbana y desenfadada, alejada del tono de refugio silencioso de SILVA.
- **Aplicación a SILVA:** las capas HTML sobre el canvas (títulos de capítulo, textos de hotspots, ficha de estancias) deben tener calidad editorial propia y funcionar sin WebGL. Prever una página o sección «Diario / Lugar» indexable.
- **Evidencia:** documentado.

## R5 · Likova — Vide Infra

- **URL:** caso https://videinfra.com/work/likova · artículo https://videinfra.com/blog/likova-commercial-real-estate-website-design
- **Reconocimiento:** Awwwards Site of the Day + Developer Award, según la página del estudio → **sin verificar** en awwwards.com (solo fuente del propio estudio).
- **Disciplina:** inmobiliaria comercial (centro de negocios clase A), arquitectura.
- **Cámara:** modelo 3D interactivo; el plano del emplazamiento es un entorno WebGL «que recorres en vez de leer»; al girar el modelo se ve dónde están los edificios y las zonas (documentado).
- **Composición:** el volumen escalonado del edificio se convierte en **motivo de interfaz**: paneles escalonados que fluyen y se recomponen al hacer scroll (documentado).
- **Materiales:** vidrio y metal, patio verde, mirador (descripción del edificio, documentado). Tratamiento en render: sin datos.
- **Transiciones:** animación «afinada al ritmo de la forma del edificio» (documentado).
- **Navegación:** plano interactivo como mapa de la propiedad (documentado).
- **Móvil:** sin datos.
- **Principio extraído:** *la arquitectura dicta el lenguaje de la interfaz.* La forma del edificio se repite en el layout, las transiciones y la navegación.
- **Limitación:** oficinas, no hospitalidad; premio sin verificar.
- **Aplicación a SILVA:** derivar el sistema de transiciones de los materiales del propio refugio: cortes horizontales como sillares de piedra, máscaras que se abren como una lámina de agua, el marco del ventanal (capítulo 4) como marco literal de la UI. Un mini-plano 3D del refugio puede servir de índice de capítulos.
- **Evidencia:** documentado.

## R6 · 111 West 57th Street — Outpost

- **URL:** ficha https://www.awwwards.com/inspiration/immersive-experience-111-west-57th-street (sitio vivo no obtenido).
- **Reconocimiento:** aparece en la galería de inspiración de Awwwards; **premio sin verificar**.
- **Disciplina:** inmobiliaria residencial de ultralujo (rascacielos en Nueva York).
- **Cámara:** secuencia de introducción **volando a través de nubes** («Above the Clouds — 111 W 57») (documentado).
- **Composición / materiales / transiciones / navegación / móvil:** sin datos.
- **Principio extraído:** *una única metáfora de entrada (atravesar las nubes = llegar arriba) resume la propuesta de valor en segundos.*
- **Limitación:** muy poca información disponible; el vuelo de intro es un recurso muy visto.
- **Aplicación a SILVA:** la entrada del capítulo 1 debe resumir la promesa (apartarse del mundo → refugio) con un gesto propio —atravesar follaje hacia la luz— en lugar de un dron genérico. Debe poder saltarse.
- **Evidencia:** documentado (escaso).

## R7 · Iventions — Hon Tran (referencia de movimiento reducido)

- **URL:** caso https://www.hontran.dev/blog/iventions-award-winning-events-website-case-study
- **Reconocimiento:** CSS Design Awards Website of the Month (octubre 2025), finalista Website of the Year 2025, Awwwards SOTD + Developer Award, **según el propio desarrollador** → **sin verificar** en awwwards.com / cssdesignawards.com.
- **Disciplina:** web de eventos, Next.js + Three.js + GSAP.
- **Cámara / composición:** coreografía de «spotlight» + WebGL (documentado, sin detalle).
- **Materiales:** sin datos.
- **Transiciones:** animaciones compuestas en GPU (documentado).
- **Navegación:** sin datos.
- **Móvil / rendimiento:** WebGL con **inicialización diferida** y animaciones en GPU para dejar libre el hilo principal y mantener el scroll fluido (documentado).
- **Accesibilidad:** `gsap.matchMedia()` activa la coreografía completa solo con `(prefers-reduced-motion: no-preference)`; con movimiento reducido el sitio sigue siendo usable **sin bifurcar el código** (documentado, con fragmento de código en la fuente).
- **Principio extraído:** *el movimiento reducido es una rama de la misma coreografía, no un sitio aparte.*
- **Limitación:** no es hospitalidad; premios sin verificar; fuente única y autopromocional.
- **Aplicación a SILVA:** envolver todas las timelines de cámara en `gsap.matchMedia()` (o equivalente). Con movimiento reducido: cortes con fundido entre 5 planos fijos (uno por capítulo), sin parallax ni movimientos de cámara continuos, hotspots en lista HTML. Inicializar el renderer tras el primer pintado del contenido HTML.
- **Evidencia:** documentado.

---

## Referencias consideradas y descartadas (sin datos suficientes)

- **7132 Hotel Vals** (piedra y agua, Vals, Suiza): solo aparece como ficha de inspiración en Awwwards (https://www.awwwards.com/inspiration/7132-hotel-vals-the-design-spa-hotel-switzerland); premio y estudio **sin verificar**. Temáticamente es la más cercana a SILVA; **merece revisión manual en navegador**.
- **ERA — Vide Infra** (residencial de lujo, selector 3D de apartamentos): FWA of the Day según el estudio → sin verificar; muy parecida a Likova.
- **Oculi Mundi — Q42 + Fabrique**: experiencia 3D de colección de mapas con objetivos explícitos de accesibilidad; Bronce European Design Awards 2024 (https://awards.europeandesign.org/winner/260409, documentado). No se pudo leer el detalle técnico (engineering.q42.nl bloqueado). Útil si se quiere ampliar la parte de accesibilidad.
- **Kamezí Boutique Villas (2mas2)**: solo fichas de inspiración; premio sin verificar.

---

## Principios transversales (síntesis)

1. **Pocos capítulos, cada uno con una sola idea** (R1, R6).
2. **Atmósfera primero, datos útiles después; el CTA vive en HTML real** (R3, R4).
3. **La arquitectura y los materiales del lugar generan el lenguaje de la UI y las transiciones** (R5).
4. **La naturaleza se sugiere por capas, sonido opcional y microvida, no por fotorrealismo total** (R2, R3).
5. **Rendimiento diseñado desde la gama baja y WebGL diferido** (R1, R7).
6. **Movimiento reducido = misma narrativa con planos fijos y fundidos** (R7).
7. **El usuario controla una variable atmosférica** (estación / hora) como interacción significativa (R3).

## Oportunidades de diferenciación para SILVA

1. **Hospitalidad + recorrido 3D narrativo es un hueco real**: las referencias 3D fuertes encontradas son inmobiliaria (Likova, Primland, 111 W 57) o tecnológicas (Igloo); las de hotel premiadas (Drake) son editoriales sin 3D. SILVA puede unir ambas: recorrido emocional + capa editorial y de reserva seria (inferido a partir de la muestra; muestra pequeña).
2. **Silencio como recurso**: frente a intros espectaculares, un ritmo lento, con pausas de cámara y sonido ambiente opcional, coherente con «refugio» (inferido).
3. **Hora del día controlable** (de la mañana entre árboles al atardecer en el agua) como hilo conductor y como interacción opcional en el capítulo 5, en la línea del conmutador de estación de Primland (R3).
4. **Transiciones derivadas de piedra y agua** (cortes en sillar, reflejos, ondas) en lugar de los fundidos y distorsiones genéricos (R5).
5. **Versión de movimiento reducido cuidada como producto**: 5 planos fijos de gran calidad + texto, que también sirve de fallback sin WebGL y de base SEO/compartir (R7).

## Clichés a evitar

- Vuelo de dron/intro larga sin opción de saltar (R6 lo usa; muy visto).
- Pantalla de carga con porcentaje que bloquea todo el contenido.
- Cursor personalizado que sustituye al del sistema y «magnetismo» en todos los botones.
- Scroll secuestrado con inercia exagerada que rompe el gesto nativo en móvil.
- Distorsión RGB / glitch / ruido líquido en las imágenes (no casa con piedra y bosque).
- Partículas flotantes, «luciérnagas» y bloom excesivo como relleno atmosférico.
- Texto gigante en mayúsculas con letras que entran una a una en cada sección.
- Audio que arranca solo.
- Hotspots pulsantes en bucle que no se pueden leer por teclado ni lector de pantalla.
- CTA de reserva escondido al final del recorrido como única vía de conversión (debe existir un acceso persistente).

## Pendiente (para quien tenga navegador)

- Abrir cada sitio en escritorio y en un móvil real y pasar las etiquetas de «documentado» a «observado».
- Confirmar en awwwards.com / thefwa.com los premios marcados «sin verificar» y la fecha de SOTD de Explore Primland y The Drake Hotel.
- Revisar 7132 Hotel Vals por su afinidad piedra/agua.
