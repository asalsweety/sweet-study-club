import {readFile,writeFile} from 'node:fs/promises';
const dir=new URL('./',import.meta.url);
let html=await readFile(new URL('presentation.template.html',dir),'utf8');
const font=await readFile(new URL('Vazirmatn.woff2',dir));
const art=await readFile(new URL('doodles.png',dir));
let license=await readFile(new URL('FONT-LICENSE.txt',dir),'utf8');
html=html.replace('__FONT__','data:font/woff2;base64,'+font.toString('base64')).replace('__DOODLES__','data:image/png;base64,'+art.toString('base64')).replace('__FONT_LICENSE__',license.replaceAll('--','—'));
await writeFile(new URL('../vector-databases-fa.html',dir),html);
console.log('Built self-contained Persian presentation:',Buffer.byteLength(html),'bytes');
