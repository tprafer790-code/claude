# Documento de diseño: Lanternwing

## 1. Concepto

Eres una **polilla-farolillo** que protege un jardín nocturno. Durante 5 minutos llegan oleadas crecientes de escarabajos y polillas de sombra. Tu luz ataca sola; tú decides hacia dónde volar, qué rocío recoger y qué bendiciones elegir al subir de nivel. Si aguantas hasta el amanecer, ganas.

| Elemento | Decisión |
|---|---|
| Género | Supervivencia contra hordas con mejoras (*arena survival*), un género amplio y no una copia de un título concreto |
| Partida | 5 minutos, con victoria al amanecer |
| Control | Un dedo (joystick flotante en cualquier punto), WASD/ZQSD o flechas; el ataque es automático. **Impulso** con Espacio/Mayús o botón táctil |
| Progresión dentro de la partida | Niveles con elección 1 de 3 entre 5 armas y 6 pasivas (máx. nivel 5 cada una) y **5 evoluciones** de arma |
| Progresión entre partidas | Néctar → 6 mejoras permanentes, 5 polillas desbloqueables, 5 noches de dificultad y misiones (ver [retención](06-retencion.md)) |
| Estética | Noche, brillo cálido frente a siluetas violetas; todo dibujado por código |

## 2. Originalidad y derechos

- **Nombre, personajes, textos, gráficos y sonidos son originales**: no hay ni un archivo de imagen ni de audio; todo se genera con Canvas y Web Audio.
- El género (sobrevivir a oleadas con ataque automático y mejoras) es una convención compartida por muchos juegos, igual que "plataformas" o "puzle de fusión". Lanternwing no reproduce los personajes, el mundo, la interfaz ni el contenido de ningún juego concreto.
- **Nombre**: no se ha encontrado ningún juego llamado exactamente "Lanternwing". Existen títulos parecidos ("Lanternward" en CrazyGames, "Lanternwake" en itch.io). Como la guía de calidad pide que el nombre no se confunda con otros, conviene valorar antes del envío una alternativa más distintiva (por ejemplo, *Moth Lantern: Night Garden* o *Glowmoth Garden*) y comprobarla en el buscador de CrazyGames.

## 3. Bucle de juego

1. Mover la polilla → la luz dispara a la sombra más cercana. El **impulso** (0,18 s, ×3,2 de velocidad, invulnerable, recarga 2,4 s) permite atravesar un cerco o esquivar una embestida.
2. Las sombras derrotadas sueltan **rocío** (experiencia) y, a veces, **néctar** (moneda).
3. Al subir de nivel, el juego se pausa y se elige 1 de 3 bendiciones.
4. A los 2:30 y 4:15 aparece una **Sombra Anciana** (jefe). Cada pocos segundos marca una línea durante 0,8 s, embiste en esa dirección y suelta un anillo de esporas. Derrotarla concede dos niveles, una flor de luna y una semilla de viento.
5. A los 1:00, 2:00 y 3:20 un anillo de enemigos rodea al jugador; desde 4:30, enjambre final.
6. Fin de la partida → resultados → néctar → mejoras permanentes → otra partida.

## 4. Contenido

### Armas

| Arma | Efecto | Mejora por nivel |
|---|---|---|
| Rayo de luz (inicial) | Proyectil al enemigo más cercano | +1 proyectil (nv. 2 y 4), recarga −18 % (nv. 3), perfora (nv. 5), +25 % daño |
| Halo de pétalos | Pétalos orbitando | +1 pétalo, +30 % daño |
| Pulso luminoso | Onda que daña y repele | +15 % radio, +30 % daño, −0,3 s recarga |
| Estallido estelar | Esquirlas en todas direcciones | +2 esquirlas, +25 % daño |
| Luciérnagas amigas | Aliados que persiguen sombras | +1 luciérnaga, +25 % daño |

### Evoluciones

Cuando un arma llega al nivel 5 y su pasiva compañera al nivel 2, la siguiente subida ofrece su evolución (carta dorada). Cada carta de arma indica qué pasiva la hace evolucionar.

| Arma | Pasiva compañera | Evolución | Efecto |
|---|---|---|---|
| Rayo de luz | Lente de cristal | Lanza solar | 5 lanzas perforantes, más rápidas y fuertes |
| Halo de pétalos | Floración plena | Jardín de rosas | 8 pétalos grandes |
| Pulso luminoso | Corazón cálido | Estallido del alba | Pulso mayor que cura por cada sombra alcanzada |
| Estallido estelar | Ritmo lunar | Supernova | 24 esquirlas perforantes cada segundo |
| Luciérnagas amigas | Imán de rocío | Reina del enjambre | 8 luciérnagas reales más rápidas |

### Objetos

| Objeto | Efecto | Origen |
|---|---|---|
| Flor de luna | +25 de luz | 0,35 % de las sombras, 5 % de los acorazados, siempre los jefes |
| Semilla de viento | Atrae todo el rocío de la zona | Igual que la flor de luna |

### Pasivas

Alas veloces (+10 % velocidad), Corazón cálido (+20 luz máx.), Lente de cristal (+12 % daño), Floración plena (+12 % área), Ritmo lunar (−8 % recarga), Imán de rocío (+30 % radio de recogida). Si todo está al máximo, aparece *Agua de luna* (curación).

### Enemigos

| Enemigo | Rasgo | Aparece |
|---|---|---|
| Escarabajo de sombra | Lento y constante | Desde el inicio |
| Polilla de sombra | Rápida, vuelo zigzagueante | Desde 0:35 |
| Escarabajo acorazado | Mucha vida, suelta 5 de rocío | Desde 1:30 |
| Gemelo de sombra | Al disiparse se divide en tres polillas pequeñas | Desde 1:00 |
| Flor escupidora | Mantiene la distancia, parpadea y lanza esporas que hay que esquivar | Desde 2:00 |
| Sombra Anciana | Jefe con barra de vida, embestida avisada y anillo de esporas; flecha en el borde si está fuera de pantalla | 2:30 y 4:15 |

La vida de los enemigos crece con el tiempo (×(1 + t/85)) y la frecuencia de aparición pasa de 1,5/s a ~15/s (×1,6 en el enjambre final), con un tope de 340 enemigos simultáneos.

### Mejoras permanentes

Vitalidad, Rapidez, Resplandor, Atracción, Rocío dorado (+10 % néctar) y Renovación (regeneración). Coste = base × 1,6^nivel.

## 5. Equilibrio medido

Simulación acelerada con un bot, sin mejoras permanentes y eligiendo siempre la primera carta (es decir, peor que un jugador real):

| Bot | Resultado |
|---|---|
| Persigue rocío sin esquivar | Muere entre 1:10 y 1:55 |
| Persigue rocío y esquiva (versión 1) | Llega a 4:20-4:25 o gana; nivel 19-21; 1000-1500 bajas |
| Persigue rocío y esquiva (versión 2, con enemigos a distancia y embestidas) | Entre 2:37 y la victoria en la noche 1 sin mejoras; el bot no esquiva las esporas ni usa bien el impulso |

Lectura: un jugador atento roza la victoria en las primeras partidas y la consigue tras 2-3 compras en la tienda, que es el bucle de retención buscado. Las esporas y la embestida premian la habilidad (esquivar con el impulso), que el bot no tiene.

## 6. Técnica y rendimiento

| Técnica | Para qué |
|---|---|
| Paso fijo de 60 Hz con interpolación al dibujar | Física idéntica a 60, 144 y 165 Hz (requisito) |
| Sprites pre-renderizados (brillos y enemigos) | Evita `shadowBlur` y degradados por fotograma, que son lo más caro en Canvas |
| Rejilla espacial con *hash* | Colisiones casi lineales con 340 enemigos |
| Eliminación por intercambio y topes de partículas y gemas | Sin picos de memoria ni recolector de basura |
| Calidad adaptativa | Si el fotograma medio supera 24 ms durante 2 s, baja la resolución interna un peldaño (2× → 1× → 0,75× → 0,6×) |
| Sin recursos externos | 7 archivos, ~95 KB: carga instantánea, apto para portada móvil (≤ 20 MB) |
| Fondo y viñeta como capas HTML; escalera de calidad 2× → 0,6× | Ver [auditoría de rendimiento](05-auditoria-rendimiento.md) |

## 7. Accesibilidad y plataforma

- Interfaz escalada según el lado corto de la pantalla; botones de al menos 44 px.
- Inglés y español según `systemInfo`, con inglés por defecto.
- Pausa con **P** o botón en pantalla (no se usa Escape); pausa automática al cambiar de pestaña.
- Ajustes en la pausa: sonido, música y **temblor de pantalla** (desactivable para jugadores sensibles al movimiento).
- Botón táctil de impulso grande (76 px) y respetando las zonas seguras del móvil.
- Las amenazas se avisan siempre antes de golpear: la flor escupidora parpadea, la embestida dibuja su trayectoria y el jefe fuera de pantalla se señala con una flecha.
- Sin botón de pantalla completa (lo pone CrazyGames) y sin enlaces externos.
- Contenido apto para PEGI 7-12: fantasía sin sangre, los enemigos "se disipan".
