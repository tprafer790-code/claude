// Genera dist/lanternwing-artifact.html: el juego en un único HTML (scripts en línea, sin SDK)
// para probarlo como artefacto de claude.ai. No es el paquete para CrazyGames (ver build-zip.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const style = html.match(/<style>[\s\S]*?<\/style>/)[0].replace("<style>", "<style>\n    :root { color-scheme: dark; }");
const body = html.match(/<body>([\s\S]*)<\/body>/)[1]
  .replace(/<script src="(src\/[^"]+)"><\/script>/g, (_, src) =>
    "<script>\n" + fs.readFileSync(path.join(ROOT, src), "utf8").replace(/<\/script/gi, "<\\/script") + "\n</script>");
const out = `<title>Lanternwing</title>\n${style}\n${body}`;
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "dist", "lanternwing-artifact.html"), out);
console.log(`dist/lanternwing-artifact.html (${(out.length / 1024).toFixed(1)} KB)`);
