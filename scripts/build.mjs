import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
await build({ entryPoints: ['client/briefing-pdf.mjs'], outfile: 'assets/briefing-pdf.js', bundle: true, format: 'esm', platform: 'browser', target: ['es2022'], minify: true, legalComments: 'eof' });
await build({ entryPoints: ['server/cloudflare-worker.mjs'], outfile: 'server/worker-deploy.js', bundle: true, format: 'esm', platform: 'browser', target: ['es2022'], minify: false });
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'config.js', 'favicon-neo-soul.svg', 'favicon.svg', 'assets']) await cp(path, 'dist/' + path, { recursive: true });
await cp('.nojekyll', 'dist/.nojekyll');
console.log('GitHub Pages e Worker preparados. Nenhum segredo incluído.');
