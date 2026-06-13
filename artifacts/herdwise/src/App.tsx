import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";
import { UserRoleProvider, useUserRole } from "@/hooks/use-user-role";
import { Landing } from "@/pages/landing";
import { Overview } from "@/pages/overview";
import { CattleList } from "@/pages/cattle";
import { CattleDetail } from "@/pages/cattle-detail";
import { InvestorsList } from "@/pages/investors";
import { InvestorDetail } from "@/pages/investor-detail";
import { InvestorReport } from "@/pages/investor-report";
import { MyReport } from "@/pages/my-report";
import { SharedReport } from "@/pages/shared-report";
import { TreatmentsList } from "@/pages/treatments";
import { Reports } from "@/pages/reports";
import { Settings } from "@/pages/settings";
import NotFound from "@/pages/not-found";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#2d6a4f",
    colorForeground: "#1e2d26",
    colorMutedForeground: "#4d6659",
    colorDanger: "#c93030",
    colorBackground: "#ffffff",
    colorInput: "#dce8e2",
    colorInputForeground: "#1e2d26",
    colorNeutral: "#d0e0d8",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
};

const queryClient = new QueryClient();

function ClerkAuthBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(async () => {
      return await getToken();
    });

    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken]);

  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;

      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }

      prevUserIdRef.current = userId;
    });

    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl="/"
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl="/"
      />
    </div>
  );
}

function RoleBasedHomeRedirect() {
  const { isAdmin, isInvestor, isLoading } = useUserRole();

  if (isLoading) return null;

  if (isInvestor) {
    return <Redirect to="/my-report" />;
  }

  if (isAdmin) {
    return <Redirect to="/overview" />;
  }

  return <Redirect to="/overview" />;
}

function AdminOnlyRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading) return null;

  if (!isAdmin) {
    return <Redirect to="/my-report" />;
  }

  return <Component />;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <UserRoleProvider>
          <RoleBasedHomeRedirect />
        </UserRoleProvider>
      </Show>

      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedApp() {
  return (
    <>
      <Show when="signed-in">
        <UserRoleProvider>
          <TooltipProvider>
            <Layout>
              <Switch>
                <Route path="/overview">
                  <AdminOnlyRoute component={Overview} />
                </Route>

                <Route path="/cattle" component={CattleList} />
                <Route path="/cattle/:id" component={CattleDetail} />

                <Route path="/investors">
                  <AdminOnlyRoute component={InvestorsList} />
                </Route>

                <Route path="/investors/:id/report">
                  <AdminOnlyRoute component={InvestorReport} />
                </Route>

                <Route path="/investors/:id">
                  <AdminOnlyRoute component={InvestorDetail} />
                </Route>

                <Route path="/my-report" component={MyReport} />
                <Route path="/treatments" component={TreatmentsList} />

                <Route path="/reports">
                  <AdminOnlyRoute component={Reports} />
                </Route>

                <Route path="/settings">
                  <AdminOnlyRoute component={Settings} />
                </Route>

                <Route component={NotFound} />
              </Switch>
            </Layout>

            <Toaster />
          </TooltipProvider>
        </UserRoleProvider>
      </Show>

      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkAuthBridge />

      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />

        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/shared-report/:token" component={SharedReport} />
          <Route component={ProtectedApp} />
        </Switch>
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