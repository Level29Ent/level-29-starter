import { readFile, writeFile, cp, rm, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'dist');
let source = await readFile(path.join(root, 'app.js'), 'utf8');
const bytes = Buffer.from(source);
const hash = createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
if (hash !== '1a63e65f8ab33399d9391a4d3c4a9dd5309c5cd4') throw new Error('Game source changed; review the integration before building.');

function replaceSection(start, end, replacement) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`Missing integration marker: ${start}`);
  source = source.slice(0, a) + replacement + source.slice(b);
}

replaceSection('async function mn(', 'function Do(', `async function mn(route, body = {}) {
  if (route === 'profile/open') return { profile: await openPlayerProfile() };
  if (route === 'profile/name') return { profile: await renamePlayer(body.name) };
  if (route.startsWith('profile/')) throw new Error('Purchases, equipment changes, upgrades and legacy recovery are not connected yet.');
  throw new Error('Player profiles use Supabase. The race server is not connected yet; online and bot races are unavailable.');
}
`);
replaceSection('async function No(', 'pr=No(!0);', `async function No() {
  try {
    const profile = await openPlayerProfile();
    Do(profile);
    J('name').value = profile.name;
    J('menu-error').textContent = '';
    J('profile-storage-note').textContent = 'Saved in Supabase. This guest account stays in this browser. Clearing browser data or using another device can lose access; account linking is not set up yet.';
    Ce('preview-save-note', false);
    J('debug').textContent = 'SUPABASE PROFILE READY';
    return true;
  } catch (error) {
    J('menu-error').textContent = 'Profile unavailable. ' + error.message;
    return false;
  }
}
`);
source = "import { openPlayerProfile, renamePlayer } from './profiles.js';\n" + source;
source += `
for (const id of ['show-recovery', 'recover-form', 'copy-recovery']) J(id).hidden = true;
J('profile-dialog').querySelector('h2 + p').textContent = 'Your racer is stored in Supabase. Guest access belongs to this browser; cross-device account recovery is not configured yet.';
J('save-profile-btn').textContent = 'Profile details';
J('browse-btn').disabled = true;
J('browse-btn').title = 'Race server is not connected yet';
J('name').addEventListener('change', async () => {
  try {
    const profile = await renamePlayer(J('name').value);
    Do(profile);
    J('name').value = profile.name;
    J('menu-error').textContent = '';
  } catch (error) { J('menu-error').textContent = error.message; }
});
`;

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of await readdir(root)) {
  if (entry === 'assets' || /\.(html|css|js|svg|png|webp)$/.test(entry))
    await cp(path.join(root, entry), path.join(out, entry), { recursive: true });
}
await writeFile(path.join(out, 'app.js'), source);
const check = path.join(out, 'syntax-check.mjs');
await writeFile(check, source);
try { execFileSync(process.execPath, ['--check', check], { stdio: 'inherit' }); }
finally { await rm(check, { force: true }); }
console.log('Profile integration built; browser sign-in and persistence still require testing.');
