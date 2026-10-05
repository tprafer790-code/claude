# Planta simplificada, trayectoria y puntos de interés

Unidades en metros. Eje Y arriba; −Z = norte (hacia el lago y el sol poniente).

```
 z= 70  ·  bosque (inicio cámara)            ▲ cámara entra desde aquí
 z= 13  ════════╗   ╔════════  muro de acceso (x ±16), pasaje cubierto 4 m (x ±1.6, z 13→9)
 z=  9          ║   ║
        │ banco    sendero x≈-1.6   ▓ estanque x 0.6..6.5, z 8..-4 │
        │ árbol (-7,2)                                         │   muros patio x ±12
 z= -6  ══════[puerta x -2.4..-0.8]════════════  fachada sur suite (x ±10)
        │ consola cerámica      cabecero/ cama (x 4.75, z -9..-11)│
        │ butaca+lámpara (-4.5,-16.5)    bañera piedra (5.5,-16.5)│
 z=-20  ══════ ventanal, hoja central corredera x ±1.2 ══════════  torre-linterna (x -13..-9)
 z=-26  terraza de madera (x ±10), voladizo de cubierta hasta z=-24
 z=-38  pasarela x ±1.2 sobre el agua → mirador
        lago (y=-0.9) → montañas (z -250..-350), sol a -Z ligeramente al oeste
```

## Claves de cámara (pos → mirada · fov · capítulo)
Definidas en `src/journey/keys.js`. Entre claves: interpolación Catmull-Rom centrípeta con *smootherstep* por tramo (velocidad nula en cada clave = aceleración y frenada intencionadas). Las claves de «pausa» tienen tramo de permanencia sin desplazamiento.

La verificación de colisiones se ejecuta con `npm run check:path` (muestra la curva y comprueba distancia a los volúmenes AABB de muros y mobiliario).
