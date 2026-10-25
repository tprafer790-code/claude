# Bottega Leonardo · Prompts de imagen y vídeo (Google Flow)

La web funciona completa sin estos archivos: los bocetos son SVG propios y el interludio oscuro muestra la cita. Las imágenes y vídeos son una **capa de lujo** que se activa sola al colocar cada archivo en su ruta.

## Reglas comunes a todos los prompts

| Regla | Motivo |
|---|---|
| Paleta cerrada: lapislázuli `#1b2d9e`, lapislázuli hondo `#101b6b`, papel `#f1e9d8`, tinta azul-negra `#191633`, pan de oro `#d6a640` | Las imágenes deben parecer de la misma sesión que la web |
| Siempre «sin texto, sin letras, sin marcas de agua, sin firmas» | El texto de la web es HTML real; letras generadas salen deformes |
| Nunca pedir «reproduce el dibujo de Leonardo» ni citar artistas vivos | Se piden reinterpretaciones originales «en el espíritu de un cuaderno renacentista» |
| Zona tranquila indicada en cada prompt | Ahí va el texto de la web |
| Generar 4 variantes y elegir la de trazo más limpio | Flow varía mucho en grano y en manos |

## Tabla de archivos

| # | Archivo | Hueco en la web | Proporción | Exportación |
|---|---|---|---|---|
| 1 | `assets/img/taller.webp` | Fondo del interludio «Principio» (imagen fija) | 16:9 | 2400 px, WebP calidad 80, < 350 KB |
| 2 | `assets/video/taller.mp4` | Mismo hueco, en movimiento (tiene prioridad sobre la imagen) | 16:9 | 1920 px, H.264, 8–10 s en bucle, sin audio, < 4 MB |
| 3 | `assets/img/og.jpg` | Vista previa al compartir el enlace | 1200 × 630 | JPG calidad 82 |
| 4 | `assets/video/trazo.mp4` | Opcional: pieza para redes / presentación del portfolio | 9:16 | 1080 × 1920, 6–8 s |
| 5 | `assets/video/ornitoptero.mp4` | Opcional: pieza para redes / caso de estudio | 1:1 | 1080 px, 6 s en bucle |

---

## 1 · Imagen del taller (interludio)

**Prompt:**

> Fotografía cinematográfica de un taller renacentista florentino de finales del siglo XV, de noche, iluminado por una sola vela a la derecha del encuadre. Sobre una mesa de madera de nogal gastada: un cuaderno abierto de papel verjurado color crema con dibujos a tinta sepia de engranajes y alas, una pluma de ganso apoyada en un tintero de vidrio, un compás de latón, un trozo de sanguina roja y una maqueta pequeña de madera de un ala articulada con tela de lino. Al fondo, en penumbra, estanterías con rollos de papel y frascos de pigmento. Luz cálida y baja (temperatura 2200 K), sombras profundas de un azul ultramar muy oscuro (#101b6b), con el polvo de lapislázuli molido en un mortero sobre la mesa como único punto de color frío, reflejos suaves en el latón, polvo flotando en el haz de luz. Objetivo de 50 mm, f/2, profundidad de campo corta con el cuaderno nítido. **Toda la mitad izquierda y el tercio inferior en sombra casi negra y sin objetos, para colocar texto encima.** Grano de película fino, color sobrio, sin saturar. 16:9, sin personas, sin texto, sin letras legibles, sin marcas de agua.

**Variante móvil (opcional, 4:5):** el mismo prompt cambiando el final por «encuadre vertical, la mesa ocupa el tercio superior y la mitad inferior queda en sombra para el texto».

## 2 · Vídeo del taller (interludio)

**Prompt (imagen a vídeo, partiendo de la imagen 1):**

> Plano fijo, cámara sobre trípode con un empuje casi imperceptible hacia el cuaderno (dolly-in de 2 cm en 8 segundos). La llama de la vela parpadea suavemente y hace oscilar las sombras; motas de polvo flotan lentamente en el haz de luz; la página del cuaderno se levanta un milímetro con una corriente de aire y vuelve a su sitio. Nada más se mueve. Sin personas, sin cortes, sin texto. Movimiento muy lento y calmado, pensado para un bucle sin costura: el último fotograma coincide con el primero. 8 segundos, 24 fps.

**Comprobación:** si el bucle «salta», recortar a la mitad y unir en espejo (avance + retroceso) en cualquier editor.

## 3 · Imagen para compartir (og.jpg)

> Composición minimalista sobre papel teñido de azul ultramar profundo (#1b2d9e), como el papel preparado renacentista, con fibras visibles: en el tercio derecho, un dibujo a tiza blanca marfil (#f3ecdc) de un tornillo aéreo helicoidal sobre una plataforma circular de madera, con sombreado de líneas cruzadas, y una pequeña línea de cota en pan de oro (#d6a640). Trazo seguro, en el espíritu de un cuaderno de ingeniería renacentista, reinterpretación original. **Los dos tercios izquierdos vacíos**, solo papel. Luz plana y uniforme de escáner, sin sombras de objetos. 1200 × 630, sin texto, sin letras, sin marcas de agua.

Después, en Canva o similar, añadir a la izquierda «Saber *ver*.» en Bodoni Moda (con «ver.» en Bodoni Moda cursiva 900 y pan de oro (#d6a640)) y «Bottega Leonardo» en Manrope pequeña.

## 4 · Vídeo vertical «el trazo» (redes)

> Macro cenital sobre papel verjurado color crema: una pluma de ganso con punta de metal mojada en tinta sepia dibuja, en tiempo real, una espiral de agua que se enrosca hacia dentro, con trazo fino que se ensancha al apoyar. La tinta se absorbe en las fibras del papel y deja un borde ligeramente más oscuro. Luz lateral cálida de ventana, sombra suave de la mano fuera de cuadro (solo se ve la pluma). Cámara fija, foco en la punta, profundidad de campo muy corta. Al final, un trazo rápido de tinta azul ultramar subraya la espiral. 9:16, 6–8 segundos, sin texto, sin marcas de agua.

## 5 · Vídeo cuadrado «ornitóptero» (caso de estudio)

> Maqueta física de un ornitóptero renacentista hecha a mano con listones de madera de tilo, juntas de cuero y alas de lino encerado color marfil, con costillas que imitan el ala de un murciélago, suspendida con hilos invisibles sobre un fondo liso azul lapislázuli (#1b2d9e). Las alas baten lentamente hacia abajo, los dedos de las alas se despliegan al bajar y se pliegan al subir. Luz de estudio suave y difusa desde arriba a la izquierda, sombra de contacto tenue en el fondo. Cámara fija frontal, ligeramente contrapicada. Bucle perfecto de 6 segundos. 1:1, sin personas, sin texto, sin marcas de agua.

---

## Cómo colocar los archivos

1. Exporta con el nombre exacto de la tabla y cópialo en la carpeta indicada (`assets/img/` o `assets/video/`).
2. No hay que tocar el HTML: el interludio muestra la imagen si existe y el vídeo si existe (el vídeo solo se reproduce si el visitante no ha pedido reducir el movimiento).
3. Comprueba el contraste: la cita blanca debe leerse sobre la zona oscura. Si la imagen es demasiado clara, oscurécela en origen; no hace falta tocar el código.
4. Los vídeos 4 y 5 no están enlazados en la página: son piezas para presentar el proyecto en el portfolio o en redes.
