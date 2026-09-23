import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  getMembers,
  getActiveMemberId,
  setActiveMemberId,
  addMember as persistAddMember,
  updateMember,
  replaceMembersFromOnline,
  syncProfileWithOnline,
  type FamilyMember,
  type Profile,
} from '@/lib/store';
import { ensureOnlineFamily } from '@/lib/online';
import { supabase } from '@/lib/supabase';

type ProfilesContextValue = {
  members: FamilyMember[];
  activeId: string;
  activeMember: FamilyMember | undefined;
  switchProfile: (id: string) => void;
  addMember: (name: string) => void;
  updateActiveProfile: (profile: Profile) => Promise<void>;
};

const ProfilesContext = createContext<ProfilesContextValue | null>(null);

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<FamilyMember[]>(() => getMembers());
  const [activeId, setActiveId] = useState<string>(() => getActiveMemberId());
  const [loadingOnline, setLoadingOnline] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoadingOnline(false); return; }
      try {
        const online = await ensureOnlineFamily(data.user);
        if (online.length) {
          const next = replaceMembersFromOnline(online);
          const id = getActiveMemberId();
          await syncProfileWithOnline(id);
          setMembers(next); setActiveId(id);
        }
      } finally { setLoadingOnline(false); }
    });
  }, []);

  const switchProfile = useCallback((id: string) => {
    setActiveMemberId(id);
    setActiveId(id);
    void syncProfileWithOnline(id);
  }, []);

  const addMember = useCallback((name: string) => {
    const member = persistAddMember(name);
    setMembers(getMembers());
    setActiveMemberId(member.id);
    setActiveId(member.id);
  }, []);

  const updateActiveProfile = useCallback(async (profile: Profile) => {
    const next = await updateMember(getActiveMemberId(), profile);
    setMembers(next);
  }, []);

  const activeMember = members.find((m) => m.id === activeId);

  if (loadingOnline) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" /></div>;

  return (
    <ProfilesContext.Provider
      value={{ members, activeId, activeMember, switchProfile, addMember, updateActiveProfile }}
    >
      {children}
    </ProfilesContext.Provider>
  );
}

export function useProfiles(): ProfilesContextValue {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error('useProfiles must be used within a ProfilesProvider');
  return ctx;
}
