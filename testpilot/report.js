'use strict';

/**
 * TESTPILOT - Fase 3: generador de informes.
 *
 * Produce un unico archivo HTML auto-contenido (CSS integrado, capturas en
 * Base64, sin recursos externos) con el resultado de una ejecucion.
 *
 * generateReport(run, outputDir) -> ruta del archivo generado.
 *
 * Forma de `run`:
 *   url, goal, device, mode ('real' | 'simulado' | 'sin planificador'), model,
 *   startedAt, finishedAt (Date), status ('exito' | 'fallo'), summary,
 *   done[]      acciones ejecutadas con exito
 *   failed      { action, error } o null
 *   pending[]   acciones que no llegaron a ejecutarse
 *   plannerLog[] { trigger, status, reason } por cada consulta al planificador
 *   screenshotBase64  JPEG en Base64 (captura del fallo o del estado final)
 *   actionsFile ruta del JSON de acciones
 */

const fs = require('fs');
const path = require('path');

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Todo dato variable pasa por aqui antes de entrar en el HTML. */
function esc(value) {
  return String(value === undefined || value === null ? '' : value)
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\[[0-9;]*m/g, '') // codigos de color de terminal en errores de Playwright
    .replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

const pad = (n) => String(n).padStart(2, '0');

function formatDate(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function fileStamp(date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function formatDuration(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

const ACTION_LABELS = {
  goto: 'Navegar',
  click: 'Pulsar',
  fill: 'Escribir',
  select: 'Seleccionar',
  press: 'Tecla',
  scroll: 'Desplazar',
  wait: 'Esperar',
};

/** Descripcion legible de una accion: destino y dato principal. */
function describeAction(action) {
  if (!action || typeof action !== 'object') return { label: 'Acción no válida', target: '', detail: '' };
  const label = ACTION_LABELS[action.action] || String(action.action);
  let target = '';
  if (action.selector) target = action.selector;
  else if (action.id_visual !== undefined) target = `id_visual ${action.id_visual}`;
  if (action.frame) target = `${[].concat(action.frame).join(' » ')} » ${target}`;

  let detail = '';
  if (action.action === 'goto') {
    const url = String(action.url);
    detail = url.startsWith('data:') ? 'página de prueba interna' : url.length > 90 ? url.slice(0, 87) + '...' : url;
  }
  else if (action.action === 'fill' || action.action === 'select') detail = `"${action.value}"`;
  else if (action.action === 'press') detail = action.key;
  else if (action.action === 'scroll') detail = `${action.direction === 'up' ? 'arriba' : 'abajo'} ${action.amount || 500} px`;
  else if (action.action === 'wait') detail = `${action.ms || 1000} ms`;
  return { label, target, detail };
}

function stepRow(index, action, state, error) {
  const { label, target, detail } = describeAction(action);
  const badge = { ok: 'OK', fail: 'FALLO', skip: 'NO EJECUTADO' }[state];
  return `
      <tr class="step step-${state}">
        <td class="num">${pad(index)}</td>
        <td><span class="badge badge-${state}">${badge}</span></td>
        <td class="action">${esc(label)}</td>
        <td class="target">
          ${target ? `<code>${esc(target)}</code>` : '<span class="muted">—</span>'}
          ${detail ? `<span class="detail">${esc(detail)}</span>` : ''}
          ${error ? `<div class="error-line">${esc(error)}</div>` : ''}
        </td>
      </tr>`;
}

const TRIGGER_LABELS = { inicial: 'Plan inicial', fallo: 'Reparación tras fallo', continuar: 'Continuación' };
const PLAN_STATUS_LABELS = { continue: 'Continúa', done: 'Objetivo cumplido', blocked: 'Bloqueado', error: 'Error' };

const CSS = `
  :root { --bg:#050505; --panel:#0c0c0c; --line:#2a2a2a; --text:#f5f5f5; --muted:#8a8a8a; --err:#ff3366; --ok:#00ffcc; --warn:#ffcc00; }
  * { box-sizing: border-box; }
  html { background: var(--bg); }
  body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.55 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  code, .mono, .num, .badge, .kv dt, h2, .brand, .stamp { font-family: ui-monospace, "SF Mono", "Cascadia Mono", Consolas, "Liberation Mono", Menlo, monospace; }
  .wrap { max-width: 920px; margin: 0 auto; padding: 32px 16px 48px; }
  header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
  .brand { font-size: 13px; letter-spacing: .18em; color: var(--muted); }
  .brand b { color: var(--text); }
  .stamp { font-size: 12px; color: var(--muted); }
  .verdict { margin: 24px 0; padding: 20px; border: 1px solid var(--line); border-left: 4px solid var(--accent); background: var(--panel); }
  .verdict.ok { --accent: var(--ok); } .verdict.fail { --accent: var(--err); }
  .verdict h1 { margin: 0 0 6px; font-size: 26px; letter-spacing: .02em; color: var(--accent); }
  .verdict p { margin: 0; color: var(--text); overflow-wrap: anywhere; }
  .sim { margin: 0 0 24px; padding: 10px 14px; border: 1px dashed var(--warn); color: var(--warn); font-size: 13px; }
  .counts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); margin-bottom: 28px; }
  .counts div { background: var(--panel); padding: 14px 16px; }
  .counts b { display: block; font-size: 24px; font-variant-numeric: tabular-nums; }
  .counts span { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
  .c-ok b { color: var(--ok); } .c-fail b { color: var(--err); }
  h2 { margin: 32px 0 12px; font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
  .kv { margin: 0; border: 1px solid var(--line); background: var(--panel); }
  .kv div { display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--line); }
  .kv div:last-child { border-bottom: 0; }
  .kv dt { font-size: 12px; color: var(--muted); padding-top: 2px; }
  .kv dd { margin: 0; overflow-wrap: anywhere; }
  .kv a { color: var(--text); }
  .table-wrap { border: 1px solid var(--line); background: var(--panel); overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  .num { color: var(--muted); font-size: 12px; width: 1%; white-space: nowrap; padding-top: 13px; }
  .action { white-space: nowrap; font-weight: 600; }
  .target { overflow-wrap: anywhere; }
  code { font-size: 13px; color: var(--text); background: #161616; border: 1px solid var(--line); padding: 1px 6px; border-radius: 3px; overflow-wrap: anywhere; }
  .detail { margin-left: 8px; color: var(--muted); font-size: 13px; }
  .badge { display: inline-block; font-size: 11px; letter-spacing: .08em; padding: 2px 8px; border: 1px solid currentColor; border-radius: 2px; white-space: nowrap; }
  .badge-ok { color: var(--ok); } .badge-fail { color: var(--err); } .badge-skip { color: var(--muted); }
  .step-fail { background: rgba(255, 51, 102, .07); }
  .step-skip .action, .step-skip code { color: var(--muted); }
  .error-line { margin-top: 8px; color: var(--err); font-size: 13px; font-family: ui-monospace, Consolas, Menlo, monospace; }
  .muted { color: var(--muted); }
  .empty { padding: 16px; color: var(--muted); }
  figure { margin: 0; border: 1px solid var(--line); background: var(--panel); padding: 16px; text-align: center; }
  figure img { max-width: 100%; width: 390px; height: auto; border: 1px solid var(--line); display: block; margin: 0 auto; }
  figure.fail img { border-color: var(--err); }
  figcaption { margin-top: 12px; font-size: 13px; color: var(--muted); }
  footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 12px; color: var(--muted); }
  @media (max-width: 560px) {
    .kv div { grid-template-columns: 1fr; gap: 2px; }
    .verdict h1 { font-size: 22px; }
    .detail { display: block; margin: 4px 0 0; }
    table, tbody { display: block; }
    tr { display: flex; flex-wrap: wrap; align-items: center; border-bottom: 1px solid var(--line); }
    tr:last-child { border-bottom: 0; }
    td { border-bottom: 0; }
    .num { width: auto; padding-top: 10px; }
    .target { flex: 1 0 100%; padding-top: 0; }
  }
  @media print { .wrap { max-width: none; padding: 0; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

function buildHtml(run) {
  const ok = run.status === 'exito';
  const done = run.done || [];
  const pending = run.pending || [];
  const plannerLog = run.plannerLog || [];
  const startedAt = run.startedAt || new Date();
  const finishedAt = run.finishedAt || new Date();

  let n = 0;
  const rows = [
    ...done.map((a) => stepRow(++n, a, 'ok')),
    ...(run.failed ? [stepRow(++n, run.failed.action, 'fail', run.failed.error)] : []),
    ...pending.map((a) => stepRow(++n, a, 'skip')),
  ].join('');

  const modeText = run.mode === 'real'
    ? `Claude (${run.model})`
    : run.mode === 'simulado' ? 'Simulado (sin API)' : 'Sin planificador (guion fijo)';

  const plannerRows = plannerLog.map((entry, i) => `
      <tr>
        <td class="num">${pad(i + 1)}</td>
        <td class="action">${esc(TRIGGER_LABELS[entry.trigger] || entry.trigger)}</td>
        <td><span class="badge badge-${entry.status === 'blocked' || entry.status === 'error' ? 'fail' : entry.status === 'done' ? 'ok' : 'skip'}">${esc((PLAN_STATUS_LABELS[entry.status] || entry.status).toUpperCase())}</span></td>
        <td class="target">${esc(entry.reason)}</td>
      </tr>`).join('');

  const evidence = run.screenshotBase64 ? `
    <h2>${ok ? 'Estado final' : 'Evidencia del fallo'}</h2>
    <figure class="${ok ? 'ok' : 'fail'}">
      <img alt="${ok ? 'Captura de la página al terminar la prueba' : 'Captura de la página en el momento del fallo'}" src="data:image/jpeg;base64,${run.screenshotBase64}">
      <figcaption>${ok
        ? 'Pantalla al terminar la prueba.'
        : 'Pantalla en el momento del fallo. Los recuadros numerados son los elementos interactivos detectados.'}</figcaption>
    </figure>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TESTPILOT · ${ok ? 'Éxito' : 'Fallo'} · ${esc(run.url)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="brand"><b>TESTPILOT</b> / INFORME DE PRUEBA</div>
    <div class="stamp">${esc(formatDate(finishedAt))}</div>
  </header>

  <section class="verdict ${ok ? 'ok' : 'fail'}">
    <h1>${ok ? 'ÉXITO' : 'FALLO'}</h1>
    <p>${esc(run.summary || '')}</p>
  </section>

  ${run.mode === 'simulado' ? '<p class="sim">MODO SIMULADO — Las decisiones del planificador son respuestas de prueba, no un análisis real de la página. Este informe no es válido como resultado para un cliente.</p>' : ''}

  <div class="counts">
    <div class="c-ok"><b>${done.length}</b><span>Pasos correctos</span></div>
    <div class="c-fail"><b>${run.failed ? 1 : 0}</b><span>Pasos fallidos</span></div>
    <div><b>${pending.length}</b><span>Sin ejecutar</span></div>
  </div>

  <h2>Datos de la ejecución</h2>
  <dl class="kv">
    <div><dt>URL</dt><dd><a href="${esc(run.url)}">${esc(run.url)}</a></dd></div>
    <div><dt>Objetivo</dt><dd>${run.goal ? esc(run.goal) : '<span class="muted">No indicado (guion de acciones fijo)</span>'}</dd></div>
    <div><dt>Fecha y hora</dt><dd>${esc(formatDate(startedAt))}</dd></div>
    <div><dt>Duración</dt><dd>${esc(formatDuration(finishedAt - startedAt))}</dd></div>
    <div><dt>Dispositivo</dt><dd>${esc(run.device || '')}</dd></div>
    <div><dt>Planificador</dt><dd>${esc(modeText)}${plannerLog.length ? ` · ${plannerLog.length} consulta${plannerLog.length === 1 ? '' : 's'}` : ''}</dd></div>
    <div><dt>Archivo de pasos</dt><dd><code>${esc(run.actionsFile ? path.basename(run.actionsFile) : '—')}</code></dd></div>
  </dl>

  <h2>Pasos</h2>
  <div class="table-wrap">
    ${rows ? `<table>${rows}</table>` : '<div class="empty">No se llegó a ejecutar ningún paso.</div>'}
  </div>

  ${plannerRows ? `<h2>Registro del planificador</h2><div class="table-wrap"><table>${plannerRows}</table></div>` : ''}

  ${evidence}

  <footer>Generado por TESTPILOT el ${esc(formatDate(finishedAt))}. Archivo auto-contenido: puede enviarse por correo o abrirse sin conexión.</footer>
</div>
</body>
</html>
`;
}

/** Escribe el informe en outputDir y devuelve su ruta. */
function generateReport(run, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = fileStamp(run.finishedAt || new Date());
  const file = path.join(outputDir, `informe-${stamp}-${run.status === 'exito' ? 'exito' : 'fallo'}.html`);
  fs.writeFileSync(file, buildHtml(run), 'utf8');
  return file;
}

module.exports = { generateReport, buildHtml };
