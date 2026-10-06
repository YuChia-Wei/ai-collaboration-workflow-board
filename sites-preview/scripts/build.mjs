import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {build} from 'esbuild';
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
const client=await build({entryPoints:['web/app.mjs'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',minify:true});
const html=(await readFile('web/index.html','utf8')).replace('<!--APP-->',`<script>${client.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`);
await build({stdin:{contents:`import {handle,setPage} from './worker/service.mjs';setPage(${JSON.stringify(html)});export default {fetch:handle};`,resolveDir:process.cwd(),sourcefile:'site-entry.mjs'},outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
await cp('.openai/hosting.json','dist/.openai/hosting.json');await cp('drizzle','dist/drizzle',{recursive:true});
console.log('Worker + hosting manifest + schema-only migrations built');
