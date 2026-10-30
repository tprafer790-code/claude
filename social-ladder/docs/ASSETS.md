# Assets: arte, audio y tipografías

Todo el arte y el audio del juego son **originales y se generan por código** en tiempo de ejecución. No hay imágenes, sprites ni pistas de audio de terceros.

## Pixel art

| Elemento | Archivo | Técnica |
|---|---|---|
| Paleta "Ladder 40" | `src/render/palette.ts` | 40 colores definidos a mano |
| Personaje (20×28 px, 6 fotogramas) | `src/render/hero.ts` | Dibujado píxel a píxel en `<canvas>`; aspecto distinto por etapa y según ropa/accesorio equipados |
| Escenarios (240×135 px nativos) | `src/render/environments.ts` | Un escenario procedural por etapa (callejón, barrio obrero, zona residencial, centro urbano, mansión, lujo extremo, absurdo, cosmos) con zonas interactivas |
| Accesorios de escena (vehículos, etc.) | `src/render/environments.ts` (`buildProp`) | Procedural |
| 50 iconos de 10×10 px | `src/render/icons.ts` | Mapas de caracteres convertidos a imagen |
| Favicon | `public/favicon.svg` | SVG escrito a mano |

La escena se escala con `image-rendering: pixelated` para mantener la nitidez de los píxeles.

## Audio

`src/audio/audio.ts` sintetiza con WebAudio todos los efectos (clic, moneda, compra, ascenso, logro, evento, secreto, prestigio…) y un bucle chiptune cuya tonalidad y tempo cambian en cada etapa. No se usan muestras ni música con licencia. El audio solo se activa tras la primera interacción del usuario.

## Tipografías

| Fuente | Licencia | Origen |
|---|---|---|
| Press Start 2P | SIL Open Font License 1.1 | paquete npm `@fontsource/press-start-2p` |
| Pixelify Sans | SIL Open Font License 1.1 | paquete npm `@fontsource/pixelify-sans` |

## Marcas

El contenido evita marcas registradas. Por ejemplo, los rangos del borrador original basados en marcas se renombraron a "Streaming Subscriber" y "Flat-Pack Furniture Investor".
