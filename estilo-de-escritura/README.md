# estilo-de-escritura

Skill para que una IA aprenda a escribir como tú. Te pide **dos textos tuyos de al menos 300 palabras y de dos temas distintos** (uno personal y otro explicativo), extrae una ficha de estilo y, una vez validada, redacta con tu voz.

## Qué incluye

| Archivo | Para qué sirve |
|---|---|
| [`SKILL.md`](SKILL.md) | Skill para Claude (Claude.ai, Claude Code, Cowork) |
| [`chatgpt.md`](chatgpt.md) | Instrucciones listas para un GPT personalizado o una conversación de ChatGPT |
| [`gemini.md`](gemini.md) | Instrucciones listas para un Gem o una conversación de Gemini |

## Cómo funciona

1. Pide dos muestras: Texto A (personal) y Texto B (explicativo), mínimo 300 palabras cada uno.
2. Valida longitud, diversidad de temas y autenticidad.
3. Analiza longitud de frase, puntuación, vocabulario, conectores, estructura, tono, ritmo y rasgos propios.
4. Entrega una ficha de estilo y un párrafo de prueba para que la confirmes.
5. Redacta lo que le pidas con tu voz y mejora la ficha con tus correcciones.

## Instalación en Claude

Copia la carpeta `estilo-de-escritura/` al directorio de skills de tu proyecto (`.claude/skills/`) o súbela como skill desde los ajustes de Claude.
