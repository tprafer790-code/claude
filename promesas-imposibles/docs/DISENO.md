# Diseño y arquitectura — Promesas Imposibles

## 1. Fantasía y bucle

Comedia política interactiva: el jugador crea su candidatura en una sede modesta, hace campaña, gana (o pierde) y gobierna doce rondas hasta la reelección.

Bucle de cada ronda: **explorar** el despacho (objetos con etiqueta visible) → **conversar** con el reparto → **entender** el problema (efectos probables con flechas) → **decidir o negociar** → **observar** consecuencias explicadas (noticiario de fin de ronda con causas) → **nuevo conflicto** (seguimiento de cadenas, promesas que reaparecen, favores que vencen).

## 2. Estructura y ritmo (hipótesis a validar)

| Fase | Contenido | Objetivo |
|---|---|---|
| Creación | País → candidato y nombre → orientación → 6 preguntas con el asesor | ≤ 2 min, primera decisión < 1 min |
| Campaña | 6 jornadas × 2 acciones (plaza, entrevista, mitin, anuncios, puerta a puerta, recaudación), tentación de financiación, debate televisado, noche electoral | 8–10 min |
| Formación | Negociación de investidura / coalición / transición según país + ronda 1 (presupuesto) | 8–10 min |
| Mandato | Rondas 2–10: 1 decisión principal + 1–2 eventos cortos | 25–30 min |
| Final | Ronda 11 (crisis combinada) + ronda 12 (minicampaña, debate de revancha, elecciones) + legado | 10–15 min |

Duraciones, rondas y frecuencias en `src/data/tuning.ts` y `roundPlan` de cada país.

## 3. Modelo de simulación

* **Cinco indicadores visibles** (máximo): Popularidad, Calidad de vida, Capacidad económica, Apoyo parlamentario, Integridad institucional. Se desbloquean progresivamente.
* **Variables de detalle** (contextuales): tesorería, deuda, empleo, vivienda, servicios, seguridad, medioambiente, diplomacia, credibilidad, sospecha, pruebas, fondos privados.
* **Calidad de vida** es una media ponderada de servicios, vivienda, empleo, seguridad y medioambiente. **Popularidad** es aprobación: deriva lentamente hacia la satisfacción media de los grupos, pero los golpes de efecto la mueven a corto plazo. Por eso mejorar el país no garantiza la reelección y ser popular no implica mejorarlo.
* **Grupos sociales** (7) con intereses ponderados; cada grupo se divide en tres subsegmentos ideológicos, de modo que nunca vota en bloque.
* **Elecciones**: utilidad por subsegmento y partido = cercanía ideológica + satisfacción + credibilidad (promesas) + campaña + impulso + escándalos; reparto softmax, participación por grupo y ruido acotado con semilla (±2 puntos nacionales). Se muestran los factores que más influyeron.
* **Políticas** con coste, plazo, beneficiarios, perjudicados, efectos inmediatos y diferidos, requisitos y riesgos.
* **Consecuencias diferidas** en una cola guardada con la partida.
* **Memoria**: confianza por personaje, banderas narrativas, registro de promesas, pactos y favores.

## 4. Diferencias nacionales

| | España | EE. UU. | Brasil |
|---|---|---|---|
| Cargo | Presidente/a del Gobierno (jefe de Estado: el Rey) | Presidente (Estado y Gobierno) | Presidente da República |
| Elección | D'Hondt por regiones, umbral 3 % | Colegio Electoral (270) + Congreso | Dos vueltas + Cámara proporcional |
| Gobierno | Investidura 176 / mayoría simple | Transición; Congreso propio | Coalición con bloque pragmático |
| Leyes | Mayoría simple; decreto-ley convalidable | Cámara + Senado 60 (51 fiscal); firma/veto; orden ejecutiva | Mayoría con quórum; *medida provisória* que caduca |
| Caída | Moción de censura constructiva | *Impeachment* (2/3 Senado) | *Impeachment* (2/3 + 2/3) |
| Presupuesto fallido | Prórroga | Cierre de la Administración | Bloqueo y enmiendas |
| Consulta | Referéndum consultivo autorizado | Iniciativas estatales | Plebiscito convocado por el Congreso |
| Hito propio | Socios territoriales | Elecciones de mitad de mandato (ronda 6) | Voto obligatorio, venta de apoyos |

## 5. Arquitectura

TypeScript + Vite. Render propio DOM + SVG (sin motor) porque el juego es de diálogo y gestión: textos accesibles y traducibles, nitidez a cualquier escala, peso mínimo. Phaser se descartó para esta v1: añade ~1 MB y obliga a reimplementar texto, foco y accesibilidad en canvas.

```
src/
  core/       motor puro (sin DOM): tipos, azar con semilla, efectos, elecciones,
              parlamento, eventos, corrupción, rondas, finales
  data/       países, grupos, políticas, campaña, reparto, eventos, finales, ajustes
  i18n/       textos de interfaz es/en + utilidades
  art/        personajes articulados SVG, escenarios, banderas
  ui/         pantallas, diálogos, HUD, debate, negociación, ajustes
  audio/      sonido sintetizado (WebAudio)
  save/       almacenamiento con alternativa en memoria
  platform/   adaptador Poki / local
  dev/        herramientas de desarrollo (excluidas de producción)
  telemetry/  registro local de pruebas
scripts/      validación de datos y simulación masiva
tests/        pruebas unitarias e invariantes
```

El motor (`core/`) se ejecuta sin navegador: las pruebas y el simulador juegan miles de partidas.
