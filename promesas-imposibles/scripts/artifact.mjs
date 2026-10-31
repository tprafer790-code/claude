// Genera una versión del juego en un único archivo HTML (CSS y JS en línea),
// lista para publicarse como artefacto de claude.ai. Requiere `npm run build` antes.
// Salida: dist-artifact/promesas-imposibles.html
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'dist', 'assets');
const files = readdirSync(assets);
const jsFile = files.find((f) => f.endsWith('.js'));
const cssFile = files.find((f) => f.endsWith('.css'));
if (!jsFile || !cssFile) throw new Error('Falta la compilación: ejecuta antes `npm run build`.');

// Evita que una cadena "</script" dentro del JS cierre la etiqueta en línea.
const js = readFileSync(join(assets, jsFile), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(assets, cssFile), 'utf8').replace(/<\/style/gi, '<\\/style');

// El publicador añade doctype, <head> y <body>; aquí solo va el contenido.
const html = `<title>Promesas Imposibles</title>
<meta name="description" content="Simulador político satírico en un escenario alternativo.">
<style>
html,body{margin:0;height:100%;background:#2a2230;color:#fff8ea;overflow:hidden;color-scheme:dark}
#boot{position:fixed;inset:0;display:grid;place-items:center;color:#fff8ea;font:600 20px system-ui,sans-serif}
</style>
<style>${css}</style>
<div id="boot">…</div>
<div id="app"></div>
<noscript>Este juego necesita JavaScript. / This game needs JavaScript.</noscript>
<script type="module">${js}</script>
`;

const outDir = join(root, 'dist-artifact');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'promesas-imposibles.html');
writeFileSync(out, html);
console.log(`${out} (${(html.length / 1024).toFixed(0)} KB)`);
