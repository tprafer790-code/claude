'use strict';

/**
 * TESTPILOT - Planificador SIMULADO.
 *
 * Sustituye a claude.js cuando ANTHROPIC_API_KEY esta vacia. No llama a
 * ninguna API ni "entiende" la pagina: devuelve un guion fijo que sirve para
 * probar el circuito completo (plan -> fallo -> reparacion -> informe) sin coste.
 *
 * Guion:
 *   1. Plan inicial: un scroll valido y un click sobre un id_visual que no
 *      existe (fallo deliberado e inmediato).
 *   2. Ante el fallo:
 *        MOCK_SCENARIO=success (por defecto) -> lo "repara" con una accion valida.
 *        MOCK_SCENARIO=fail                  -> declara la prueba bloqueada.
 *   3. Con el plan agotado: declara el objetivo cumplido.
 *
 * MOCK_SCENARIO=stuck usa otro guion, para probar la verificacion de estado:
 *   1. Plan inicial: abre una pagina de prueba interna con un boton "Comprar"
 *      que no hace nada, y lo pulsa. El click no da error en Playwright, pero
 *      la verificacion detecta que la interfaz no cambia.
 *   2. Ante ese fallo, el planificador insiste con la misma accion.
 *   3. Al repetirse el fallo, el orquestador (init.js) aborta la prueba.
 *
 * Misma firma y mismo formato de respuesta que claude.js.
 */

const BROKEN_ID = '9999';

// Pagina de prueba auto-contenida: el boton existe y se puede pulsar, pero no
// tiene ningun comportamiento asociado.
const STUCK_PAGE = 'data:text/html;charset=utf-8,' + encodeURIComponent(
  '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1"><title>TESTPILOT - boton roto</title></head>' +
  '<body style="font-family:sans-serif;padding:24px"><h1>Carrito</h1><p>1 producto - 49,90 EUR</p>' +
  '<button id="comprar" style="font-size:18px;padding:12px 24px">Comprar</button></body></html>');

async function requestPlan({ done, failure }) {
  const scenario = String(process.env.MOCK_SCENARIO || 'success').toLowerCase();
  let plan;

  if (scenario === 'stuck') {
    if (failure) {
      plan = { status: 'continue', reason: 'Respuesta simulada: el botón sigue visible, se reintenta la misma acción.', actions: [failure.failedAction] };
    } else if (!done || done.length === 0) {
      plan = {
        status: 'continue',
        reason: 'Respuesta simulada: se abre una página de prueba con un botón que no responde y se pulsa.',
        actions: [{ action: 'goto', url: STUCK_PAGE }, { action: 'click', selector: '#comprar' }],
      };
    } else {
      plan = { status: 'done', reason: 'Respuesta simulada: se da el objetivo por cumplido.', actions: [] };
    }
  } else if (failure) {
    plan = scenario === 'fail'
      ? { status: 'blocked', reason: 'Respuesta simulada: no se encuentra alternativa al elemento que ha fallado.', actions: [] }
      : { status: 'continue', reason: 'Respuesta simulada: se sustituye la acción fallida por una válida.', actions: [{ action: 'scroll', direction: 'up', amount: 400 }] };
  } else if (!done || done.length === 0) {
    plan = {
      status: 'continue',
      reason: 'Respuesta simulada: plan inicial con un fallo deliberado para probar la reparación.',
      actions: [
        { action: 'scroll', direction: 'down', amount: 400 },
        { action: 'click', id_visual: BROKEN_ID },
      ],
    };
  } else {
    plan = { status: 'done', reason: 'Respuesta simulada: se da el objetivo por cumplido.', actions: [] };
  }

  console.log(`[mock]  ${plan.status}: ${plan.reason}`);
  return plan;
}

module.exports = { requestPlan };
