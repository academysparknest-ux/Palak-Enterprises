import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import type { UserRole } from '../lib/idcard/types';

type AuthStatus = 'INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'AUTH_ERROR';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    // A failure to load the role is NOT the same as "no role". We surface it
    // as null here and let the caller decide — the important thing is we
    // never throw out of this function and strand the caller in a loading state.
    console.error('[AUTH] role:load:error', error.message);
    return null;
  }

  return (data?.role as UserRole | undefined) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'INITIALIZING',
    user: null,
    session: null,
    role: null,
    error: null,
  });

  // Guards against a stale async resolve landing after a newer one has
  // already settled (e.g. two auth events firing in quick succession).
  const generationRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function resolveSession(session: Session | null) {
      const myGeneration = ++generationRef.current;
      console.log('[AUTH] resolve:start', { hasSession: !!session });

      try {
        if (!session?.user) {
          if (cancelled || generationRef.current !== myGeneration) return;
          setState({ status: 'UNAUTHENTICATED', user: null, session: null, role: null, error: null });
          console.log('[AUTH] resolve:complete', { status: 'UNAUTHENTICATED' });
          return;
        }

        const role = await loadRole(session.user.id);

        if (cancelled || generationRef.current !== myGeneration) return;

        setState({
          status: 'AUTHENTICATED',
          user: session.user,
          session,
          role,
          error: null,
        });
        console.log('[AUTH] resolve:complete', { status: 'AUTHENTICATED', role });
      } catch (err) {
        if (cancelled || generationRef.current !== myGeneration) return;
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setState({ status: 'AUTH_ERROR', user: null, session: null, role: null, error: message });
        console.error('[AUTH] resolve:error', message);
      }
    }

    // Initial restore
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setState({
            status: 'AUTH_ERROR',
            user: null,
            session: null,
            role: null,
            error: error.message,
          });
          return;
        }
        return resolveSession(data.session);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to restore session';
        setState({ status: 'AUTH_ERROR', user: null, session: null, role: null, error: message });
      });

    // Single listener for all subsequent auth events (login, logout, token refresh).
    // There is exactly one of these in the whole app.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH] event', event);
      resolveSession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }

  async function signInWithPassword(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ ...state, signInWithGoogle, signInWithPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
