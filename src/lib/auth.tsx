import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';

export interface User { id: number; email: string; display_name: string; role: 'student' | 'editor' | 'admin'; preferences: Record<string, any> }

interface AuthCtx {
  user: User | null;
  ready: boolean;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
  bookmarks: Set<string>;
  toggleBookmark: (publicId: string) => Promise<boolean>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const refresh = useCallback(async () => {
    try {
      const r = await api.get<{ user: User | null }>('/api/auth/me');
      setUser(r.user);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (!user) return setBookmarks(new Set());
    api.get<{ ids: string[] }>('/api/me/bookmark-ids').then((r) => setBookmarks(new Set(r.ids))).catch(() => undefined);
  }, [user]);
  useEffect(() => {
    const t = user?.preferences?.theme;
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }, [user?.preferences?.theme]);
  const toggleBookmark = useCallback(
    async (pid: string) => {
      const on = !bookmarks.has(pid);
      if (on) await api.put(`/api/me/bookmarks/${pid}`, {});
      else await api.del(`/api/me/bookmarks/${pid}`);
      setBookmarks((b) => {
        const n = new Set(b);
        on ? n.add(pid) : n.delete(pid);
        return n;
      });
      return on;
    },
    [bookmarks],
  );
  return <Ctx.Provider value={{ user, ready, refresh, setUser, bookmarks, toggleBookmark }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside provider');
  return c;
}
