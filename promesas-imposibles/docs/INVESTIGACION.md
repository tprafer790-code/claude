# Investigación previa — mercados, países y Poki

**Fecha de la instantánea:** 31 de octubre de 2026.
**Método:** búsquedas web y lectura directa de páginas durante la sesión de desarrollo. Cada dato indica su fuente y su estado de verificación:

| Marca | Significado |
|---|---|
| ✅ | Leído en la fuente durante esta sesión (31-oct-2026). |
| 🟡 | Conocimiento previo del equipo, **no** reverificado en esta sesión. Pendiente de contraste. |
| ⚠️ | Estimación de terceros (modelo estadístico), no recuento verificado. |

> El juego **no consulta Internet durante la partida**. Todo lo que aparece aquí se ha convertido en datos locales (`src/data/countries/*.ts`). La simulación diverge de la realidad desde el primer turno: es un **escenario electoral alternativo**.

---

## 1. Mercados: dónde se juega a juegos de navegador y a Poki

### 1.1 Cuatro magnitudes que no deben confundirse

| Magnitud | Qué mide | Dato obtenido | Fiabilidad |
|---|---|---|---|
| Número de jugadores | Personas que juegan | Poki: «más de 100 millones de jugadores mensuales» ([SUPERJUMP, 28-dic-2025](https://www.superjumpmagazine.com/what-pokis-100-million-monthly-gamers-reveal-about-the-future-of-browser-games/)) | ⚠️ Afirmación periodística sin fuente ni metodología; no desglosa países. |
| Tráfico estimado a portales | Visitas web estimadas | poki.com: **178,2 M visitas** en sept-2026; 172,11 M en ago; 168,97 M en jul ([Semrush, act. 11-oct-2026](https://www.semrush.com/website/poki.com/overview)) | ⚠️ Estimación por modelo. Visitas ≠ jugadores. |
| Interés de búsqueda | Búsquedas en Google | **No obtenido.** Google Trends no se consultó con éxito en esta sesión. | Pendiente. |
| Tamaño del mercado | Ingresos del sector | Mercado mundial 2025: **201,6 MM$** (+9,1 %); Asia-Pacífico 95 MM$, Norteamérica 54 MM$, Europa 36,3 MM$, Latinoamérica 8,6 MM$, MEA 7,7 MM$ (Newzoo vía [GameDev Reports, 26-jun-2026](https://gamedevreports.substack.com/p/newzoo-gaming-market-surpassed-200)) | ✅ Cifra de consultora; no específica de navegador. |

### 1.2 Reparto del tráfico de poki.com por país (sept-2026)

Fuente: [Semrush](https://www.semrush.com/website/poki.com/overview), datos de septiembre de 2026, actualizado el 11-oct-2026. Solo los cinco primeros países son visibles sin cuenta. ⚠️

| # | País | Cuota de visitas | Visitas estimadas | Nota |
|---|---|---|---|---|
| 1 | Estados Unidos | 13,69 % | 24,39 M | 57,12 % móvil |
| 2 | India | 10,13 % | 18,05 M | 70,04 % móvil |
| 3 | Bangladés | 9,85 % | 17,56 M | 99,76 % escritorio (posible uso en cibercafés/centros: hipótesis no verificada) |
| 4 | Brasil | 7,06 % | 12,59 M | — |
| 5 | Japón | 5,04 % | 8,98 M | — |

Competidor más cercano por visitas: crazygames.com, 120,19 M (misma fuente, ⚠️).

### 1.3 Selección de países para la versión 1

| País | Motivo | Diferencia jugable |
|---|---|---|
| **España** | País del creador; facilita la revisión. Coincide con unas elecciones generales anticipadas reales (29-nov-2026). | Monarquía parlamentaria: el jugador aspira a **Presidente/a del Gobierno**, no a jefe de Estado. Investidura, socios, decretos-ley que deben convalidarse, presupuestos prorrogados y moción de censura constructiva. |
| **Estados Unidos** | Primer país por tráfico estimado a Poki; mayor mercado de habla inglesa (idioma de respaldo del juego). | Presidencialismo: el presidente es jefe de Estado y de Gobierno, **no vota leyes**: firma o veta. Colegio Electoral, Senado con obstruccionismo (60 votos), facciones dentro de cada partido, órdenes ejecutivas recurribles y elecciones de mitad de mandato. |
| **Brasil** | Cuarto país por tráfico; mercado latinoamericano en crecimiento; elecciones presidenciales reales recién celebradas (25-oct-2026). | Presidencialismo de coalición: dos vueltas, voto obligatorio, Congreso muy fragmentado con un bloque pragmático que intercambia apoyo por ministerios y enmiendas presupuestarias, *medidas provisórias* que caducan. |

**Descartes razonados.** India (2.º por tráfico) tiene un sistema parlamentario de tipo Westminster cuyas mecánicas solaparían con las de España en esta primera versión; Bangladés (3.º) presenta un tráfico casi exclusivamente de escritorio y un contexto político muy sensible tras 2024 (🟡). Ambos quedan como candidatos para archivos de datos posteriores.

**Limitación lingüística.** El juego se entrega en español e inglés. Brasil se juega en esos idiomas; una traducción al portugués es la mejora prioritaria si se mantiene Brasil.

---

## 2. Contexto político (instantánea al 31-oct-2026)

### 2.1 España

| Aspecto | Contenido | Fuente / estado |
|---|---|---|
| Sistema | Monarquía parlamentaria. Jefe del Estado: el Rey (Felipe VI). Jefe del Gobierno: Presidente del Gobierno, investido por el Congreso. | Constitución Española, arts. 56, 99 🟡 |
| Investidura | 1.ª votación: mayoría absoluta (176 de 350). 2.ª votación (48 h después): mayoría simple. | CE art. 99 🟡 |
| Sistema electoral | Congreso: 350 escaños, circunscripción provincial, D'Hondt, umbral del 3 % por circunscripción. Senado: 4 senadores por provincia (3 o 1 en islas; 2 Ceuta y Melilla). | LOREG 🟡; reparto del Senado ✅ ([Infobae, 6-oct-2026](https://www.infobae.com/espana/2026/10/06/ya-es-oficial-el-boe-publica-el-real-decreto-que-convoca-elecciones-generales-el-29-de-noviembre-y-disuelve-las-cortes/)) |
| Situación actual | **Cortes disueltas** por el Real Decreto 806/2026, de 5 de octubre (BOE 6-oct-2026). **Elecciones generales: 29-nov-2026.** Campaña: 13–27 nov. Constitución de las nuevas Cortes: 23-dic-2026. | ✅ Infobae, 6-oct-2026 |
| Quién gobierna | Pedro Sánchez (PSOE), Presidente del Gobierno, en coalición con Sumar (vicepresidenta Yolanda Díaz mencionada en la fuente). | ✅ [Euronews, 2-oct-2026](https://es.euronews.com/2026/10/02/sanchez-baraja-adelantar-las-elecciones-en-espana-tras-el-no-de-junts-a-los-decretos-de-vi) |
| Detonante | El Congreso tumbó el 2-oct-2026 dos decretos-ley de vivienda (RDL 26/2026 y 27/2026) con el voto en contra de PP, Vox y Junts. | ✅ Euronews; Infobae |
| Partidos principales | PSOE (centroizquierda), PP (centroderecha, primer grupo), Vox (derecha radical), Sumar (izquierda), Podemos (izquierda), ERC, Junts (independentistas catalanes), PNV, EH Bildu (vascos), BNG, CC. | 🟡; reparto de la Diputación Permanente (27 PP, 25 PSOE, 6 Vox, 6 Sumar, 1 ERC, 1 Junts, 1 PNV, 1 Bildu, 1 Mixto) ✅ Infobae |
| Resultados de referencia (23-J 2023) | PP 137, PSOE 121, Vox 33, Sumar 31, ERC 7, Junts 7, Bildu 6, PNV 5, BNG 1, CC 1, UPN 1. | 🟡 Ministerio del Interior; reverificar |
| Problemas relevantes | Crisis de vivienda y desahucios (acampada del sindicato de inquilinas en Sol); presupuestos aplazados por falta de apoyos; inflación al alza; casos de corrupción en el entorno del Gobierno. | ✅ Euronews, 2-oct-2026 |
| Encuestas | **No recogidas.** Ninguna fuente leída citaba sondeos con encuestadora y fecha. | Pendiente |

**Particularidades convertidas en mecánica:** investidura en dos votaciones; socios territoriales que piden contrapartidas; decretos-ley con efecto inmediato que pueden caer en la convalidación; presupuestos que, si no se aprueban, se **prorrogan**; moción de censura constructiva; referéndum consultivo que requiere autorización del Congreso (CE art. 92 🟡).

### 2.2 Estados Unidos

| Aspecto | Contenido | Fuente / estado |
|---|---|---|
| Sistema | República federal presidencial. El Presidente es jefe de Estado **y** de Gobierno. | 🟡 |
| Elección presidencial | Colegio Electoral: 538 compromisarios, 270 para ganar; casi todos los estados por mayoría simple («el ganador se lo lleva todo»). | 🟡 |
| Congreso | Cámara de Representantes (435, renovación total cada 2 años) y Senado (100, un tercio cada 2 años). Obstruccionismo: 60 votos para cerrar el debate en la mayoría de leyes; la conciliación presupuestaria permite mayoría simple. | 🟡 |
| Quién gobierna | Donald Trump (Partido Republicano). | ✅ [Khaleej Times/Reuters, 19-oct-2026](https://www.khaleejtimes.com/americas/us-midterm-elections-2026-voting-explainer); [CFR, 13-oct-2026](https://www.cfr.org/articles/five-things-to-know-about-the-midterms) |
| Mayorías | Cámara: republicanos 218–214 (2 vacantes). Senado: republicanos 53–47. | ✅ Reuters, 19-oct-2026 |
| Próxima cita | Elecciones de mitad de mandato: **3-nov-2026**. Previsiones favorables a los demócratas en la Cámara; Senado incierto. Aprobación presidencial: 32 % (Reuters/Ipsos, sept-2026). | ✅ Reuters; CFR |
| Problemas relevantes | Coste de la vida, precio del combustible, impuestos y recortes sociales, aplicación de la política migratoria, confianza en el proceso electoral. | ✅ Reuters; CFR |
| Discrepancia | Reuters cifra en 4 los escaños netos que necesitan los demócratas en la Cámara; CFR, en 3. | ✅ Registrada |

**Mecánicas:** el jugador firma o veta; anulación del veto con 2/3 en ambas cámaras; facciones internas (moderados/ala dura) en vez de coaliciones; órdenes ejecutivas rápidas pero recurribles ante los tribunales; elecciones de mitad de mandato a mitad de partida; *impeachment* (Cámara por mayoría, destitución con 2/3 del Senado). No existe referéndum nacional: se sustituye por **iniciativas estatales** y se explica en el juego.

### 2.3 Brasil

| Aspecto | Contenido | Fuente / estado |
|---|---|---|
| Sistema | República federal presidencial. El Presidente es jefe de Estado y de Gobierno. | 🟡 |
| Elección | Dos vueltas si nadie supera el 50 % de votos válidos. Voto obligatorio entre 18 y 70 años. | 🟡 |
| Resultados 2026 | 1.ª vuelta (4-oct): Flávio Bolsonaro (PL) 47,03 %, Lula (PT) 45,16 %. 2.ª vuelta (25-oct): **Lula 51,79 %**, Flávio Bolsonaro 48,21 %. Abstención 2.ª vuelta: 19,21 %. Flávio Bolsonaro anunció que pediría la anulación. El real cayó ~10 % en futuros. | ✅ [InfoMoney, 25/26-oct-2026](https://www.infomoney.com.br/politica/ao-vivo-eleicoes-segundo-turno-2026/) |
| Quién gobierna | Lula (PT), reelegido para un cuarto mandato. Toma de posesión del nuevo mandato: 5-ene-2027 (EC 111/2021). | ✅ reelección; 🟡 fecha de toma de posesión |
| Congreso | Cámara de Diputados (513, proporcional) y Senado (81). Muy fragmentado; el llamado *centrão* negocia apoyos a cambio de cargos y enmiendas. Presidencias citadas: Hugo Motta (Cámara), Davi Alcolumbre (Senado). | 🟡 composición; ⚠️ presidencias citadas por resumen no verificado |
| Instrumentos | *Medida provisória*: efecto inmediato, caduca si el Congreso no la convierte en ley (60+60 días). *Impeachment*: 2/3 de la Cámara para admitir y 2/3 del Senado para condenar. Plebiscito/referéndum convocado por el Congreso. | 🟡 |

**Mecánicas:** segunda vuelta con transferencia de votos; bloque pragmático ficticio («Centro Pragmático») que vende apoyo por ministerios y enmiendas; medidas provisionales que caducan; voto obligatorio (la movilización pesa menos y el voto nulo pesa más).

---

## 3. Poki: requisitos consultados

Fuentes ✅ (leídas el 31-oct-2026; las páginas no muestran fecha): [SDK HTML5](https://sdk.poki.com/html5), [documentación del SDK](https://sdk.poki.com/sdk-documentation), [requisitos](https://sdk.poki.com/new-requirements).

| Requisito | Cómo lo cumple el juego |
|---|---|
| SDK `https://game-cdn.poki.com/scripts/v2/poki-sdk.js` + `PokiSDK.init()` | Solo en la compilación `npm run build:poki`. Capa adaptadora `src/platform/`. |
| `gameLoadingFinished()` al terminar la carga | Llamado tras montar la interfaz. |
| `gameplayStart()` en la primera interacción, `gameplayStop()` en pausas, menús, finales y escenas | `gameplayStart()`/`gameplayStop()` en `src/platform/poki.ts`, sin llamadas duplicadas. |
| `commercialBreak()` en pausas naturales, silenciando audio y bloqueando entrada | Al salir de la noche electoral, cada 3 rondas de gobierno y en la revancha rápida (máx. 1/min). Bloquea la entrada y silencia. |
| `rewardedBreak()` opcional, avisando antes, nunca imprescindible | No se usa en la v1. |
| Descarga inicial < 8 MB | Todo el arte es SVG generado por código; audio sintetizado. |
| Sin peticiones externas (ni Google Fonts ni CDN) | Fuentes del sistema; nada externo salvo el SDK de Poki. |
| Jugable con bloqueador de anuncios | Si el SDK no carga, el adaptador cae a modo local. |
| `localStorage` dentro de `try/catch` | `src/save/storage.ts` con alternativa en memoria y aviso. |
| Evitar el desplazamiento de la página madre con flechas/espacio | `preventDefault` en flechas y espacio dentro del juego. |
| Pausa con ESC | Implementada. |
| Sin enlaces salientes, pantallas de presentación ni otros anuncios | No hay. |
| Escenas saltables, varios idiomas | Sí: ES/EN; botón «Saltar». |
| Política de privacidad accesible en el juego + URL alojada | **Pendiente:** el texto está en el juego; falta la URL alojada (requiere decisión del creador). |

**Contenido.** Poki «se reserva el derecho a decidir qué contenido mostrar». Las *Quality Guidelines* enlazadas **no se leyeron**. Ver riesgos y ajustes en `docs/POKI.md`.
