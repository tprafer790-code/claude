// Genera app/index.html (PWA instalable en iPhone) e iconos a partir de sinapsis.html.
const fs = require("fs"), path = require("path");
const dir = __dirname;
const body = fs.readFileSync(path.join(dir, "sinapsis.html"), "utf8");
const head = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Sinapsis">
<meta name="theme-color" content="#F2F2F7">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>
</head><body>`;
const sw = `<script>if("serviceWorker" in navigator&&!window.claude)navigator.serviceWorker.register("sw.js").catch(()=>{});</script>`;
fs.writeFileSync(path.join(dir, "index.html"), head + body + sw + "</body></html>");
console.log("index.html generado");
