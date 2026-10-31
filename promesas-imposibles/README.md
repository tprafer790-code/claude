# Promesas Imposibles

Simulador político satírico para navegador, pensado para Poki. Creas una candidatura, haces campaña, ganas (o no) las elecciones, formas gobierno y gobiernas hasta la reelección. España, Estados Unidos y Brasil, cada uno con su sistema. Español e inglés.

> Escenario alternativo: todos los personajes, partidos y escándalos son ficticios. Los datos reales solo aparecen como contexto fechado (instantánea del 31-oct-2026).

## Ejecutar y compilar

Requisitos: Node 20 o superior.

```bash
cd promesas-imposibles
npm install
npm run dev          # desarrollo en http://localhost:5173 (con modo desarrollo: tecla º)
npm run build        # versión web → dist/
npm run build:poki   # versión Poki con el SDK → dist-poki/
npm run preview      # sirve dist/
```

Comprobaciones:

```bash
npm run check        # tipos + validación de datos + pruebas unitarias
npm run simulate     # balance: miles de partidas con robots
npm run symmetry     # equilibrio izquierda/derecha
npm run build && npm run build:poki && npm run e2e   # pruebas de extremo a extremo con Playwright
```

## Cómo se juega

| Fase | Qué haces |
|---|---|
| Preparación | País → candidatura (4 personajes, solo cambia el aspecto) y nombre → izquierda o derecha. La primera decisión llega en segundos. |
| Programa | Seis preguntas de tu asesora. Cada respuesta es una promesa registrada; puedes llevarle la contraria. |
| Campaña | 6 jornadas con 2 acciones: calle, mitin, puerta a puerta, anuncios, recaudación. Hitos fijos: reparto de voluntarios, la visita de un empresario con maletín (financiación irregular), entrevista en la tele y debate televisado (cartas contra gestos del rival, con reloj o sin él). |
| Noche electoral | Escrutinio, escaños y **por qué**: cuántos puntos aportó cada factor. Si pierdes: final breve y revancha rápida. |
| Formación | Negocias con cada partido (enmiendas, inversión, cargos o un sobre). En España necesitas la investidura; en EE. UU. y Brasil fijas tu base de apoyos. |
| Gobierno | 12 rondas. Cada ronda: 1 decisión principal (presupuesto, ley, crisis) y 1–2 asuntos breves en los objetos del despacho. Los sistemas se desbloquean poco a poco. |
| Reelección | Dos acciones, debate de revancha y elecciones. Final con legado y decisiones clave. |

Controles: ratón, toque o teclado (flechas o A/D para caminar, Intro para usar el objeto cercano, 1–9 para elegir, Esc para pausar). Nada depende de pasar el ratón por encima.

### Simulación

- **Indicadores visibles (máximo 5):** popularidad, calidad de vida, economía, apoyo parlamentario e integridad institucional. El resto (tesorería, deuda, sectores, sospecha, pruebas…) se consulta en el despacho.
- **Políticas** con coste inicial y por ronda, retraso, ganadores, perdedores, efectos diferidos y riesgos.
- **Siete grupos sociales** con intereses que se solapan y memoria de lo que les hiciste.
- **Elecciones explicables:** cada grupo se divide en tres segmentos ideológicos que reparten su voto según cercanía, satisfacción, credibilidad, impulso, escándalos y gestión. El azar es acotado y aparece como un factor más.
- **Parlamento** propio de cada país: D’Hondt y censura constructiva en España; Colegio Electoral, Cámara, Senado con 60 votos, órdenes ejecutivas recurribles, *midterms* e *impeachment* en EE. UU.; dos vueltas, bloque pragmático, medidas provisionales y *impeachment* en Brasil.
- **Corrupción y autoritarismo como sistemas:** fondos opacos, favores que se cobran, sospecha, pruebas, investigación periodística y judicial, chantajes, deterioro institucional, dimisión y destitución.
- **64 eventos**, 23 en cadenas de varias fases (incluida una rara crisis internacional con aviso previo que se resuelve de forma abstracta) y 19 con variantes o exclusivos de país. Diez personajes recurrentes que recuerdan lo que hiciste.
- **12 finales** según elección, bienestar, instituciones, corrupción, promesas y crisis.

### Accesibilidad y plataforma

ES/EN con selector (el inglés es el idioma de respaldo), volumen y silencio, movimiento reducido, texto grande, debate sin reloj, pausa. Guardado automático tras cada decisión (incluye semilla, eventos y efectos pendientes) con «Continuar», y alternativa en memoria si el navegador no deja guardar. Capa Poki que funciona también sin SDK; detalles en [`docs/POKI.md`](docs/POKI.md).

## Documentación

- [`docs/INVESTIGACION.md`](docs/INVESTIGACION.md): mercados, países, contexto político fechado, requisitos de Poki y fuentes.
- [`docs/DISENO.md`](docs/DISENO.md): diseño, ritmo, modelo de simulación y arquitectura.
- [`docs/GUIA_AJUSTES.md`](docs/GUIA_AJUSTES.md): dónde cambiar duración, dificultad, equilibrio y contenido.
- [`docs/POKI.md`](docs/POKI.md): integración, riesgos de contenido y lo que falta antes de enviarlo.
- [`docs/PRUEBAS.md`](docs/PRUEBAS.md): resultados de las pruebas y limitaciones.

## Registro local de pruebas

El juego guarda en el propio navegador un registro de sesiones (inicio, decisiones, fases, final y minutos jugados). **Nunca se envía a ningún sitio.** Para recogerlo en una prueba con personas: Ajustes → «Exportar registro local de prueba» descarga un JSON con un resumen (partidas, terminadas, minutos medios y fases alcanzadas).
