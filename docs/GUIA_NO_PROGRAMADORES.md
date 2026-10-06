# Guía para no programadores — Cómo instalar y jugar a *Vertiente*

Esta guía no da nada por supuesto. Si sigues los pasos en orden, en unos 10 minutos tendrás el juego funcionando. **No hace falta escribir código ni colocar nada a mano en el editor**: todo el juego se construye solo al arrancar.

---

## Qué vas a necesitar

| Requisito | Detalle |
|---|---|
| Ordenador | Windows 10/11, macOS 11 o superior, o Linux |
| Tarjeta gráfica | Cualquiera de los últimos 8–10 años. Si es muy antigua, ver el apartado de errores (renderizador "Compatibility") |
| Espacio en disco | Unos 200 MB (Godot + proyecto) |
| Programa | **Godot 4.3** o superior (gratuito, no necesita instalación) |
| Conexión a Internet | Solo para descargar Godot y el proyecto |

---

## Paso 1. Descargar Godot

1. Abre el navegador y entra en **https://godotengine.org/download**
2. La web detecta tu sistema operativo. Pulsa el botón grande **"Godot Engine"** (la versión normal).
   - **No** descargues la versión ".NET" / "C#": este proyecto no la necesita.
   - Si la versión que aparece es la 4.3, 4.4, 4.5 o posterior, sirve cualquiera.
3. Se descarga un archivo comprimido (`.zip`).
4. **Windows:** haz clic derecho sobre el `.zip` → **Extraer todo…** → **Extraer**. Dentro verás un archivo llamado algo como `Godot_v4.x-stable_win64.exe`. Ese es el programa: no se instala, se abre directamente.
   - Consejo: mueve la carpeta extraída a un sitio fijo, por ejemplo `Documentos\Godot`.
5. **macOS:** abre el `.zip`; aparece `Godot.app`. Arrástrala a la carpeta **Aplicaciones**.
6. **Linux:** descomprime el `.zip` y da permiso de ejecución al archivo (clic derecho → Propiedades → Permisos → "Permitir ejecutar como programa").

---

## Paso 2. Descargar el proyecto del juego

La forma más sencilla es descargar el repositorio entero como un `.zip`, en lugar de copiar archivo por archivo.

1. Entra en la página del repositorio en GitHub: **https://github.com/tprafer790-code/claude**
2. Arriba a la izquierda verás un desplegable con el nombre de la rama (pone `main`). Púlsalo y elige **`claude/gracious-cori-ban4mg`** (si el trabajo ya se ha fusionado en `main`, deja `main`).
3. Pulsa el botón verde **`<> Code`** → **Download ZIP**.
4. Descomprime el `.zip` (clic derecho → **Extraer todo…**).
5. Dentro encontrarás varias carpetas. La que importa es **`game`**: dentro de ella está el archivo **`project.godot`**. Recuerda dónde está.
   - Consejo: mueve la carpeta `game` a `Documentos\Vertiente` para encontrarla fácilmente.

> **Alternativa (copiar y pegar archivos a mano):** si no puedes descargar el `.zip`, crea una carpeta llamada `Vertiente` y reproduce dentro exactamente la estructura de la carpeta `game` del repositorio (mismas subcarpetas, mismos nombres de archivo, con mayúsculas y minúsculas idénticas). Para cada archivo: ábrelo en GitHub, pulsa el icono **"Copy raw file"** (dos hojas superpuestas), crea un archivo de texto con el mismo nombre en tu carpeta (por ejemplo con el Bloc de notas, eligiendo "Todos los archivos" al guardar para que no añada `.txt`) y pega el contenido. Es más laborioso y propenso a errores; usa el `.zip` siempre que puedas.

---

## Paso 3. Abrir el proyecto en Godot

1. Abre Godot (doble clic en el `.exe` en Windows, o en `Godot.app` en macOS).
2. Aparece el **Administrador de proyectos** (*Project Manager*). La primera vez estará vacío.
3. Pulsa el botón **Importar** (*Import*), arriba a la izquierda.
4. Se abre una ventana para buscar archivos. Navega hasta la carpeta `game` y selecciona el archivo **`project.godot`**. Pulsa **Abrir** (*Open*).
5. Pulsa **Importar y editar** (*Import & Edit*).
6. Si usas Godot 4.4 o posterior, puede aparecer un aviso de que el proyecto se creó con una versión anterior y se va a convertir/actualizar. Pulsa **Aceptar / Convertir** (*OK / Convert*). Es normal.
7. Se abre el editor. **La primera vez tarda entre 10 segundos y un minuto** porque prepara sus archivos internos (verás una barra de progreso). Espera a que termine.

> El idioma del editor sigue al de tu sistema. Si aparece en inglés y lo prefieres en español: menú **Editor → Editor Settings → Interface → Editor → Editor Language → es**, y reinicia Godot.

---

## Paso 4. Ejecutar el juego

1. En la esquina **superior derecha** del editor hay varios botones. Pulsa el triángulo **▶ (Ejecutar proyecto / Run Project)**, o la tecla **F5**.
2. Se abre una ventana nueva con la pantalla de carga **"VERTIENTE · Macizo del Albor"** mientras se genera la montaña (unos segundos).
3. Aparece tu esquiador cerca de la cumbre. ¡Ya puedes jugar!
4. Para cerrar el juego: tecla **Esc** → **Guardar y salir**, o cierra la ventana. El progreso se guarda solo.

---

## Paso 5. Controles

| Acción | Teclado y ratón | Mando |
|---|---|---|
| Girar / en el aire: girar sobre ti mismo | A / D o ← → | Stick izquierdo |
| Impulso con bastones / en el aire: mortal adelante | W o ↑ | Stick izquierdo arriba |
| Cuña para frenar / en el aire: mortal atrás | S o ↓ | Stick izquierdo abajo |
| Posición de huevo (más velocidad) | Mayús izquierda | Gatillo derecho |
| Derrape (giro cerrado frenando) | Ctrl izquierdo | B / Círculo |
| Saltar (mantén para cargar, suelta para saltar) | Espacio | A / Cruz |
| Grab en el aire (suéltalo antes de aterrizar) | E o clic izquierdo | Gatillo izquierdo |
| Mirar alrededor | Ratón | Stick derecho |
| Reaparecer en el último punto seguro | R | Select / Back |
| Pausa y ajustes | Esc | Start |
| Mostrar / ocultar ayuda | F1 | Y / Triángulo |

**Consejos de juego**
- Si te quedas parado en una zona casi llana, pulsa **W** para impulsarte con los bastones.
- Para aterrizar bien un truco, deja de pulsar las teclas de giro antes de tocar el suelo: el cuerpo se endereza solo.
- Las zonas grises son roca (frenan mucho) y las azuladas son hielo (patinan).

---

## Paso 6. Ajustar la calidad gráfica

1. Durante la partida pulsa **Esc**.
2. En **Calidad gráfica** elige **Bajo**, **Medio** o **Alto**.
   - **Bajo:** portátiles sin tarjeta gráfica dedicada.
   - **Medio:** valor por defecto, portátiles normales.
   - **Alto:** ordenadores con tarjeta gráfica dedicada.
3. Marca **Mostrar FPS** para ver los fotogramas por segundo arriba a la derecha. Lo ideal es 60; si baja de 30, reduce la calidad.

---

## Errores típicos y su solución

| Síntoma | Causa probable | Solución |
|---|---|---|
| Al importar, Godot dice que no encuentra un proyecto | Has seleccionado la carpeta equivocada | Entra en la carpeta **`game`** y selecciona exactamente el archivo `project.godot` |
| Mensaje "Your video card drivers seem not to support Vulkan" o la ventana se queda en negro | La tarjeta gráfica no admite el renderizador Forward+ | Usa el renderizador **Compatibility** (ver instrucciones debajo de la tabla) |
| El juego va muy lento (menos de 30 FPS) | Equipo modesto | Esc → Calidad gráfica **Bajo**. Si no basta, cambia al renderizador **Compatibility** |
| Al abrir el editor aparecen errores en rojo del tipo *"Could not find type…"* o *"Identifier not found"* | La primera importación no terminó de registrar los scripts | Menú **Proyecto → Recargar proyecto actual** (*Project → Reload Current Project*). Si persiste, cierra Godot y vuelve a abrirlo |
| El ratón desaparece y no puedo salir | El juego captura el ratón para mover la cámara | Pulsa **Esc** (aparece el menú de pausa y el ratón) |
| Las teclas no responden | La ventana del juego no tiene el foco | Haz clic una vez dentro de la ventana del juego |
| No se oye nada | Volumen bajo o silenciado | Esc → sube **Volumen general**; revisa también el volumen del sistema |
| El mando no responde | Godot lo detecta al conectarlo antes de abrir el juego | Conecta el mando, cierra el juego y vuelve a ejecutarlo (F5) |
| macOS: "No se puede abrir Godot porque es de un desarrollador no identificado" | Protección Gatekeeper | Clic derecho sobre `Godot.app` → **Abrir** → **Abrir**. Solo hace falta la primera vez |
| Windows: el antivirus o SmartScreen bloquea Godot | Ejecutable descargado de Internet | Pulsa **Más información → Ejecutar de todas formas** |
| Pulso ▶ y me pide elegir una "escena principal" | Se ha borrado o movido `main.tscn` | Comprueba que `main.tscn` está en la carpeta `game`. Si no, vuelve a descargar el proyecto |
| Quiero empezar de cero (borrar progreso) | — | Borra el archivo `vertiente_guardado.json`: en Godot, menú **Proyecto → Abrir carpeta de datos del proyecto** (*Project → Open User Data Folder*) |

### Cómo cambiar al renderizador Compatibility (equipos antiguos)

1. Abre el proyecto en el editor.
2. En la **esquina superior derecha** verás un desplegable que pone **Forward+**.
3. Púlsalo y elige **Compatibility**.
4. Godot pedirá reiniciar el editor: acepta (**Guardar y reiniciar**).
5. Pulsa **▶** de nuevo.

Con Compatibility se pierden algunos efectos (niebla volumétrica, oclusión ambiental), pero el juego es el mismo.

---

## Dónde están las cosas (por curiosidad)

| Carpeta | Contenido |
|---|---|
| `autoload/` | Sistemas globales: estado de la partida, guardado, audio y avisos entre sistemas |
| `world/` | Generación de la montaña, árboles, cielo y luz |
| `player/` | El esquiador: física, controles y su modelo 3D |
| `camera/` | La cámara que te sigue |
| `ui/` | Marcadores, brújula y menú de pausa |
| `missions/`, `ai/` | Reservadas para fases posteriores (desafíos y rivales) |
| `tests/`, `tools/` | Herramientas de desarrollo; no hace falta tocarlas |
