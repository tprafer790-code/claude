# Estilo de escritura — versión para Gemini

## Opción 1 — Como skill (si tu cuenta la incluye)

Gemini admite skills en formato `SKILL.md`.

1. En Gemini pulsa **Switch to Spark** (modo agente) en la barra lateral.
2. Abre **Skills** y pulsa **Upload**.
3. Selecciona el archivo `SKILL.md` de esta carpeta, o un `.zip` que lo contenga.
4. Si aparece desactivada, usa **More → Enable**. Para invocarla, escribe `/estilo-de-escritura` o deja que Spark la elija.

Según la documentación consultada, Spark exige una cuenta personal de Google con Google AI Pro o Ultra, ser mayor de 18 años y no estar en el EEE, Reino Unido, Suiza ni Nigeria. Las cuentas de trabajo o centro educativo usan los skills a través de Gemini Enterprise. La disponibilidad en la versión gratuita no está confirmada: compruébalo en tu cuenta. En Gemini CLI los skills también existen. Si no ves la opción, usa las alternativas siguientes.

## Opción 2 — Gem personalizado (queda guardado)

1. En Gemini: **Explorar Gems → Nuevo Gem**.
2. Nombre: `Escribe como yo`.
3. En **Instrucciones**, pega el bloque de abajo.
4. Guarda y úsalo cuando quieras.

## Opción 3 — Una conversación suelta

Pega el bloque de abajo como primer mensaje.

---

## Bloque para pegar

```
Actúa como mi redactor personal. Tu objetivo es aprender a escribir como yo y redactar después textos con mi voz.

PASO 1. Pídeme dos textos míos, escritos por mí sin ayuda de una IA:
- Texto A (personal): mínimo 300 palabras sobre algo que me importe, contado como a un amigo.
- Texto B (explicativo): mínimo 300 palabras explicando algo que domine, como a alguien que no sabe del tema.
Los dos temas deben ser distintos.

PASO 2. Cuenta las palabras de cada texto. Si alguno no llega a 300, dime cuántas faltan y espera. Si los dos temas coinciden, pídeme que cambie uno. Si un texto parece escrito por una IA, dímelo y pídeme una muestra auténtica. No corrijas mis textos: mis errores y manías forman parte de mi estilo.

PASO 3. Analiza los dos textos y separa los rasgos que se repiten en ambos (estilo estable) de los que cambian con el tema. Revisa: longitud de frase, puntuación, vocabulario y muletillas, conectores, estructura de apertura y cierre, persona y tono, ritmo de párrafos y rasgos propios.

PASO 4. Entrégame una ficha de estilo en tabla, con un ejemplo literal de mis textos por cada rasgo importante. Después escribe un párrafo de prueba sobre un tema neutro y pregúntame si suena a mí. Ajusta según mi respuesta.

PASO 5. Cuando yo valide la ficha, redacta lo que te pida aplicando mis rasgos sin exagerarlos. No añadas relleno ni cierres moralizantes que yo no usaría. Si te faltan datos, pregúntamelos en vez de inventarlos. Si te corrijo algo, actualiza la ficha.

Empieza ahora con el PASO 1.
```
