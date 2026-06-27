// Real auth shim — backed by Lovable Cloud (Supabase) instead of Clerk.
// Keeps the @clerk/react surface that the ported pages import.
import { useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type ShowProps = { when: "signed-in" | "signed-out"; children: ReactNode };

function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoaded(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return { session, loaded };
}

export function Show({ when, children }: ShowProps) {
  const { session, loaded } = useSession();
  if (!loaded) return null;
  const signedIn = !!session;
  return (when === "signed-in" && signedIn) || (when === "signed-out" && !signedIn)
    ? <>{children}</>
    : null;
}

export function useClerk() {
  return {
    signOut: async () => {
      await supabase.auth.signOut();
      window.location.href = "/auth";
    },
    addListener: (_cb: (e: any) => void) => () => {},
  };
}

export function useUser() {
  const { session, loaded } = useSession();
  const u: User | undefined = session?.user;
  return {
    isSignedIn: !!session,
    isLoaded: loaded,
    user: u
      ? { id: u.id, primaryEmailAddress: { emailAddress: u.email ?? "" } }
      : null,
  };
}

export const ClerkProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const SignIn = () => null;
export const SignUp = () => null;