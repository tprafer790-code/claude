# estilo-de-escritura

Skill para que una IA aprenda a escribir como tú. Te pide **dos textos tuyos de al menos 300 palabras y de dos temas distintos** (uno personal y otro explicativo), extrae una ficha de estilo y, una vez validada, redacta con tu voz.

## Qué incluye

| Archivo | Para qué sirve |
|---|---|
| [`SKILL.md`](SKILL.md) | Skill en formato estándar Agent Skills: sirve para Claude, ChatGPT y Gemini |
| [`chatgpt.md`](chatgpt.md) | Cómo subirla como skill a ChatGPT y, si tu plan no tiene skills, alternativa con GPT personalizado |
| [`gemini.md`](gemini.md) | Cómo subirla como skill a Gemini y, si tu plan no tiene skills, alternativa con Gem |

## Cómo funciona

1. Pide dos muestras: Texto A (personal) y Texto B (explicativo), mínimo 300 palabras cada uno.
2. Valida longitud, diversidad de temas y autenticidad.
3. Analiza longitud de frase, puntuación, vocabulario, conectores, estructura, tono, ritmo y rasgos propios.
4. Entrega una ficha de estilo y un párrafo de prueba para que la confirmes.
5. Redacta lo que le pidas con tu voz y mejora la ficha con tus correcciones.

## Instalación

El mismo `SKILL.md` vale para las tres plataformas, porque las tres usan el estándar abierto Agent Skills.

| Plataforma | Cómo instalarla |
|---|---|
| Claude | Copia la carpeta a `.claude/skills/` o súbela como skill desde los ajustes |
| ChatGPT | Skills → Crear → Subir desde tu ordenador (detalles en [`chatgpt.md`](chatgpt.md)) |
| Gemini | Modo Spark → Skills → Upload, con `SKILL.md` o un `.zip` (detalles en [`gemini.md`](gemini.md)) |

La disponibilidad de skills depende del plan de cada servicio. Si el tuyo no las incluye, usa el bloque de instrucciones de `chatgpt.md` o `gemini.md`.
