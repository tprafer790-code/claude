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
 * Misma firma y mismo formato de respuesta que claude.js.
 */

const BROKEN_ID = '9999';

async function requestPlan({ done, failure }) {
  const scenario = String(process.env.MOCK_SCENARIO || 'success').toLowerCase();
  let plan;

  if (failure) {
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
