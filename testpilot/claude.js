'use strict';

/**
 * TESTPILOT - Fase 1, Paso 2: llamada a Claude.
 *
 * Claude recibe la captura marcada (Set-of-Mark), el diccionario de marcas y
 * el estado de la ejecucion, y devuelve EXCLUSIVAMENTE un objeto JSON con la
 * lista de acciones. La forma del JSON la impone la API (structured outputs),
 * de modo que nunca se ejecuta ni se interpreta texto libre del modelo.
 */

const Anthropic = require('@anthropic-ai/sdk');

const ACTION_NAMES = ['goto', 'click', 'fill', 'select', 'press', 'scroll', 'wait'];

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'reason', 'actions'],
  properties: {
    status: { type: 'string', enum: ['continue', 'done', 'blocked'] },
    reason: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ACTION_NAMES },
          id_visual: { type: 'string' },
          selector: { type: 'string' },
          frame: { type: 'string' },
          value: { type: 'string' },
          key: { type: 'string' },
          url: { type: 'string' },
          direction: { type: 'string', enum: ['up', 'down'] },
          amount: { type: 'integer' },
          ms: { type: 'integer' },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `Eres el planificador de TESTPILOT, un motor de pruebas web automatizadas que controla un navegador movil (iPhone 13) mediante Playwright.

En cada turno recibes una captura del viewport actual. Sobre cada elemento interactivo visible hay un recuadro rojo con un numero amarillo sobre fondo negro: ese numero es su "id_visual". Recibes tambien un diccionario que describe cada id_visual (etiqueta, tipo y texto), el objetivo de la prueba, las acciones ya ejecutadas con exito y, si la hubo, la accion que ha fallado con su error.

Tu trabajo es devolver la lista de acciones que quedan por ejecutar desde el estado que muestra la captura hasta cumplir el objetivo. No repitas las acciones ya ejecutadas.

Acciones disponibles (no existe ninguna otra):
- click: pulsa un elemento. Requiere id_visual o selector.
- fill: escribe "value" en un campo. Requiere id_visual o selector.
- select: elige la opcion "value" de un desplegable. Requiere id_visual o selector.
- press: pulsa la tecla "key" (por ejemplo "Enter"). El destino es opcional.
- scroll: desplaza la pagina. "direction" es "up" o "down"; "amount" son pixeles (500 por defecto).
- wait: espera "ms" milisegundos (maximo 30000).
- goto: navega a "url".

Como referirte a los elementos:
- Para lo que se ve en la captura usa id_visual. Los numeros solo valen para esta captura: tras cada accion la pagina se vuelve a marcar y pueden cambiar. Por eso, para pasos posteriores al primero que dependan de elementos que aun no ves, usa "selector" (CSS) solo si puedes deducirlo con seguridad; si no, termina la lista en el ultimo paso del que estes seguro (por ejemplo un scroll o el click que abre la pantalla siguiente). Se te volvera a consultar con una captura nueva.
- El contenido de los iframes (pasarelas de pago como Stripe o Redsys) no lleva marcas. Para actuar dentro de uno indica "frame" con el selector CSS del iframe y "selector" con el del campo interior.
- Si un aviso de cookies o una ventana emergente tapa la pagina, cierralo primero.

Campo "status":
- "continue": devuelves acciones para seguir avanzando.
- "done": el objetivo ya esta cumplido en la captura; "actions" va vacio.
- "blocked": no se puede avanzar (captcha, bloqueo anti-bot, inicio de sesion sin credenciales, pagina de error); "actions" va vacio.
En "reason" explica en una frase, en español, lo que ves y por que eliges ese plan.`;

let client = null;
function getClient() {
  // El constructor sin argumentos lee ANTHROPIC_API_KEY del entorno (.env).
  if (!client) client = new Anthropic();
  return client;
}

function describeMarks(marks) {
  const lines = Object.entries(marks || {}).map(([id, m]) => {
    const kind = [m.tag, m.type && `type=${m.type}`, m.role && `role=${m.role}`].filter(Boolean).join(' ');
    return `${id}: <${kind}> "${m.text}"`;
  });
  return lines.length ? lines.join('\n') : '(ningun elemento interactivo visible)';
}

function buildUserText({ goal, url, marks, done, failure }) {
  const parts = [
    `OBJETIVO DE LA PRUEBA:\n${goal}`,
    `URL ACTUAL: ${url}`,
    `ELEMENTOS MARCADOS EN LA CAPTURA:\n${describeMarks(marks)}`,
    `ACCIONES YA EJECUTADAS CON EXITO:\n${JSON.stringify(done || [], null, 2)}`,
  ];
  if (failure) {
    parts.push(
      `ACCION QUE HA FALLADO:\n${JSON.stringify(failure.failedAction)}\nERROR: ${failure.error}`,
      `ACCIONES QUE QUEDABAN PENDIENTES (plan anterior, puede estar obsoleto):\n${JSON.stringify(failure.pending || [], null, 2)}`,
    );
  }
  parts.push('Devuelve las acciones que quedan por ejecutar a partir del estado de la captura.');
  return parts.join('\n\n');
}

/**
 * Pide a Claude el plan de acciones.
 * @returns {Promise<{status: string, reason: string, actions: object[]}>}
 * @throws Error con mensaje legible si la API falla o la respuesta no es utilizable.
 */
async function requestPlan({ model, goal, url, marks, screenshotBase64, done, failure }) {
  let response;
  try {
    response = await getClient().messages.create({
      model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: PLAN_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: screenshotBase64 } },
            { type: 'text', text: buildUserText({ goal, url, marks, done, failure }) },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error('Clave de API no valida o ausente. Revise ANTHROPIC_API_KEY en el archivo .env.');
    }
    if (error instanceof Anthropic.NotFoundError) {
      throw new Error(`El modelo "${model}" no existe o no esta disponible para su cuenta. Revise ANTHROPIC_MODEL en .env.`);
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error('Limite de peticiones de la API alcanzado. Espere unos minutos y repita.');
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new Error('No se pudo conectar con la API de Anthropic. Revise la conexion a internet.');
    }
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Error de la API de Anthropic (${error.status}): ${error.message}`);
    }
    throw error;
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude ha rechazado la peticion (stop_reason: refusal).');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('La respuesta de Claude se ha cortado por limite de tokens.');
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) throw new Error('La respuesta de Claude no contiene texto.');

  let plan;
  try {
    plan = JSON.parse(textBlock.text);
  } catch (_) {
    throw new Error('La respuesta de Claude no es JSON valido.');
  }
  if (!plan || !Array.isArray(plan.actions)) {
    throw new Error('La respuesta de Claude no contiene el array "actions".');
  }

  const usage = response.usage || {};
  console.log(`[claude] ${plan.status}: ${plan.reason} (tokens: ${usage.input_tokens} entrada / ${usage.output_tokens} salida)`);
  return plan;
}

module.exports = { requestPlan, ACTION_NAMES };
