# Lanternwing

Juego HTML5 original de supervivencia nocturna, preparado para publicarse en **CrazyGames**.

Eres una polilla-farolillo que protege un jardín durante cinco minutos de oleadas de sombras. La luz ataca sola; el jugador vuela, recoge rocío, elige bendiciones al subir de nivel y, entre partidas, invierte néctar en mejoras permanentes.

![Enjambre final](docs/capturas/enjambre.png)

## Datos clave

| | |
|---|---|
| Tamaño | 5 archivos, ~75 KB (límite de CrazyGames: 50 MB; portada móvil: 20 MB) |
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
| `npm run build` | Genera `dist/lanternwing.zip` para subir a CrazyGames |

## Documentación

1. [Requisitos de CrazyGames](docs/01-requisitos-crazygames.md)
2. [Análisis del catálogo](docs/02-analisis-mercado.md)
3. [Documento de diseño](docs/03-diseno.md)
4. [Guía de publicación y lista de verificación](docs/04-publicacion.md)
