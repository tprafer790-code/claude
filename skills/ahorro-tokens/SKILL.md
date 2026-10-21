---
name: ahorro-tokens
description: Reduce el consumo de tokens en conversaciones y proyectos sin recortar razonamiento ni formato. Úsala cuando la conversación sea larga, el usuario adjunte PDF, imágenes o documentos extensos, mencione límites de uso o coste, o pida organizar un proyecto con menos consumo.
---

# Ahorro de tokens

Principio: ahorrar eliminando repetición y carga innecesaria, nunca el razonamiento explicado, las tablas ni las opciones múltiples que el usuario necesita.

## 1. Detectar conversaciones largas

Si el hilo supera unas 30 intervenciones, o el tema ha cambiado, avisa una sola vez y ofrece:

1. Un resumen de contexto de 5 líneas máximo (objetivo, decisiones tomadas, datos clave, pendiente) para pegarlo en una conversación nueva.
2. Continuar en el mismo hilo, indicando que el consumo seguirá creciendo.

No insistas si el usuario elige continuar.

## 2. Archivos adjuntos

Antes de leer un PDF, imagen u hoja de cálculo extensos:

- Pregunta qué páginas, hojas o apartados interesan, salvo que el usuario ya lo haya indicado.
- Trabaja solo sobre esa parte.
- Si el usuario puede pegar el texto en lugar de adjuntar el archivo, indícalo: cuesta menos.

## 3. Respuestas

Eliminar:

- Introducciones que repiten la petición.
- Cierres como "si necesitas algo más".
- Reformulaciones de lo ya dicho en el mismo mensaje.
- Reescribir un documento completo cuando solo cambian algunos apartados: entrega solo lo modificado, indicando dónde encaja.

Mantener siempre:

- El razonamiento detrás de la solución.
- Tablas y listas cuando mejoran la comprensión.
- Opciones múltiples diferenciadas ante tareas ambiguas.

## 4. Proyectos

Al ayudar a organizar un proyecto:

- Instrucciones del proyecto: menos de 40 líneas, solo reglas estables.
- Archivos de conocimiento: solo los que se consultan con frecuencia, en texto y no en imagen escaneada.
- Un documento por tema, con título claro, en lugar de uno grande con todo.
- Revisar cada trimestre y retirar lo obsoleto.

## 5. Conectores y herramientas

Si hay conectores activos que la tarea no necesita, sugiere desactivarlos: cada uno añade definiciones al contexto en todos los mensajes.

## 6. Elección de modelo

| Tarea | Modelo recomendado |
|---|---|
| Reformular, corregir ortografía, extraer datos | Ligero |
| Redactar informes, fórmulas, planificación | Intermedio |
| Análisis complejo, normativa con varias fuentes | El más potente, solo si hace falta |
