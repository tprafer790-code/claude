/* Bottega Leonardo · todo avanza con el scroll: bocetos que se trazan, vídeos que se
   recorren fotograma a fotograma, texto que se entinta y la retícula vitruviana fija.
   Sin JavaScript o con movimiento reducido, la página se ve completa y estática. */
(() => {
  const raiz = document.documentElement;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const escritorio = matchMedia('(min-width: 900px)');
  const barra = document.querySelector('.progreso span');
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const navH = () => (nav ? nav.getBoundingClientRect().bottom : 0);

  // Barra de progreso de lectura y tono de la navegación según la sección que tiene debajo
  const nav = document.querySelector('.nav');
  const leer = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (barra) barra.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    if (!nav) return;
    const bajo = document.elementFromPoint(innerWidth / 2, navH() + 2);
    const azul = !!(bajo && bajo.closest('[data-tono="azul"]'));
    if (azul !== (nav.dataset.tono === 'azul')) {
      if (azul) nav.dataset.tono = 'azul'; else delete nav.dataset.tono;
    }
  };

  const videos = [...document.querySelectorAll('video[data-src]')];
  const cargar = (v) => {
    if (v.src) return;
    v.addEventListener('error', () => { v.removeAttribute('src'); v.hidden = true; }, { once: true });
    v.preload = 'auto';
    v.src = v.dataset.src;
  };

  if (reducido) {
    // Sin movimiento automático: el visitante reproduce los vídeos si quiere
    videos.forEach((v) => { v.controls = true; cargar(v); });
    addEventListener('scroll', leer, { passive: true });
    leer();
    return;
  }
  raiz.classList.add('dibujar', 'fijar', 'revelar');

  // ---------------------------------------------------------------- texto que se entinta
  // Cada palabra pasa de gris claro a tinta según el texto cruza la pantalla
  const partir = (el) => {
    const andar = (nodo) => {
      for (const hijo of [...nodo.childNodes]) {
        if (hijo.nodeType === 1) { andar(hijo); continue; }
        if (hijo.nodeType !== 3 || !hijo.textContent.trim()) continue;
        const frag = document.createDocumentFragment();
        hijo.textContent.split(/(\s+)/).forEach((trozo) => {
          if (!trozo) return;
          if (/^\s+$/.test(trozo)) { frag.append(trozo); return; }
          const s = document.createElement('span');
          s.className = 'pal';
          s.textContent = trozo;
          frag.append(s);
        });
        nodo.replaceChild(frag, hijo);
      }
    };
    andar(el);
    return { el, pal: [...el.querySelectorAll('.pal')], ultimo: -1 };
  };
  const textos = [...document.querySelectorAll('.entintar')].map(partir);
  const entintar = (t, p) => {
    if (Math.abs(p - t.ultimo) < 0.003) return;
    t.ultimo = p;
    const n = t.pal.length;
    t.pal.forEach((s, i) => { s.style.opacity = (0.16 + 0.84 * clamp((p * (n + 3) - i) / 3)).toFixed(3); });
  };
  const progresoTexto = (el) => {
    const r = el.getBoundingClientRect();
    return clamp((innerHeight * 0.92 - r.top) / (innerHeight * 0.55));
  };

  // Fichas de las obras: Encargo, Proceso y Resultado aparecen en orden
  const revelarFicha = (obra, p) => {
    obra.querySelectorAll('.ficha > div').forEach((d, k) => d.classList.toggle('vista', p > 0.08 + k * 0.26));
  };

  // ---------------------------------------------------------------- bocetos
  const preparar = (svg) => ({ svg, trazos: [...svg.querySelectorAll('.tinta path')], ultimo: -1 });
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
  const bocetos = [...document.querySelectorAll('.obra .boceto')].map((svg) => ({ ...preparar(svg), obra: svg.closest('.obra') }));

  // ---------------------------------------------------------------- vídeos recorridos con el scroll
  // El scroll fija el instante objetivo; el vídeo se acerca a él con suavidad en cada fotograma
  const recorridos = videos.map((v) => ({
    v,
    obra: v.closest('.obra-scrub'),
    taller: v.closest('.taller'),
    marco: v.closest('.scrub-marco'),
    objetivo: 0,
    actual: 0,
  }));
  const cerca = new IntersectionObserver((entradas) => {
    for (const e of entradas) if (e.isIntersecting) cargar(e.target);
  }, { rootMargin: '150% 0px' });
  recorridos.forEach((r) => cerca.observe(r.v));

  const progresoFijo = (sec, arriba) => {
    const r = sec.getBoundingClientRect();
    const recorrido = r.height - (innerHeight - arriba);
    return clamp((arriba - r.top) / (recorrido > 0 ? recorrido : 1));
  };
  const progresoVideo = (r) => {
    if (r.taller) return progresoFijo(r.taller, 0);
    if (escritorio.matches) return progresoFijo(r.obra, navH());
    const m = r.marco.getBoundingClientRect();
    // En móvil no hay sección fija: el vídeo se recorre mientras el marco cruza la pantalla
    return clamp((innerHeight * 0.9 - m.top) / (innerHeight * 0.55 + m.height));
  };

  let mover = false;
  const animarVideos = () => {
    mover = false;
    for (const r of recorridos) {
      const d = r.v.duration;
      if (!d || r.v.readyState < 1) continue;
      const delta = r.objetivo - r.actual;
      if (Math.abs(delta) < 0.004) continue;
      r.actual += delta * 0.22;
      r.v.currentTime = Math.min(d - 0.05, r.actual * d);
      mover = true;
    }
    if (mover) requestAnimationFrame(animarVideos);
  };
  recorridos.forEach((r) => r.v.addEventListener('loadedmetadata', () => { r.actual = -1; pedir(); }));

  // ---------------------------------------------------------------- método
  const metodo = document.querySelector('.metodo');
  const vit = document.querySelector('.metodo .boceto');
  const pasos = [...document.querySelectorAll('.pasos li')];
  const contador = document.querySelector('.contador-n');
  const grupos = [0, 1, 2, 3, 4].map((k) => [...vit.querySelectorAll(`.tinta path[data-paso="${k}"]`)]);
  const anotasVit = [...vit.querySelectorAll('.anota')];
  let pasoActivo = -1, ultimoVit = -1;

  const actualizarMetodo = () => {
    const P = progresoFijo(metodo, 0);
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

  // ---------------------------------------------------------------- bucle de scroll
  let pendiente = false;
  const cuadro = () => {
    pendiente = false;
    const vh = innerHeight;
    for (const b of bocetos) {
      const r = b.svg.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;
      const p = clamp((vh - r.top) / (vh * 0.62 + r.height * 0.5));
      trazar(b, p);
      revelarFicha(b.obra, p);
    }
    for (const r of recorridos) {
      const p = progresoVideo(r);
      r.objetivo = p;
      if (r.marco) r.marco.style.setProperty('--p', p.toFixed(4));
      if (r.obra) revelarFicha(r.obra, p);
      if (r.taller) {
        r.taller.style.setProperty('--zoom', (1 + 0.16 * p).toFixed(4));
        const cita = r.taller.querySelector('.cita');
        const t = textos.find((x) => x.el === cita);
        if (t) entintar(t, clamp((p - 0.12) / 0.6));
      }
    }
    for (const t of textos) if (!t.el.closest('.taller')) entintar(t, progresoTexto(t.el));
    if (!mover) { mover = true; requestAnimationFrame(animarVideos); }
    actualizarMetodo();
    leer();
  };
  const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(cuadro); } };
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', pedir);
  cuadro();
})();
