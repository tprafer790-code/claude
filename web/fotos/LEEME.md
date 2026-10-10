# Fotos de producto

La web busca aquí una foto por prenda. Mientras no existe, la ficha muestra la
ilustración con un recuadro discontinuo «Foto pendiente · código · color».

## Cómo añadir una foto

1. Genera la toma en Google Flow con su prompt (documento «Solera · Prompts para Flow»).
2. Descárgala y renómbrala con el **código de la toma**: `W1.jpg`, `T4.jpg`…
   (también valen `.png` y `.webp`).
3. Guárdala en esta carpeta `web/fotos/`.

La foto solo se muestra con el color en que se hizo la toma; al elegir otro color
en la ficha vuelve la ilustración. Se recorta para llenar la ficha (proporción 5:6)
y se ve completa en la pestaña «Foto» de la vista rápida, así que sirven tanto la
versión 3:4 como la 16:9.

## Las 16 tomas

| Código | Diseño | Prenda | Color de la foto | Archivo |
|---|---|---|---|---|
| W1 | 15° y bufanda | Sudadera con capucha | Marino | `W1.jpg` |
| W2 | Churrería | Sudadera con capucha | Chocolate | `W2.jpg` |
| W3 | Hibernando | Sudadera con capucha | Negro | `W3.jpg` |
| W4 | Sierra | Sudadera cuello redondo | Bosque | `W4.jpg` |
| W5 | Abuela | Sudadera cuello redondo | Arena | `W5.jpg` |
| W6 | Jacquard | Sudadera cuello redondo | Crudo | `W6.jpg` |
| S1 | Varsity 26 | Sudadera con capucha | Gris jaspeado | `S1.jpg` |
| S2 | Fuego lento | Sudadera con capucha | Negro | `S2.jpg` |
| S3 | Triple Solera | Sudadera con capucha | Chocolate | `S3.jpg` |
| S4 | Firma | Sudadera con capucha | Hueso | `S4.jpg` |
| T1 | Social Club | Camiseta | Crudo | `T1.jpg` |
| T2 | Frase minimal | Camiseta | Negro | `T2.jpg` |
| T3 | Insignia retro | Camiseta | Marino | `T3.jpg` |
| T4 | Siesta Club | Camiseta | Crudo | `T4.jpg` |
| T5 | Billete de ida | Camiseta | Blanco roto | `T5.jpg` |
| T6 | Vermut | Camiseta | Salvia | `T6.jpg` |

Para cambiar el código o el color asociado a una prenda, edita el objeto `PHOTOS`
en `web/index.html`.
