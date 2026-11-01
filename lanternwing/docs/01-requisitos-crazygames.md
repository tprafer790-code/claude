# Requisitos de CrazyGames para desarrolladores

Fuente: documentación oficial `docs.crazygames.com` (páginas *requirements/intro*, *technical*, *gameplay*, *quality*, *ads* y *sdk/html5-v3*), consultada el 1 de noviembre de 2026. Los apartados marcados como **no verificado** no figuran en las páginas leídas.

## 1. Fases de publicación

| Aspecto | Basic Launch | Full Launch |
|---|---|---|
| Acceso | Cualquier juego que supere la revisión | Solo juegos seleccionados por CrazyGames tras el Basic Launch |
| SDK | Opcional (si se integra, al menos `gameplayStart`) | Obligatorio: `gameplayStart`/`gameplayStop`, módulo Data si hay progreso |
| Monetización | Desactivada, sin reparto de ingresos | Anuncios por SDK con reparto de ingresos |
| Anuncios externos | Prohibidos | Prohibidos (solo SDK) |
| Entrada al juego | QA visual básico | El jugador nuevo debe entrar en gameplay directamente (máx. 1 clic) |
| Cuentas | Sin logins externos | Progreso vinculado a la cuenta de CrazyGames |

**Consecuencia práctica:** el juego debe funcionar perfectamente **con los anuncios desactivados** (en Basic Launch el SDK devuelve error `adsDisabled`). Un botón de anuncio recompensado que no hace nada es motivo de rechazo.

## 2. Requisitos técnicos

| Requisito | Valor |
|---|---|
| Descarga inicial (hasta el primer `gameplayStart`) | ≤ 50 MB |
| Descarga inicial para aparecer en portada móvil | ≤ 20 MB |
| Tamaño total | ≤ 250 MB (≤ 50 MB si no hay SDK) |
| Número de archivos | ≤ 1500 |
| Tiempo hasta gameplay con recursos externos | ≤ 20 s |
| Rutas | Solo relativas, nunca absolutas |
| Navegadores | Chrome y Edge obligatorios; si falla en Safari, se desactiva en Safari |
| Chromebook | Debe ir fluido con 4 GB de RAM |
| Entrada | Ratón, teclado y táctil (si se declara compatible con móvil) |
| Orientación | Horizontal en escritorio; vertical permitida con bandas |
| Móvil | CSS `user-select: none` en `body`; funcionar en la app de CrazyGames (pantalla completa, zonas seguras) |
| Audio en iOS | `audioContext.resume()` dentro de un gesto (`touchend`/`click`) |
| Sitelock | Opcional |
| Consentimiento | Aviso simple recomendado, no ventana bloqueante |

## 3. Requisitos de jugabilidad

1. **Legibilidad** con `devicePixelRatio` 1 en estos tamaños: 907×510, 1216×684, 1077×606, 821×462 (escritorio); 1366×768, 1920×1080, 1536×864, 1280×720 (pantalla completa); 800×450 (móvil); 1080×607 (tableta).
2. **Física constante** a 60, 144 o 165 Hz (paso de simulación fijo).
3. **Inglés obligatorio**; traducciones correctas; idioma según `systemInfo` con inglés como respaldo.
4. **Controles intuitivos** en todos los dispositivos.
5. **Rendimiento**: carga rápida, sin errores ni cuelgues.
6. **Originalidad** de nombres, recursos y contenido. Un nombre genérico exige ser titular de la marca.
7. **Pantalla completa**: la proporciona CrazyGames; **prohibido** el botón propio.
8. **Sin promoción cruzada** (salvo excepciones: comunidad, tiendas de escritorio, enlaces a CrazyGames, juegos de la misma saga). Nunca enlaces a App Store dentro del juego.
9. **PEGI 12** como máximo.

## 4. Directrices de calidad (recomendadas)

- Tutorial breve, integrado en la partida y que se pueda saltar; poco texto.
- Evitar la tecla **Escape** (cierra la pantalla completa) y **Ctrl/Cmd + W**.
- Adaptar controles a teclados AZERTY (ZQSD) cuando sea posible.
- Volumen y resolución coherentes.

## 5. Anuncios

| Regla | Detalle |
|---|---|
| Momento del *midgame* | Puntos lógicos (fin de partida, cambio de nivel); nunca durante el juego ni en botones de navegación (menú, ajustes, tienda) |
| Frecuencia | Gestionada por CrazyGames (máx. 1 cada 3 min); las peticiones tempranas se ignoran |
| Durante el anuncio | Pausar el juego y bloquear la interfaz hasta `adFinished` o `adError` |
| Audio | Silenciar al **empezar** el anuncio (`adStarted`), no al pedirlo |
| Recompensados | Opcionales, con icono de vídeo, sin encadenar anuncios, sin botón en plena acción, con alternativa sin anuncio; **no recompensar en `adError`** |
| Incompatibilidad | No combinar *midgame* entre niveles con un recompensado de "seguir jugando": hay que elegir uno |
| Bloqueadores | El jugador con *adblock* debe poder jugar con normalidad |

## 6. SDK HTML5 v3

```html
<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
```

| Llamada | Cuándo |
|---|---|
| `await CrazyGames.SDK.init()` | En la pantalla de carga, antes de cualquier otra llamada |
| `game.loadingStart()` / `loadingStop()` | Opcional, inicio y fin de la carga |
| `game.gameplayStart()` | Al empezar o reanudar la acción |
| `game.gameplayStop()` | En cualquier pausa: menú, cambio de nivel, pausa |
| `game.happytime()` | Solo en logros especiales (récord, jefe) |
| `ad.requestAd("midgame" \| "rewarded", {adStarted, adFinished, adError})` | Ver apartado 5 |
| `data.setItem/getItem/removeItem/clear` | Guardado sincronizado con la cuenta (límite 1 MB) |

Entornos: en `localhost` el SDK funciona en modo local (sin anuncios reales); en dominios de CrazyGames funciona; **en cualquier otro dominio todas las llamadas lanzan error**, por lo que el juego necesita un envoltorio que tolere la ausencia del SDK.

Código obligatorio de la lista de QA para evitar que la página se desplace:

```js
window.addEventListener("wheel", e => e.preventDefault(), { passive: false });
window.addEventListener("keydown", e => {
  if (["ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
});
```

## 7. Material para el envío

- Descripción y controles del juego (metadatos cualitativos).
- Portadas (imágenes) y vídeos.
- Indicar si el juego guarda progreso.
- Si se recogen datos personales más allá de los eventos del SDK: aviso de Términos y Política de privacidad.

## 8. No verificado

- Porcentaje de reparto de ingresos y condiciones de exclusividad: no figuran en las páginas leídas.
- Detalle de la API del módulo `user` y de los banners (página bloqueada por `robots.txt`).
- Criterios exactos para pasar de Basic Launch a Full Launch (métricas de jugadores, tiempo medio y conversión aparecen en el panel, sin umbrales publicados).
