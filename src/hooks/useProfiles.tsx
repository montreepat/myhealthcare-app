import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import {
  getMembers,
  getActiveMemberId,
  setActiveMemberId,
  addMember as persistAddMember,
  updateMember,
  type FamilyMember,
  type Profile,
} from '@/lib/store';

type ProfilesContextValue = {
  members: FamilyMember[];
  activeId: string;
  activeMember: FamilyMember | undefined;
  switchProfile: (id: string) => void;
  addMember: (name: string) => void;
  updateActiveProfile: (profile: Profile) => void;
};

const ProfilesContext = createContext<ProfilesContextValue | null>(null);

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<FamilyMember[]>(() => getMembers());
  const [activeId, setActiveId] = useState<string>(() => getActiveMemberId());

  const switchProfile = useCallback((id: string) => {
    setActiveMemberId(id);
    setActiveId(id);
  }, []);

  const addMember = useCallback((name: string) => {
    const member = persistAddMember(name);
    setMembers(getMembers());
    setActiveMemberId(member.id);
    setActiveId(member.id);
  }, []);

  const updateActiveProfile = useCallback((profile: Profile) => {
    setMembers(updateMember(getActiveMemberId(), profile));
  }, []);

  const activeMember = members.find((m) => m.id === activeId);

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
