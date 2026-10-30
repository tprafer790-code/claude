// Zips the CrazyGames build (dist-crazygames/) with index.html at the root of
// the archive, ready to upload in the CrazyGames developer portal.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist-crazygames');
const outDir = join(root, 'release');
const { version } = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(join(root, 'package.json'), 'utf8')));
const zip = join(outDir, `the-social-ladder-crazygames-${version}.zip`);

if (!existsSync(join(dist, 'index.html'))) throw new Error('Run the CrazyGames build first: dist-crazygames/index.html is missing.');
mkdirSync(outDir, { recursive: true });
rmSync(zip, { force: true });
execFileSync('zip', ['-r', '-X', '-q', zip, '.'], { cwd: dist });

let files = 0;
let bytes = 0;
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else {
      files++;
      bytes += st.size;
    }
  }
};
walk(dist);
console.log(`${zip}\n${files} files, ${(bytes / 1048576).toFixed(2)} MB unpacked, ${(statSync(zip).size / 1048576).toFixed(2)} MB zipped`);
