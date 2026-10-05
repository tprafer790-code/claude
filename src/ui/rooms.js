// Tarjetas de estancias y diálogo de detalle.
import { brand } from '../config/brand.js';

export function initRooms(contact) {
  const list = document.getElementById('rooms-list');
  list.innerHTML = brand.rooms.map((r, i) => `
    <li class="room">
      <div class="room__media"><img src="${r.image}" alt="${r.alt}" loading="lazy" width="1280" height="720" /><span class="idx">0${i + 1}</span></div>
      <h3>${r.name}</h3>
      <p class="eyebrow">${r.size}</p>
      <p>${r.summary}</p>
      <div class="room__actions">
        <button class="btn btn--ghost btn--small" type="button" data-room="${r.id}" aria-haspopup="dialog">Ver la estancia</button>
        <a class="link" href="#contacto" data-room-contact="${r.name}">Solicitar información</a>
      </div>
    </li>`).join('');

  const dlg = document.getElementById('room-dialog');
  let opener = null;
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-room]');
    const c = e.target.closest('[data-room-contact]');
    if (c) contact.preselect(c.dataset.roomContact);
    if (!b) return;
    const r = brand.rooms.find((x) => x.id === b.dataset.room);
    opener = b;
    document.getElementById('room-img').src = r.image;
    document.getElementById('room-img').alt = r.alt;
    document.getElementById('room-size').textContent = r.size;
    document.getElementById('room-title').textContent = r.name;
    document.getElementById('room-summary').textContent = r.summary;
    document.getElementById('room-features').innerHTML = r.features.map((f) => `<li>${f}</li>`).join('');
    document.getElementById('room-cta').onclick = () => { contact.preselect(r.name); opener = null; dlg.close(); };
    dlg.showModal();
  });
  dlg.addEventListener('close', () => opener?.focus());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
}
