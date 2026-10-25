# Bottega Leonardo

Pieza conceptual para el portfolio de [miguelbenito.es](https://miguelbenito.es): el taller de Leonardo da Vinci contado como un estudio de diseño. Una página estática (HTML, CSS y JavaScript sin dependencias).

## Qué hace

- **Bocetos que se dibujan con el scroll.** Cada dibujo (tornillo aéreo, ornitóptero, puente de Estambul, estudios de agua) tiene una capa «fantasma» siempre visible y una capa de tinta que se traza al avanzar y se borra al retroceder.
- **Retícula vitruviana fija.** En «Método», la sección queda clavada mientras se construyen en cinco pasos el cuadrado, el círculo, las ocho cabezas, los cuartos y la figura.
- Sin JavaScript o con «reducir movimiento» activado, todo se ve completo y estático.

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html` | Página generada (no editar a mano los SVG) |
| `assets/css/estilos.css` | Estilos y tokens |
| `assets/js/main.js` | Trazado por scroll y sección fija |
| `assets/img/`, `assets/video/` | Imágenes y vídeos opcionales (ver `docs/`) |
| `herramientas/plantilla.html` | Plantilla con los textos |
| `herramientas/bocetos.py` | Genera los bocetos SVG con temblor de mano |
| `herramientas/construir.py` | Une plantilla y bocetos en `index.html` |
| `docs/prompts-imagen-video.md` | Prompts de Google Flow y dónde colocar cada archivo |

## Editar y publicar

```bash
python3 herramientas/construir.py   # regenera index.html tras cambiar textos o bocetos
```

Para publicar, sube `index.html` y la carpeta `assets/` a la raíz del dominio.
