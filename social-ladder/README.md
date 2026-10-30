# THE SOCIAL LADDER — *From Nothing to Everything*

Juego incremental (clicker + idle + tycoon + simulador de ascenso social) en pixel art 16‑bit para navegador de escritorio y móvil. Empiezas en una caja de cartón y subes 58 rangos hasta poseer conceptos abstractos del universo.

> Disponible en **español e inglés** (interfaz y todo el contenido). Se elige en *Ajustes → Idioma*; en la primera partida se usa el idioma del navegador.

---

## 1. Puesta en marcha

Requisitos: Node.js 20 o superior.

```bash
cd social-ladder
npm install
npm run dev          # http://localhost:5173
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Comprobación de tipos + build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción (puerto 4173) |
| `npm test` | Tests unitarios (motor, contenido, guardado, validación de puntuaciones) |
| `npm run typecheck` | Solo comprobación de tipos |
| `npm run simulate -- <horas> <clics/s> [rangoPrestigio]` | Bot de equilibrado: juega de forma voraz y muestra cuándo alcanza cada rango |
| `npm run e2e` | Prueba de humo en navegador (Playwright) contra `npm run preview` |

El juego funciona **completo en modo local** sin configurar nada: guardado en `localStorage`, progreso offline, prestigio, etc. Las funciones online (ranking, nube) solo aparecen activas si se configura Supabase.

---

## 2. Qué incluye (implementado y probado)

| Sistema | Contenido |
|---|---|
| Rangos | 58 rangos en 7 etapas (+ etapa cósmica final), con símbolos de estatus requeridos y bonificaciones especiales |
| Economía | Números grandes (`break_infinity.js`), 20 negocios (1 secreto), 202 mejoras, hitos de cantidad, compra ×1/×10/×100/MAX |
| Clic | Combo, críticos, hallazgos afortunados, 4 habilidades con recarga |
| Objetos | 52 objetos en 5 ranuras (casa, vehículo, ropa, gadget, accesorio), rarezas, efectos, 8 reliquias secretas que sobreviven al prestigio |
| Combinaciones | 17 combinaciones de objetos con bonificaciones o desbloqueos |
| Secretos | 17 secretos (interacción con el escenario, texto tecleado, condiciones de juego) |
| Eventos | 24 eventos aleatorios con decisiones y consecuencias permanentes o diferidas |
| Objetivos | 73 logros (algunos ocultos), 34 misiones, 5 retos diarios |
| Prestigio | "Reinvención": reputación = ⌊∛(ganancias totales / 1e6)⌋, 10 ventajas permanentes |
| Offline | 60 % de eficiencia, tope de 8 h (ampliables), resumen al volver |
| Persistencia | Autoguardado cada 10 s, copia de seguridad, exportar/importar código, migración de versiones |
| Presentación | Pixel art procedural con paleta arcade saturada, 8 escenarios con color de fondo y ambiente propios por clase social, personaje que cambia según etapa y equipo, audio chiptune sintetizado (WebAudio) |
| Efectos | 4 niveles de intensidad visual ligados a la clase social (ver 2.1); números flotantes, partículas y ondas en un único lienzo reutilizado; contador de dinero animado; celebraciones de ascenso, cambio de clase, hallazgo raro, logro mayor y reinvención |
| Interfaz viva | Paleta arcade (azul eléctrico #168BFF, morado neón #A855F7, rosa #FF3DAD, naranja #FF7A18, amarillo #FFE44D, verde neón #39F56A, cian #22E6E0, azul marino #10152E); fondo animado por clase social (manchas de color y polvo de píxeles), nubes y bandadas en el escenario; tarjetas que saltan al comprar y destellan al desbloquearse; barras de progreso con brillo; avisos que entran y salen; monedas que vuelan al contador; banda de celebración breve (ascenso, logro, secreto, combo ×100) que no bloquea el juego; hitos de combo en 5/10/25/50/100 |
| Clic crítico | Sacudida breve de la zona de juego (75 ms; 100 ms y más fuerte si es excepcional), estallido naranja/rojo/dorado, ondas alrededor del botón, cifra grande y sonido propio. Con una habilidad de clic activa (*modo crítico*) cada clic sacude ligeramente la pantalla |
| Accesibilidad | Movimiento reducido (también respeta la preferencia del sistema), interruptor de sacudida, volumen/silencio y botón de silencio en la barra superior, teclado (Espacio/Enter), diseño responsive |
| Idiomas | Español e inglés; ~1.000 textos de contenido traducidos por identificador (`src/i18n/content.ts`), con test de cobertura. En español las cantidades usan la escala larga (K, M, mM = mil millones, B = billón, T = trillón…) y coma decimal |

### 2.1 Intensidad visual progresiva

| Nivel | Clases sociales | Qué cambia |
|---|---|---|
| Inicio | Supervivencia, Clase trabajadora | Interfaz tranquila, pocas partículas, números pequeños |
| Medio | Clase media baja, Clase media | Más partículas, halo en el botón, ondas en los críticos |
| Avanzado | Riqueza, Riqueza extrema | Partículas con brillo, destello que recorre el botón, aura del personaje, partículas de ambiente en el escenario |
| Final | Poder absurdo, Más allá de la escalera | Ráfagas grandes, marco cian/violeta, varias ondas por crítico, destellos de pantalla en los eventos excepcionales |

La lógica de críticos no ha cambiado: probabilidad y multiplicador siguen en `src/config/economy.ts` y en los efectos de objetos. Un crítico se considera *excepcional* (efecto más fuerte) si coincide con el combo al máximo, con una habilidad de clic activa o con un hallazgo afortunado.

**Pruebas realizadas:** 39 tests unitarios en verde (incluida la cobertura completa de la traducción y los niveles de intensidad); build de producción sin errores; prueba en Chromium (escritorio 1366×800 y móvil 390×844): clics, críticos con sacudida y vuelta exacta a reposo, movimiento reducido sin sacudida, 300 clics rápidos y 40 críticos seguidos (las partículas tienen tope y el bucle de animación se detiene al terminar), compra, todas las pestañas, persistencia tras recargar, sin errores de consola ni desbordamiento horizontal.

**Ritmo aproximado** (simulador, 1 clic/s, sin prestigio): Millonario ≈ 21 min, Multimillonario ≈ 43 min, Isla privada ≈ 1 h 50 min, Dueño de un país ≈ 5 h. Las etapas absurda y cósmica están pensadas para alcanzarse con varias reinvenciones. Todo es ajustable en `src/config/economy.ts`.

---

## 3. Supabase (opcional): ranking, cuentas y guardado en la nube

### 3.1 Configuración

1. Crea un proyecto en <https://supabase.com>.
2. Ejecuta la migración `supabase/migrations/0001_init.sql` (SQL Editor o `supabase db push`).
3. Despliega la función de validación:
   ```bash
   supabase functions deploy submit-score
   ```
   Supabase inyecta `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en la función; no hay que copiarlas a ningún sitio.
4. En *Authentication → URL Configuration*, añade la URL donde se publique el juego (el acceso es por enlace mágico de correo).
5. Copia `.env.example` a `.env` y rellena **solo** la URL y la clave pública *anon*:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   La clave `service_role` **nunca** va en el `.env` del cliente.

### 3.2 Modelo de seguridad

| Tabla | Lectura | Escritura desde el navegador |
|---|---|---|
| `profiles` | pública | solo la fila propia |
| `cloud_saves` | solo la propia | solo la propia |
| `score_submissions` (registro de envíos) | solo los propios | **ninguna** |
| `leaderboard_entries`, `weekly_entries` | pública | **ninguna** |

Las puntuaciones solo las escribe la Edge Function `submit-score`, que identifica al usuario por su JWT y comprueba (`supabase/functions/submit-score/validate.ts`):

- formato y rangos de valores;
- que el rango declarado sea alcanzable con el patrimonio declarado;
- que la reputación no supere lo que permite la fórmula de prestigio;
- que logros, prestigios, ganancias y tiempo de juego no disminuyan;
- que el tiempo de juego no avance más rápido que el reloj real;
- que el crecimiento de ganancias desde el último récord aceptado sea plausible;
- límite de un envío por minuto.

Los envíos rechazados quedan registrados con su motivo.

> **Limitación honesta:** esto es **validación de plausibilidad, no un antitrampas completo**. El juego se ejecuta en el navegador, así que un jugador decidido puede fabricar una partida verosímil y subirla poco a poco. La lógica de validación tiene tests unitarios, pero la migración y la Edge Function **no se han probado contra un proyecto Supabase real** en este entorno.

El ranking muestra únicamente registros reales; no hay datos de demostración. Sin Supabase, la pestaña *Ranking* muestra tus récords personales locales y lo indica claramente.

---

## 4. Despliegue

El build es estático (`dist/`, rutas relativas), así que sirve cualquier hosting estático:

```bash
npm run build
# subir el contenido de dist/ a Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.
```

Si usas Supabase, define `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como variables de entorno del build en el hosting.

---

## 5. Arquitectura

```
src/
  core/bignum.ts        Números grandes y formato ($1.23Qa)
  config/economy.ts     TODAS las constantes de equilibrado
  data/                 Contenido declarativo: rangos, negocios, objetos, eventos, logros…
  game/
    engine.ts           Motor puro (sin DOM): clic, tick, compras, eventos, prestigio, offline
    derive.ts           Cálculo de estadísticas derivadas a partir de efectos
    persistence.ts      Serialización, copia de seguridad, exportar/importar
    runtime.ts          Bucle a 10 Hz, autoguardado, detección de ausencia
  render/               Pixel art procedural (paleta, personaje, escenarios, iconos) + escena Phaser
  fx/                   Efectos: niveles de intensidad, lienzo de partículas reutilizado, sacudida de pantalla
  audio/                Efectos y música sintetizados con WebAudio
  ui/                   Interfaz React (paneles, ventanas, notificaciones)
  online/               Capa Supabase opcional (carga diferida)
  monetization/         Interfaz inerte (ver abajo)
  i18n/                 Textos de interfaz en/es y traducción del contenido (es/*.json)
supabase/               Migración SQL y Edge Function
scripts/                Simulador de equilibrado y prueba e2e
tests/                  Tests unitarios
```

Principios: el motor es determinista e independiente del DOM (reloj y aleatoriedad inyectables, testeable); todo el contenido es datos; el equilibrado está centralizado en un único archivo.

**Monetización:** solo existe la interfaz `src/monetization/index.ts` con un proveedor nulo. No hay pagos, anuncios ni tienda. Cualquier implementación futura debe ser exclusivamente cosmética y no afectar al ranking.

---

## 6. Pendiente / limitaciones conocidas

- Textos guardados en partidas antiguas (eventos diferidos pendientes, bonificaciones activas) conservan el idioma en que se generaron.
- Supabase sin probar contra un proyecto real (ver 3.2). El antitrampas es básico.
- Música: un bucle chiptune procedural por etapa; no hay pistas compuestas.
- Equilibrado de las etapas absurda/cósmica validado solo con el simulador, no con jugadores.
- Sin PWA/instalación offline ni notificaciones push.
- Navegadores probados: Chromium (escritorio y móvil emulado). Safari y Firefox sin verificar.
- Los efectos se han medido en Chromium sin aceleración gráfica; falta comprobarlos en un móvil real de gama baja.

Ver también [`docs/ASSETS.md`](docs/ASSETS.md) para el origen del arte y el audio.
