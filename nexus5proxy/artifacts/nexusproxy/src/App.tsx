import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useSyncUser, useGetMe } from "@workspace/api-client-react";

import { Home } from "@/pages/Home";
import { Dashboard } from "@/pages/Dashboard";
import { Plans } from "@/pages/Plans";
import { Payment } from "@/pages/Payment";
import { Proxies } from "@/pages/Proxies";
import { Usage } from "@/pages/Usage";
import { Admin } from "@/pages/Admin";
import { ProxyList } from "@/pages/ProxyList";
import { ProxySettings } from "@/pages/ProxySettings";
import { Cart } from "@/pages/Cart";
import { Stats } from "@/pages/Stats";
import { Subscription } from "@/pages/Subscription";
import { Referral } from "@/pages/Referral";
import { Api } from "@/pages/Api";
import { Settings } from "@/pages/Settings";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

// normalize base path ("/nexusproxy/")
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// 🔥 helper to always prefix routes correctly
function withBase(path: string) {
  return `${basePath}${path}`;
}

// used for Clerk router
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8">
      <SignIn
        routing="path"
        path={withBase("/sign-in")}
        signUpUrl={withBase("/sign-up")}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8">
      <SignUp
        routing="path"
        path={withBase("/sign-up")}
        signInUrl={withBase("/sign-in")}
      />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function GlobalAuthSync() {
  const { isSignedIn } = useUser();
  const syncUser = useSyncUser();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (isSignedIn && !hasSynced.current) {
      hasSynced.current = true;
      syncUser.mutate();
    }
  }, [isSignedIn, syncUser]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <>
      <Show when="signed-in">
        <AppLayout>
          <Component />
        </AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to={withBase("/sign-in")} />
      </Show>
    </>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { data: user } = useGetMe();

  return (
    <>
      <Show when="signed-in">
        {user?.role === "admin" ? (
          <AppLayout>
            <Component />
          </AppLayout>
        ) : (
          <Redirect to={withBase("/dashboard")} />
        )}
      </Show>
      <Show when="signed-out">
        <Redirect to={withBase("/sign-in")} />
      </Show>
    </>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to={withBase("/dashboard")} />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <GlobalAuthSync />

          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />

            <Route path="/plans">
              <AppLayout>
                <Plans />
              </AppLayout>
            </Route>

            <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
            <Route path="/payment"><ProtectedRoute component={Payment} /></Route>
            <Route path="/proxies"><ProtectedRoute component={Proxies} /></Route>
            <Route path="/proxies/proxy-settings"><ProtectedRoute component={ProxySettings} /></Route>

            <Route path="/proxy-server">
              <ProtectedRoute component={() => <ProxyList initialType="datacenter" title="Proxy Server" subtitle="Datacenter proxies." />} />
            </Route>

            <Route path="/cart"><ProtectedRoute component={Cart} /></Route>
            <Route path="/stats"><ProtectedRoute component={Stats} /></Route>
            <Route path="/subscription"><ProtectedRoute component={Subscription} /></Route>
            <Route path="/referral"><ProtectedRoute component={Referral} /></Route>
            <Route path="/api"><ProtectedRoute component={Api} /></Route>
            <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
            <Route path="/usage"><ProtectedRoute component={Usage} /></Route>
            <Route path="/admin"><AdminRoute component={Admin} /></Route>

            <Route>
              <div className="flex h-screen items-center justify-center">
                <h1>404 - Not Found</h1>
              </div>
            </Route>
          </Switch>

          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
