# Diseño técnico — *Vertiente: Macizo del Albor*

Juego original de deportes de invierno en mundo abierto (esquí, snowboard, parapente y wingsuit) para **Godot 4.3+**, escrito íntegramente en GDScript tipado. No usa plugins, modelos, texturas ni sonidos externos: el relieve, la vegetación, el personaje, los materiales y el audio se generan por código.

---

## 1. Principios de diseño

| Principio | Consecuencia práctica |
|---|---|
| Jugable antes que extenso | Cada fase termina en un estado que se abre y se juega sin errores |
| Cero montaje manual | La única escena (`main.tscn`) tiene un nodo; todo lo demás se crea en `_ready()` |
| Determinismo | El terreno es una función pura `altura(x, z)` con semilla fija: los chunks encajan y se pueden generar en paralelo |
| Desacoplamiento | Los sistemas se comunican por señales del `EventBus`, no por referencias directas |
| Rendimiento medible | Ajustes Bajo/Medio/Alto centralizados en `GameState.QUALITY_PRESETS` |

---

## 2. Arquitectura

```
                    ┌───────────── autoload/ (siempre activos) ─────────────┐
                    │ EventBus   GameState   SaveSystem   AudioBus          │
                    └──────▲───────────▲───────────▲────────────▲───────────┘
                           │ señales   │ ajustes   │ JSON       │ intensidades
main.tscn ── main.gd ──┬── Atmosphere (cielo, sol, niebla, calidad)
                       ├── TerrainManager ──► WorkerThreadPool ──► TerrainChunkBuilder
                       │        │                                      │ (datos puros)
                       │        └──► TerrainChunk × N ◄────────────────┘
                       │              (malla + HeightMapShape3D + MultiMesh de abetos)
                       ├── PlayerController (CharacterBody3D)
                       │        ├── Discipline activa ── SkiDiscipline (fase 1)
                       │        ├── CharacterModel (primitivas + animación procedural)
                       │        └── GPUParticles3D (nieve levantada)
                       ├── CameraRig (SpringArm3D + Camera3D)
                       ├── HUD (CanvasLayer) ── Compass
                       └── PauseMenu (CanvasLayer, funciona en pausa)
```

### Responsabilidades de los autoloads

| Autoload | Responsabilidad |
|---|---|
| `EventBus` | Señales globales: trucos, caídas, reapariciones, puntos, calidad, mensajes del HUD |
| `GameState` | Ajustes, preajustes de calidad, progresión y referencias a terreno y jugador |
| `SaveSystem` | Carga al arrancar y guardado automático (cada 60 s, al pausar y al cerrar) en `user://vertiente_guardado.json` |
| `AudioBus` | Crea los buses `Musica`, `Efectos`, `Ambiente`; sintetiza viento y siseo en tiempo real y efectos puntuales |

---

## 3. Estructura de carpetas (completa, con fases futuras)

| Carpeta | Fase | Contenido |
|---|---|---|
| `autoload/` | 1 | `event_bus.gd`, `game_state.gd`, `save_system.gd`, `audio_bus.gd` |
| `world/` | 1 → 3, 4, 7 | Muestreador de altura, constructor y gestor de chunks, vegetación, atmósfera, shader. Después: clima, ciclo día/noche, puntos de interés, avalanchas |
| `player/` | 1 → 2, 5, 6 | Controlador base, clase `Discipline`, `SkiDiscipline`, modelo procedural. Después: `SnowboardDiscipline`, `ParagliderDiscipline`, `WingsuitDiscipline` |
| `camera/` | 1 → 9 | Cámara en tercera persona. Después: modo foto |
| `ui/` | 1 → 4, 9 | HUD, brújula, tema, pausa. Después: mapa, minimapa, equipo, logros, menú inicial, remapeo |
| `missions/` | 4 | Desafíos, checkpoints, progresión |
| `ai/` | 8 | Rivales y fantasmas |
| `tests/`, `tools/` | 1 | Pruebas automáticas y generador del mapa de controles |

---

## 4. Decisiones físicas

### 4.1 CharacterBody3D para todas las disciplinas (justificación)

| Criterio | CharacterBody3D | RigidBody3D |
|---|---|---|
| Control fino de cantos, giros y trucos | Total: cada disciplina integra sus fuerzas | Hay que "pelear" con el solver aplicando fuerzas y pares |
| Estabilidad a 100+ km/h sobre heightmap | Alta: `move_and_slide` con *snap* al suelo | Rebotes y túnel en crestas si no se ajusta mucho |
| Determinismo (fantasmas y repeticiones, fase 8–9) | Sí: misma entrada → mismo resultado | Depende del solver |
| Coste | Bajo | Medio |

Se usa **CharacterBody3D** con un modelo de fuerzas propio por disciplina. Para parapente y wingsuit el mismo cuerpo integrará sustentación y resistencia aerodinámicas (no necesitan contacto con el suelo salvo al aterrizar). El ragdoll de la fase 7 será un conjunto aparte de `RigidBody3D` que se activa solo durante la caída.

### 4.2 Modelo del esquí (fase 1)

Cada fotograma de física (60 Hz):

1. **Gravedad proyectada** sobre el plano de la pendiente: `g_t = g − n·(g·n)`.
2. **Agarre del canto**: la dirección de la velocidad gira hacia la de los esquís con tasa `1 − e^(−agarre·Δt)`. El módulo **nunca aumenta**; se pierde una fracción proporcional al ángulo de deslizamiento y a la ineficacia del canto (el derrape frena).
3. **Rozamiento de Coulomb**: `μ · N`, con `μ` según la nieve.
4. **Resistencia aerodinámica cuadrática**: `k · v²`, con `k` menor en posición de huevo.
5. **Corrección de `move_and_slide`**: Godot anula la componente vertical de la velocidad al tocar suelo (pensado para personajes que caminan). Se recupera la velocidad calculada y se reproyecta sobre el plano del suelo nuevo; sin esto el esquiador perdía un 35 % de velocidad por fotograma en pendientes de 36°.

Parámetros por superficie (se mezclan con los pesos del punto exacto):

| Superficie | μ | Agarre | Eficacia de canto | Arrastre extra |
|---|---|---|---|---|
| Nieve polvo | 0,065 | 5,0 | 0,85 | 0,0028 |
| Nieve compactada | 0,032 | 8,5 | 0,94 | 0 |
| Hielo | 0,012 | 2,3 | 0,70 | 0 |
| Roca | 0,50 | 3,0 | 0,35 | 0,002 |

Velocidades máximas resultantes (verificadas en prueba automática): ~90 km/h de pie y ~120 km/h en huevo en pendientes de 35–45°.

### 4.3 Saltos, trucos y caídas

- **Máquina de estados**: `SKIING → AIRBORNE → SKIING` o `→ CRASHED → reaparición`.
- Paso al aire: al soltar salto (impulso según carga) o al perder el suelo más de 0,12 s.
- Rotaciones: giro (eje vertical) y mortal (eje lateral), con **autoalineación** cuando no se pulsa nada, y un retardo de 0,22 s para que los baches no provoquen giros accidentales.
- Aterrizaje válido si el error de giro y de mortal es < 0,8 rad y la velocidad contra el suelo < 20 m/s. Se admite aterrizaje *switch* (de espaldas).
- Choque contra pared, roca vertical o árbol si la velocidad contra la superficie supera 11 m/s.
- Puntos seguros cada 1,5 s para reaparecer.

---

## 5. Terreno

| Elemento | Decisión |
|---|---|
| Relieve | `FastNoiseLite` simplex fractal: cúpula del macizo + crestas `(1 − abs(ruido))³` + colinas + deformación de dominio |
| Erosión | **Simulada analíticamente**: canales de valle tallados donde el ruido de valles es casi cero, más profundos en altura. La erosión hidráulica real exige una malla global y rompería la generación independiente por chunks |
| Chunks | 128 × 128 m. LOD por distancia (Chebyshev): 64 / 32 / 16 / 8 cuadros por lado |
| Grietas entre LOD | Faldones verticales en los bordes de cada chunk |
| Colisión | `HeightMapShape3D` solo en los 3 × 3 chunks alrededor del jugador. Truco de escala uniforme: alturas divididas por el paso y nodo escalado por el paso |
| Hilos | `WorkerThreadPool`: los hilos generan solo datos (arrays); el hilo principal crea nodos en tandas de 2 chunks por fotograma |
| Horizonte | Malla lejana de 14 × 14 km a baja resolución, recortada en el shader (`discard`) donde ya hay chunks detallados |
| Vegetación | Abetos por debajo de 1150 m en pendientes < 32°, con `MultiMeshInstance3D` y rango de visibilidad; colisión de tronco cerca del jugador |
| Calibración | Distribución de pendientes medida: mayoría 10–40°, 1,6 % paredes > 60°; cumbre ~1540 m, valles ~480 m |

### Shader de terreno (`world/shaders/terrain.gdshader`)

- Pesos de superficie en el color del vértice (r polvo, g compactada, b hielo, a roca), rotos con ruido procedural.
- Normales detalladas por diferencias finitas: ondas de viento en la nieve y relieve en la roca, atenuadas con la distancia.
- Hielo con rugosidad 0,12 y especular 0,75; roca estratificada con nieve en repisas; destellos de cristales según la vista.
- Compatible con Forward+ y Compatibility.

---

## 6. Rendimiento y calidad

| Ajuste | Bajo | Medio | Alto |
|---|---|---|---|
| Radio de chunks (anillos) | 4 | 6 | 8 |
| Radio con árboles | 2 | 3 | 4 |
| Densidad de árboles | 45 % | 75 % | 100 % |
| Distancia de sombras | 140 m | 260 m | 420 m |
| Antialiasing | FXAA | MSAA 2× | MSAA 4× |
| Bloom / SSAO / niebla volumétrica | No / No / No | Sí / No / No | Sí / Sí / Sí |
| Hilos de generación simultáneos | 2 | 3 | 4 |

Medidas tomadas: cada muestra de altura cuesta ~1,3 µs; un chunk de máximo detalle (4.489 muestras) se genera en ~6 ms en un hilo; el arranque completo tarda ~0,6 s en el entorno de pruebas.

---

## 7. Plan por fases

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Terreno por chunks, esquí, cámara, shader de nieve, HUD mínimo, pausa con ajustes, guardado, audio de viento | **Cerrada** |
| 2 | Snowboard (cantos, grabs, rails), cambio de disciplina en pleno recorrido con transición, huellas persistentes que cubre la nevada | Siguiente |
| 3 | Ciclo día/noche (amanecer, atardecer, estrellas, aurora), clima dinámico con efecto en visibilidad, viento y fricción, ventisca y aliento | Pendiente |
| 4 | Mundo vivo y progresión: rocas, cabañas, remontes, balizas, refugios, miradores, saltos, cañones, viaje rápido, mapa y minimapa con niebla de exploración, desafíos, reputación, niveles y equipamiento | Pendiente |
| 5 | Parapente: térmicas, ascenso, planeo y aterrizaje de precisión | Pendiente |
| 6 | Wingsuit: vuelo rasante y objetivos de proximidad | Pendiente |
| 7 | Avalanchas (riesgo por pendiente, nevada reciente y velocidad), ragdoll, daño | Pendiente |
| 8 | Rivales con IA y fantasmas de mejores marcas | Pendiente |
| 9 | Modo foto con filtros, repetición de 30 s, menú inicial, remapeo de controles, música procedural, SDFGI en Alto y pulido | Pendiente |

### Método de cierre de cada fase

1. Ejecución sin errores en modo *headless* (lógica) durante 900 fotogramas.
2. Prueba automática de jugabilidad (`tests/prueba_fase1.gd` y sucesoras): descenso, giros, saltos, trucos, cambio de calidad, pausa y reaparición.
3. Capturas reales con el renderizador Compatibility (`tests/captura_pantalla.gd`) para validar shader y aspecto.
4. Revisión de fugas de memoria al salir (`--verbose`).
