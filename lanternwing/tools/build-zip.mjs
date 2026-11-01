// Genera dist/lanternwing.zip con solo los archivos del juego (sin pruebas ni documentación),
// listo para subir al portal de desarrolladores de CrazyGames.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const GAME_FILES = ["index.html", "src/i18n.js", "src/sdk.js", "src/audio.js", "src/meta.js", "src/game.js"];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, "lanternwing", "src"), { recursive: true });
let bytes = 0;
for (const f of GAME_FILES) {
  fs.copyFileSync(path.join(ROOT, f), path.join(DIST, "lanternwing", f));
  bytes += fs.statSync(path.join(ROOT, f)).size;
}
console.log(`Copiados ${GAME_FILES.length} archivos (${(bytes / 1024).toFixed(1)} KB) en dist/lanternwing`);
try {
  execFileSync("zip", ["-r", "-q", "../lanternwing.zip", "."], { cwd: path.join(DIST, "lanternwing") });
  console.log("Creado dist/lanternwing.zip");
} catch (e) {
  console.log("No se encontró el comando zip: comprime manualmente el contenido de dist/lanternwing (index.html en la raíz del zip).");
}
