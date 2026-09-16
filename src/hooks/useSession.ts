import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'myhealthcare_session';

export type SessionState = {
  loggedIn: boolean;
  name: string;
  lastActive: number;
};

const DEFAULT_SESSION: SessionState = {
  loggedIn: false,
  name: '',
  lastActive: 0,
};

const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;

function readSession(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SESSION;
    const parsed = JSON.parse(raw) as SessionState;
    if (Date.now() - parsed.lastActive > SESSION_TTL) {
      localStorage.removeItem(STORAGE_KEY);
      return DEFAULT_SESSION;
    }
    return parsed;
  } catch {
    return DEFAULT_SESSION;
  }
}

function writeSession(s: SessionState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore quota errors
  }
}

export function useSession() {
  const [session, setSession] = useState<SessionState>(DEFAULT_SESSION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readSession();
    if (stored.loggedIn) {
      const refreshed = { ...stored, lastActive: Date.now() };
      writeSession(refreshed);
      setSession(refreshed);
    }
    setLoading(false);
  }, []);

  const login = useCallback((name: string) => {
    const s: SessionState = { loggedIn: true, name, lastActive: Date.now() };
    writeSession(s);
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(DEFAULT_SESSION);
  }, []);

  return { session, loading, login, logout };
}
