'use strict';

/**
 * TESTPILOT - Fase 1, Paso 2: llamada a Claude.
 *
 * Claude recibe la captura marcada (Set-of-Mark), el diccionario de marcas y
 * el estado de la ejecucion, y devuelve EXCLUSIVAMENTE un objeto JSON con la
 * lista de acciones. La forma del JSON la impone la API (structured outputs),
 * de modo que nunca se ejecuta ni se interpreta texto libre del modelo.
 *
 * MODO MANUAL (ANTHROPIC_API_KEY=manual): no se carga el SDK ni se llama a la
 * API. La ejecucion se pausa, se muestra el prompt para pegarlo en la web de
 * Claude junto con la captura output/som.jpg, y la respuesta se lee del archivo
 * manual_input.json. El orquestador recibe la misma estructura que con la API.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const MANUAL_KEY = 'manual';
const MANUAL_INPUT_FILE = path.join(__dirname, 'manual_input.json');
const MANUAL_PROMPT_FILE = path.join(__dirname, 'output', 'manual_prompt.txt');
const MANUAL_IMAGE_FILE = path.join(__dirname, 'output', 'som.jpg');
const PLAN_STATUSES = ['continue', 'done', 'blocked'];

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

function isManualMode() {
  return String(process.env.ANTHROPIC_API_KEY || '').trim().toLowerCase() === MANUAL_KEY;
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

// ---------------------------------------------------------------------------
// MODO MANUAL
// ---------------------------------------------------------------------------

const COLOR = { alert: '\x1b[1;33;41m', yellow: '\x1b[1;33m', red: '\x1b[1;31m', reset: '\x1b[0m' };

// En la API la forma del JSON la impone el esquema. En la web hay que pedirla
// por escrito, asi que el prompt manual la describe con detalle.
const MANUAL_FORMAT = `FORMATO DE RESPUESTA (OBLIGATORIO):
Responde UNICAMENTE con un objeto JSON valido, sin texto antes ni despues y sin explicaciones. Estructura exacta:

{
  "status": "continue" | "done" | "blocked",
  "reason": "una frase en español",
  "actions": [
    { "action": "click", "id_visual": "3" },
    { "action": "fill", "id_visual": "5", "value": "texto" },
    { "action": "select", "selector": "select[name='pais']", "value": "es" },
    { "action": "press", "key": "Enter" },
    { "action": "scroll", "direction": "down", "amount": 500 },
    { "action": "wait", "ms": 1000 },
    { "action": "goto", "url": "https://..." }
  ]
}

Reglas del JSON:
- "action" solo puede ser: ${ACTION_NAMES.join(', ')}.
- "id_visual" es siempre una cadena con el numero de la marca ("3", no 3).
- Incluye en cada accion solo los campos que necesita.
- Los ejemplos de "actions" son ilustrativos: devuelve solo las acciones de tu plan.
- Con "done" o "blocked", "actions" es un array vacio: [].`;

function buildManualPrompt(args) {
  return [
    SYSTEM_PROMPT,
    '==================== DATOS DE ESTE TURNO ====================',
    'La imagen adjunta es la captura del viewport con las marcas numeradas.',
    buildUserText(args),
    MANUAL_FORMAT,
  ].join('\n\n');
}

/** Pausa hasta que se pulse ENTER. Falla si no hay terminal interactiva. */
function waitForEnter(message) {
  return new Promise((resolve, reject) => {
    if (typeof process.stdin.ref === 'function') process.stdin.ref();
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let answered = false;
    rl.on('close', () => {
      // Se suelta la entrada estandar: si no, el proceso de Node no termina
      // al acabar la prueba porque sigue esperando teclado.
      if (typeof process.stdin.unref === 'function') process.stdin.unref();
      if (!answered) reject(new Error('Modo manual: la entrada de la terminal se ha cerrado antes de pulsar ENTER.'));
    });
    rl.question(message, () => {
      answered = true;
      rl.close();
      resolve();
    });
  });
}

function fileMtime(file) {
  try { return fs.statSync(file).mtimeMs; } catch (_) { return null; }
}

/** Lee y valida manual_input.json. Lanza Error con un mensaje para el usuario. */
function readManualPlan(previousMtime) {
  const name = path.basename(MANUAL_INPUT_FILE);
  if (!fs.existsSync(MANUAL_INPUT_FILE)) {
    throw new Error(`No existe el archivo ${name} en ${__dirname}`);
  }
  if (previousMtime !== null && fileMtime(MANUAL_INPUT_FILE) === previousMtime) {
    throw new Error(`${name} no se ha modificado desde la consulta anterior: contiene la respuesta antigua. Pegue la nueva y guarde.`);
  }

  let text = fs.readFileSync(MANUAL_INPUT_FILE, 'utf8').replace(/^﻿/, '').trim();
  if (!text) throw new Error(`${name} esta vacio.`);
  // La web suele envolver el JSON en un bloque \`\`\`json ... \`\`\` o añadir una
  // frase: se toma solo lo que hay entre la primera llave/corchete y la ultima.
  const start = text.search(/[{[]/);
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start === -1 || end <= start) throw new Error(`${name} no contiene ningun objeto JSON.`);
  text = text.slice(start, end + 1);

  let plan;
  try {
    plan = JSON.parse(text);
  } catch (error) {
    throw new Error(`El JSON de ${name} no es valido (${error.message}).`);
  }

  // Si solo se ha pegado el array de acciones, se completa la envoltura.
  if (Array.isArray(plan)) plan = { status: 'continue', reason: '', actions: plan };
  if (!plan || typeof plan !== 'object') throw new Error(`${name} debe contener un objeto JSON.`);
  if (!Array.isArray(plan.actions)) throw new Error('Falta el array "actions".');
  if (!PLAN_STATUSES.includes(plan.status)) {
    throw new Error(`"status" debe ser uno de: ${PLAN_STATUSES.join(', ')}.`);
  }
  plan.actions.forEach((action, index) => {
    if (!action || typeof action !== 'object' || Array.isArray(action)) {
      throw new Error(`La accion ${index + 1} no es un objeto.`);
    }
    if (!ACTION_NAMES.includes(action.action)) {
      throw new Error(`La accion ${index + 1} tiene un tipo no permitido: "${action.action}".`);
    }
  });

  return { status: plan.status, reason: String(plan.reason || ''), actions: plan.actions };
}

async function requestPlanManual(args) {
  const prompt = buildManualPrompt(args);
  const inputName = path.basename(MANUAL_INPUT_FILE);

  // La captura de ESTE turno se deja siempre en output/som.jpg, para que la
  // imagen a subir sea la misma en la primera consulta y en las reparaciones.
  fs.mkdirSync(path.dirname(MANUAL_IMAGE_FILE), { recursive: true });
  fs.writeFileSync(MANUAL_IMAGE_FILE, Buffer.from(args.screenshotBase64 || '', 'base64'));
  fs.writeFileSync(MANUAL_PROMPT_FILE, prompt + '\n', 'utf8');
  const previousMtime = fileMtime(MANUAL_INPUT_FILE);

  console.log(`\n${COLOR.alert} [MODO MANUAL] Ejecución pausada. ${COLOR.reset}`);
  console.log(`${COLOR.yellow}Copie el texto entre las dos lineas y peguelo en la web de Claude:${COLOR.reset}`);
  console.log('──────────────────────── INICIO DEL PROMPT ────────────────────────');
  console.log(prompt);
  console.log('───────────────────────── FIN DEL PROMPT ──────────────────────────');
  console.log(`${COLOR.yellow}Pasos:${COLOR.reset}`);
  console.log(`  1. En la web de Claude, adjunte la imagen:  ${MANUAL_IMAGE_FILE}`);
  console.log(`  2. Pegue el prompt (tambien esta guardado en: ${MANUAL_PROMPT_FILE})`);
  console.log(`  3. Copie la respuesta JSON y guardela en:    ${MANUAL_INPUT_FILE}`);

  for (;;) {
    await waitForEnter(`${COLOR.yellow}Pulsa ENTER cuando hayas guardado el archivo ${inputName}${COLOR.reset} `);
    try {
      const plan = readManualPlan(previousMtime);
      console.log(`[manual] ${plan.status}: ${plan.reason}`);
      return plan;
    } catch (error) {
      console.error(`${COLOR.red}[MODO MANUAL] ${error.message}${COLOR.reset}`);
      console.error('Corrija el archivo y vuelva a intentarlo.');
    }
  }
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

let client = null;

async function requestPlanApi({ model, goal, url, marks, screenshotBase64, done, failure }) {
  // El SDK se carga aqui y no al principio: en modo manual no se llega a cargar.
  const Anthropic = require('@anthropic-ai/sdk');
  // El constructor sin argumentos lee ANTHROPIC_API_KEY del entorno (.env).
  if (!client) client = new Anthropic();

  let response;
  try {
    response = await client.messages.create({
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

/**
 * Pide el plan de acciones: a la API de Claude o, en modo manual, al usuario.
 * @returns {Promise<{status: string, reason: string, actions: object[]}>}
 * @throws Error con mensaje legible si la API falla o la respuesta no es utilizable.
 */
async function requestPlan(args) {
  return isManualMode() ? requestPlanManual(args) : requestPlanApi(args);
}

module.exports = { requestPlan, ACTION_NAMES };
