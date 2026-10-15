import { readFile, writeFile, cp, rm, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'dist');
let source = await readFile(path.join(root, 'app.js'), 'utf8');
const bytes = Buffer.from(source);
if (createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex') !== '1a63e65f8ab33399d9391a4d3c4a9dd5309c5cd4') throw Error('Game source changed; review integration.');
function section(start,end,replacement) {
 const a=source.indexOf(start), b=source.indexOf(end,a+start.length);
 if(a<0 || b<0) throw Error('Missing integration marker: '+start);
 source=source.slice(0,a)+replacement+source.slice(b);
}
function once(from,to) {
 if(source.split(from).length!==2) throw Error('Integration marker changed: '+from);
 source=source.replace(from,to);
}
section('async function mn(', 'function Do(', `async function mn(route,body={},signal) {
 if(route==='profile/open') return {profile:await openPlayerProfile()};
 if(route==='profile/name') return {profile:await renamePlayer(body.name)};
 if(route.startsWith('profile/')) throw Error('Purchases, upgrades and legacy recovery are not connected.');
 if(!['enter','start','sync','leave','rematch'].includes(route)) throw Error('Unsupported race action');
 const headers={'Content-Type':'application/json'};
 if(route==='enter') headers.Authorization='Bearer '+await getRaceAccessToken();
 const response=await fetch('/api/race?route='+route,{method:'POST',headers,body:JSON.stringify(body),signal:signal||AbortSignal.timeout(12000)});
 if(!(response.headers.get('content-type')||'').includes('application/json')) throw Error('Race proxy did not return JSON. Check deployment logs.');
 const data=await response.json();
 if(!response.ok) throw Error(data.error||'Race request failed');
 return data;
}
`);
section('async function No(', 'pr=No(!0);', `async function No() {
 try {
  const profile=await openPlayerProfile(); Do(profile); J('name').value=profile.name;
  J('menu-error').textContent=''; Ce('preview-save-note',false);
  J('profile-storage-note').textContent='Supabase guest profile: keep this browser data. Cross-device recovery is not configured. Prototype races do not save rewards.';
  return true;
 } catch(error) {J('menu-error').textContent='Profile unavailable. '+error.message;return false;}
}
`);
section('function v0(', 'async function Po(', 'function v0(){fr=false;Q.transport="HTTP";}');
once('Io=setTimeout(()=>Po(i),90)', 'Io=setTimeout(()=>Po(i),250)');
once('fetch(`${rc}/api/rooms`,', 'fetch("/api/race?route=rooms",');
source=source.replaceAll('Your collected cash is already saved.','Prototype race ended. No race rewards were saved.');
source=source.replaceAll('SAVED PROFILES','PROFILE STORAGE').replaceAll('ONLINE','PROTOTYPE');
source="import {openPlayerProfile,renamePlayer,getRaceAccessToken} from './profiles.js';\n"+source;
source+=`
for(const id of ['show-recovery','recover-form','copy-recovery']) J(id).hidden=true;
J('profile-dialog').querySelector('h2 + p').textContent='Guest profiles use Supabase. Keep this browser data; cross-device recovery is not configured. Prototype races do not save cash or stats.';
J('save-profile-btn').textContent='Profile details';
const note=document.createElement('p'); note.className='micro';note.textContent='Race prototype: basic movement and gaps. No obstacle collisions, coin rewards or saved race stats. Rooms reset when the server restarts.';
J('start-btn').after(note);
J('name').addEventListener('change',async()=>{try{const p=await renamePlayer(J('name').value);Do(p);J('name').value=p.name;J('menu-error').textContent='';}catch(e){J('menu-error').textContent=e.message;}});
`;
await rm(out,{recursive:true,force:true}); await mkdir(out,{recursive:true});
for(const entry of await readdir(root)) if(entry==='assets'||/\.(html|css|js|svg|png|webp)$/.test(entry)) await cp(path.join(root,entry),path.join(out,entry),{recursive:true});
await writeFile(path.join(out,'app.js'),source);
const check=path.join(out,'syntax-check.mjs');await writeFile(check,source);
try{execFileSync(process.execPath,['--check',check],{stdio:'inherit'});}finally{await rm(check,{force:true});}
console.log('Built Supabase profiles and HTTP race client. Live gameplay remains unverified.');
