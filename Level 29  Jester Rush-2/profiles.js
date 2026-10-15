import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(
  'https://rubtdmmdxjvforydjjcn.supabase.co',
  'sb_publishable_ReLhNtOihv4AXPUXmqmw2g_FHiB_gmQ'
);

let opening;
const columns = 'id,name,cash,owned,equipped,upgrades,stats';

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Player sign-in is required.');
  return data.user;
}

export function openPlayerProfile() {
  if (!opening) opening = loadProfile().finally(() => { opening = undefined; });
  return opening;
}

async function loadProfile() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInAnonymously();
    if (signInError) throw new Error(`Guest sign-in failed: ${signInError.message}`);
  }
  const user = await currentUser();
  const { data: profile, error: profileError } = await supabase
    .from('player_profiles').select(columns).eq('id', user.id).single();
  if (profileError) throw profileError;
  return profile;
}

export async function renamePlayer(name) {
  if (typeof name !== 'string') throw new Error('Enter a player name.');
  name = name.trim();
  if (!name || Array.from(name).length > 24) throw new Error('Use 1 to 24 characters.');
  const user = await currentUser();
  const { data, error } = await supabase.from('player_profiles')
    .update({ name }).eq('id', user.id).select(columns).single();
  if (error) throw error;
  return data;
}

export async function getRaceAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Sign in before entering a race.');
  return data.session.access_token;
}
