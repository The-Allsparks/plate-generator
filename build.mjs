import{build}from'esbuild';import{copyFile,mkdir}from'node:fs/promises';
await mkdir('dist',{recursive:true});await build({entryPoints:['app.js','mesh-worker.js'],bundle:true,format:'esm',outdir:'dist',minify:true,external:['node:*']});await copyFile('node_modules/manifold-3d/manifold.wasm','dist/manifold.wasm');
