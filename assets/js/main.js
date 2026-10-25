/* Bottega Leonardo · trazado de bocetos con el scroll y retícula vitruviana fija.
   Sin JavaScript o con movimiento reducido, todos los dibujos se ven completos. */
(() => {
  const raiz = document.documentElement;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const barra = document.querySelector('.progreso span');
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const suavizar = (t) => 1 - Math.pow(1 - t, 3);

  // Barra de progreso de lectura (también con movimiento reducido: no anima, solo indica)
  const leer = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (barra) barra.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };

  // Vídeo del interludio: solo si existe el archivo y el usuario no reduce el movimiento
  const video = document.querySelector('.taller video[data-src]');
  if (video && !reducido) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) { if (video.src) video.pause(); return; }
      if (!video.src) {
        video.addEventListener('error', () => video.remove(), { once: true });
        video.src = video.dataset.src;
      }
      video.play().catch(() => {});
    }, { rootMargin: '200px' });
    io.observe(video);
  }

  if (reducido) { addEventListener('scroll', leer, { passive: true }); leer(); return; }
  raiz.classList.add('dibujar', 'fijar');

  // Cada trazo recibe una ventana dentro del progreso del boceto, en el orden en que se escribió
  const preparar = (svg) => {
    const trazos = [...svg.querySelectorAll('.tinta path')];
    return { svg, trazos, ultimo: -1, anotas: [...svg.querySelectorAll('.anota')] };
  };
  const trazar = (b, p) => {
    if (Math.abs(p - b.ultimo) < 0.002) return;
    b.ultimo = p;
    const n = b.trazos.length;
    b.trazos.forEach((t, i) => {
      const ini = (i / n) * 0.62;
      t.style.strokeDashoffset = 1 - clamp((p - ini) / 0.38);
    });
    b.svg.classList.toggle('listo', p > 0.92);
  };

  // Portada: un único trazado al cargar
  const portada = document.querySelector('.portada .boceto');
  const bPortada = portada && preparar(portada);
  if (bPortada) {
    const t0 = performance.now();
    const paso = (ahora) => {
      const t = clamp((ahora - t0 - 250) / 2600);
      trazar(bPortada, suavizar(t));
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  // Obras: el trazo avanza y retrocede con el scroll
  const obras = [...document.querySelectorAll('.obra .boceto')].map(preparar);

  // Método: la sección fija se recorre en cinco pasos
  const metodo = document.querySelector('.metodo');
  const vit = document.querySelector('.metodo .boceto');
  const pasos = [...document.querySelectorAll('.pasos li')];
  const contador = document.querySelector('.contador-n');
  const grupos = [0, 1, 2, 3, 4].map((k) => [...vit.querySelectorAll(`.tinta path[data-paso="${k}"]`)]);
  const anotasVit = [...vit.querySelectorAll('.anota')];
  let pasoActivo = -1, ultimoVit = -1;

  const actualizarMetodo = () => {
    const r = metodo.getBoundingClientRect();
    const recorrido = r.height - innerHeight;
    const P = clamp(-r.top / (recorrido > 0 ? recorrido : 1));
    if (Math.abs(P - ultimoVit) < 0.001) return;
    ultimoVit = P;
    grupos.forEach((g, k) => {
      const local = clamp((P - k * 0.19) / 0.17);
      g.forEach((t, i) => {
        const ini = (i / g.length) * 0.5;
        t.style.strokeDashoffset = 1 - clamp((local - ini) / 0.5);
      });
    });
    anotasVit.forEach((a) => a.classList.toggle('on', P > (+a.dataset.paso * 0.19 + 0.12)));
    const activo = Math.min(4, Math.floor(P / 0.19));
    if (activo !== pasoActivo) {
      pasoActivo = activo;
      pasos.forEach((li, i) => {
        li.classList.toggle('activo', i === activo);
        if (i === activo) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      if (contador) contador.textContent = activo + 1;
    }
  };

  let pendiente = false;
  const cuadro = () => {
    pendiente = false;
    const vh = innerHeight;
    for (const b of obras) {
      const r = b.svg.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;
      trazar(b, clamp((vh - r.top) / (vh * 0.62 + r.height * 0.5)));
    }
    actualizarMetodo();
    leer();
  };
  const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(cuadro); } };
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', pedir);
  cuadro();
})();
