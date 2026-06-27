// Stub of @clerk/react used by ported pages. Auth is not wired up — `Show`
// always renders for the "signed-in" state so the app is browsable.
import type { ReactNode } from "react";

type ShowProps = { when: "signed-in" | "signed-out"; children: ReactNode };

export function Show({ when, children }: ShowProps) {
  return when === "signed-in" ? <>{children}</> : null;
}

export function useClerk() {
  return {
    signOut: async () => {
      window.location.href = "/";
    },
    addListener: (_cb: (e: any) => void) => () => {},
  };
}

export function useUser() {
  return {
    isSignedIn: true,
    isLoaded: true,
    user: { id: "demo-user", primaryEmailAddress: { emailAddress: "demo@nexusproxy.io" } },
  };
}

export const ClerkProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const SignIn = () => <div className="text-muted-foreground">Sign-in is not configured.</div>;
export const SignUp = () => <div className="text-muted-foreground">Sign-up is not configured.</div>;