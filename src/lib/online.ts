import type { User } from '@supabase/supabase-js';
import { getMembers, type FamilyMember } from '@/lib/store';
import { supabase } from '@/lib/supabase';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function ensureOnlineFamily(user: User): Promise<Array<Omit<FamilyMember, 'otp'>>> {
  if (!supabase) return [];
  const local = getMembers();
  const fallbackName = String(user.user_metadata.full_name || user.email || 'เจ้าของบัญชี');

  const householdResult = await supabase.from('households').select('id').eq('owner_user_id', user.id).maybeSingle();
  if (householdResult.error) throw householdResult.error;
  let householdId = householdResult.data?.id as string | undefined;
  if (!householdId) {
    const created = await supabase.from('households').insert({ name: `ครอบครัว ${fallbackName}`, owner_user_id: user.id }).select('id').single();
    if (created.error) throw created.error;
    householdId = created.data.id;
  }

  let profiles = await supabase.from('family_profiles').select('id, full_name, weight, height').eq('household_id', householdId).order('created_at');
  if (profiles.error) throw profiles.error;
  if (!profiles.data?.length) {
    const first = local[0];
    const payload: Record<string, unknown> = {
      household_id: householdId, user_id: user.id, role: 'owner',
      full_name: first?.full_name || fallbackName, weight: first?.weight ?? null, height: first?.height ?? null,
    };
    if (first?.id && isUuid(first.id)) payload.id = first.id;
    const created = await supabase.from('family_profiles').insert(payload).select('id, full_name, weight, height').single();
    if (created.error) throw created.error;
    profiles = { ...profiles, data: [created.data] };
  }
  return (profiles.data || []).map((profile) => ({
    id: String(profile.id), full_name: String(profile.full_name),
    weight: profile.weight === null ? null : Number(profile.weight),
    height: profile.height === null ? null : Number(profile.height),
  }));
}
