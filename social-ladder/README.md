# THE SOCIAL LADDER — *From Nothing to Everything*

Juego incremental (clicker + idle + tycoon + simulador de ascenso social) en pixel art 16‑bit para navegador de escritorio y móvil. Empiezas en una caja de cartón y subes 58 rangos hasta poseer conceptos abstractos del universo.

> Interfaz y contenido en inglés; arquitectura preparada para español (`src/i18n/`, la interfaz ya está traducida; los textos de contenido aún no).

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
| Presentación | Pixel art procedural, 8 escenarios, personaje que cambia según etapa y equipo, partículas, audio chiptune sintetizado (WebAudio) |
| Accesibilidad | Movimiento reducido, volumen/silencio, teclado (Espacio/Enter), diseño responsive |

**Pruebas realizadas:** 32 tests unitarios en verde; build de producción sin errores; prueba en Chromium (escritorio 1366×800 y móvil 390×844): clics, compra, todas las pestañas, persistencia tras recargar, sin errores de consola ni desbordamiento horizontal.

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
  audio/                Efectos y música sintetizados con WebAudio
  ui/                   Interfaz React (paneles, ventanas, notificaciones)
  online/               Capa Supabase opcional (carga diferida)
  monetization/         Interfaz inerte (ver abajo)
  i18n/                 Textos de interfaz en/es
supabase/               Migración SQL y Edge Function
scripts/                Simulador de equilibrado y prueba e2e
tests/                  Tests unitarios
```

Principios: el motor es determinista e independiente del DOM (reloj y aleatoriedad inyectables, testeable); todo el contenido es datos; el equilibrado está centralizado en un único archivo.

**Monetización:** solo existe la interfaz `src/monetization/index.ts` con un proveedor nulo. No hay pagos, anuncios ni tienda. Cualquier implementación futura debe ser exclusivamente cosmética y no afectar al ranking.

---

## 6. Pendiente / limitaciones conocidas

- Traducción al español de los **textos de contenido** (rangos, objetos, eventos). La interfaz ya está traducida.
- Supabase sin probar contra un proyecto real (ver 3.2). El antitrampas es básico.
- Música: un bucle chiptune procedural por etapa; no hay pistas compuestas.
- Equilibrado de las etapas absurda/cósmica validado solo con el simulador, no con jugadores.
- Sin PWA/instalación offline ni notificaciones push.
- Navegadores probados: Chromium (escritorio y móvil emulado). Safari y Firefox sin verificar.

Ver también [`docs/ASSETS.md`](docs/ASSETS.md) para el origen del arte y el audio.
