import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";
import { UserRoleProvider } from "@/hooks/use-user-role";
import { Landing } from "@/pages/landing";
import { Overview } from "@/pages/overview";
import { CattleList } from "@/pages/cattle";
import { CattleDetail } from "@/pages/cattle-detail";
import { InvestorsList } from "@/pages/investors";
import { InvestorDetail } from "@/pages/investor-detail";
import { TreatmentsList } from "@/pages/treatments";
import { Reports } from "@/pages/reports";
import { Settings } from "@/pages/settings";
import NotFound from "@/pages/not-found";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

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
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg border border-[#dce8e2]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#1e2d26] font-bold",
    headerSubtitle: "text-[#4d6659]",
    socialButtonsBlockButtonText: "text-[#1e2d26]",
    formFieldLabel: "text-[#1e2d26] font-medium",
    footerActionLink: "text-[#2d6a4f] hover:text-[#1e4d38] font-medium",
    footerActionText: "text-[#4d6659]",
    dividerText: "text-[#4d6659]",
    identityPreviewEditButton: "text-[#2d6a4f]",
    formFieldSuccessText: "text-[#2d6a4f]",
    alertText: "text-[#1e2d26]",
    logoBox: "mb-1",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border-[#d0e0d8] hover:bg-[#f0f7f4]",
    formButtonPrimary: "bg-[#2d6a4f] hover:bg-[#235a41] text-white",
    formFieldInput: "border-[#d0e0d8] bg-[#f5faf7] text-[#1e2d26]",
    footerAction: "bg-[#f5faf7]",
    dividerLine: "bg-[#d0e0d8]",
    alert: "border-[#d0e0d8]",
    otpCodeFieldInput: "border-[#d0e0d8]",
    formFieldRow: "",
    main: "",
  },
};

const queryClient = new QueryClient();

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
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
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/overview" />
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
                <Route path="/overview" component={Overview} />
                <Route path="/cattle" component={CattleList} />
                <Route path="/cattle/:id" component={CattleDetail} />
                <Route path="/investors" component={InvestorsList} />
                <Route path="/investors/:id" component={InvestorDetail} />
                <Route path="/treatments" component={TreatmentsList} />
                <Route path="/reports" component={Reports} />
                <Route path="/settings" component={Settings} />
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
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your Herdwise account",
          },
        },
        signUp: {
          start: {
            title: "Create account",
            subtitle: "Start managing your herd today",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
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
