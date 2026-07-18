import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import supabase from "../lib/supabaseClient";
import { buildAuthRedirectTo } from "../lib/authRedirect";
import type { SignUpResult } from "../types";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
    redirectTo?: string,
  ) => Promise<SignUpResult>;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) setUser(data.session?.user ?? null);
      } catch {
        console.error("Unable to restore the authentication session.");
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      metadata: Record<string, unknown> = {},
      redirectTo = "/dashboardView",
    ): Promise<SignUpResult> => {
      const emailRedirectTo =
        typeof window === "undefined"
          ? undefined
          : buildAuthRedirectTo(window.location.origin, redirectTo);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata, emailRedirectTo },
      });
      if (error) throw error;
      return data.session ? "confirmed" : "verify-email";
    },
    [],
  );

  const signInWithGoogle = useCallback(
    async (redirectTo = "/dashboardView") => {
      const redirectUrl = buildAuthRedirectTo(
        window.location.origin,
        redirectTo,
      );
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    },
    [],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signInWithGoogle, signOut }),
    [loading, signIn, signInWithGoogle, signOut, signUp, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
