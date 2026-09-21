import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type SessionState = { loggedIn: boolean; name: string; email: string };
const EMPTY: SessionState = { loggedIn: false, name: '', email: '' };

export function useSession() {
  const [session, setSession] = useState<SessionState>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      setSession(user ? { loggedIn: true, name: String(user.user_metadata.full_name || user.email || 'ผู้ใช้งาน'), email: user.email || '' } : EMPTY);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, value) => {
      const user = value?.user;
      setSession(user ? { loggedIn: true, name: String(user.user_metadata.full_name || user.email || 'ผู้ใช้งาน'), email: user.email || '' } : EMPTY);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (!supabase) throw new Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase');
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  }, []);

  const logout = useCallback(async () => { if (supabase) await supabase.auth.signOut(); setSession(EMPTY); }, []);
  return { session, loading, login, register, logout };
}
