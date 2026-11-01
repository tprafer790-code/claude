# Lanternwing

Juego HTML5 original de supervivencia nocturna, preparado para publicarse en **CrazyGames**.

Eres una polilla-farolillo que protege un jardín durante cinco minutos de oleadas de sombras. La luz ataca sola; el jugador vuela, recoge rocío, elige bendiciones al subir de nivel y, entre partidas, invierte néctar en mejoras permanentes.

![Enjambre final](docs/capturas/enjambre.png)

## Datos clave

| | |
|---|---|
| Tamaño | 7 archivos, ~95 KB (límite de CrazyGames: 50 MB; portada móvil: 20 MB) |
| Rendimiento | 53-60 fps con 340 enemigos en Chromebook y móviles simulados ([auditoría](docs/05-auditoria-rendimiento.md)) |
| Progresión | Misiones, 5 polillas, 5 noches y 6 mejoras permanentes ([retención](docs/06-retencion.md)) |
| Tecnología | JavaScript sin dependencias, Canvas 2D y Web Audio |
| Plataformas | Escritorio y móvil; teclado, ratón y táctil |
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
