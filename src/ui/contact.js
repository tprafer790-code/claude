// Contacto operativo sin servidor: valida, compone un correo y lo abre en la
// aplicación del visitante. Nunca afirma que la solicitud se haya enviado.
import { brand } from '../config/brand.js';

export function initContact() {
  const { email, subject, responseNote } = brand.contact;
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const link = document.getElementById('contact-email');
  link.href = `mailto:${email}`; link.textContent = email;
  document.getElementById('form-note').textContent = responseNote;

  const room = document.getElementById('f-room');
  for (const r of brand.rooms) room.insertAdjacentHTML('beforeend', `<option value="${r.name}">${r.name}</option>`);

  document.getElementById('copy-email').addEventListener('click', async () => {
    const out = document.getElementById('copy-status');
    try { await navigator.clipboard.writeText(email); out.textContent = 'Dirección copiada.'; }
    catch { out.textContent = `No se pudo copiar automáticamente: ${email}`; }
  });

  const rules = {
    name: (v) => (v.trim().length < 2 ? 'Indica tu nombre.' : ''),
    email: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'Revisa el correo: falta la @ o el dominio.' : ''),
    message: (v) => (v.trim().length < 10 ? 'Escribe al menos una frase (10 caracteres).' : ''),
  };
  const check = (field) => {
    const el = form.elements[field], msg = rules[field](el.value);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    document.getElementById(`e-${field === 'message' ? 'msg' : field}`).textContent = msg;
    return !msg;
  };
  for (const f of Object.keys(rules)) form.elements[f].addEventListener('blur', () => form.elements[f].value && check(f));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.classList.remove('is-error');
    const ok = Object.keys(rules).map(check).every(Boolean);
    if (!ok) {
      status.classList.add('is-error');
      status.textContent = 'Hay campos por completar. Revisa los mensajes en rojo.';
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const d = Object.fromEntries(new FormData(form));
    const body = [
      `Nombre: ${d.name}`, `Correo: ${d.email}`, `Fechas aproximadas: ${d.dates || 'sin concretar'}`,
      `Personas: ${d.guests}`, `Estancia de interés: ${d.room || 'sin decidir'}`, '', d.message,
    ].join('\n');
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.__silvaLastMailto = url; // usado por las pruebas automáticas
    window.location.href = url;
    status.innerHTML = `Hemos preparado el correo en tu aplicación de correo. <strong>Aún no se ha enviado</strong>: revísalo y pulsa enviar. Si no se ha abierto, escribe a <a href="mailto:${email}">${email}</a>.`;
    status.focus();
  });

  // Preselección de estancia desde las tarjetas.
  return { preselect(name) { room.value = name; } };
}
