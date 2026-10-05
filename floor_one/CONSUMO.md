# Registro de consumo

## Coste del modelo (Claude Opus 5.5)

| Concepto | Valor |
|---|---|
| Presupuesto autorizado | 60 USD |
| Tokens facturados por llamada (entrada / salida / caché) | **No expuestos** en este entorno (sesión de Claude Code en la nube sin acceso a datos de facturación ni a contadores por llamada) |
| Coste real | **Coste no verificable** |
| Límite de gasto en la aplicación anfitriona | No configurable desde la sesión: debe fijarse en la consola/plan de la cuenta |

No se presenta ninguna estimación como gasto real. Para conocer el coste efectivo, consultar la facturación de la cuenta (claude.ai o consola de Anthropic) filtrando por la sesión indicada en los commits (`Claude-Session`). Si el acceso es mediante suscripción o créditos de un intermediario, la conversión puede no coincidir con el precio de la API.

## Reparto planificado frente a trabajo realizado (cualitativo)

| Reserva | Plan (USD) | Trabajo realizado |
|---|---|---|
| Concepto y referencias | 6 | Análisis de las 4 referencias, plan de 15 bloques |
| Look development y animatic | 10 | 5 iteraciones de modelo, 3 opciones de luz, animatic v01 |
| Implementación | 24 | Modelo, escena, bailarín, audio, compositor |
| Revisión y correcciones | 14 | Ver `QA.md` (defectos, causa, corrección, evidencia) |
| Integración y entrega | 6 | Codificación, verificación de metadatos, documentación |

## Otros servicios

Ningún cargo adicional: sin servicios de vídeo, música, render en la nube ni almacenamiento externo. Todo el render (CPU local del contenedor, 4 núcleos) y el audio son locales. Recursos externos usados: módulo `bpy` 4.2.0 (PyPI, GPL) y tipografía Archivo (Google Fonts, OFL), ambos gratuitos.

## Coste de cómputo local medido

| Tarea | Tiempo medido |
|---|---|
| Fotograma 3840×2160, 32 muestras (prueba) | 365 s |
| Fotograma 1920×1080 final, 8 muestras + OIDN + motion blur | ≈31 s |
| Animatic 480×270 (450 fotogramas) | 531 s |
| Render final 900 fotogramas | ver `renders/final_render.log` (resumen en QA.md) |
