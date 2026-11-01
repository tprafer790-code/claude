# Lanternwing

Juego HTML5 original de supervivencia nocturna, preparado para publicarse en **CrazyGames**.

Eres una polilla-farolillo que protege un jardín durante cinco minutos de oleadas de sombras. La luz ataca sola; el jugador vuela, esquiva con un impulso, recoge rocío, elige bendiciones (y las hace evolucionar) al subir de nivel y, entre partidas, invierte néctar en mejoras permanentes.

![Enjambre final](docs/capturas/enjambre.png)

## Datos clave

| | |
|---|---|
| Tamaño | 8 archivos, ~120 KB (límite de CrazyGames: 50 MB; portada móvil: 20 MB) |
| Rendimiento | Modo de bajo consumo automático en equipos de ≤ 4 GB; ~2 MB de memoria del juego ([auditoría](docs/05-auditoria-rendimiento.md), [versión 2](docs/07-version-2.md)) |
| Contenido | 5 armas con 5 evoluciones, 6 pasivas, 6 enemigos (2 a distancia o que se dividen), jefe con embestida, 2 objetos |
| Progresión | 12 tipos de misión, 5 polillas, 5 noches y 6 mejoras permanentes ([retención](docs/06-retencion.md)) |
| Tecnología | JavaScript sin dependencias, Canvas 2D y Web Audio |
| Plataformas | Escritorio y móvil; teclado, ratón y táctil (botón de impulso) |
| Idiomas | Inglés (obligatorio) y español |
| SDK | CrazyGames HTML5 SDK v3: carga, gameplay, anuncios y guardado |

## Probar en local

```bash
cd lanternwing
python3 -m http.server 8080
# abrir http://localhost:8080
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas en Chromium: resoluciones, SDK, anuncios, partida con bot y rendimiento |
| `npm run perf` | Auditoría de rendimiento con CPU ralentizada y perfiles móviles |
| `npm run build` | Genera `dist/lanternwing.zip` para subir a CrazyGames |

## Documentación

1. [Requisitos de CrazyGames](docs/01-requisitos-crazygames.md)
2. [Análisis del catálogo](docs/02-analisis-mercado.md)
3. [Documento de diseño](docs/03-diseno.md)
4. [Guía de publicación y lista de verificación](docs/04-publicacion.md)
5. [Auditoría de rendimiento](docs/05-auditoria-rendimiento.md)
6. [Mejoras de retención](docs/06-retencion.md)
7. [Versión 2: 4 GB, gráficos y jugabilidad](docs/07-version-2.md)
