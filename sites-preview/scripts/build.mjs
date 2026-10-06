import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
const html=await readFile('web/index.html','utf8'),source=await readFile('worker/service.mjs','utf8');
await writeFile('dist/server/index.js',`const page=${JSON.stringify(html)};\n${source}\nexport default {fetch:handle};\n`);
await cp('.openai/hosting.json','dist/.openai/hosting.json');await cp('drizzle','dist/drizzle',{recursive:true});
console.log('Worker + hosting manifest + schema-only migrations built');
