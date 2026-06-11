import { useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import { Clock, Copy, Check, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AccessPending() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [copied, setCopied] = useState(false);

  const userId = user?.id ?? "";
  const email = user?.primaryEmailAddress?.emailAddress;

  const copyId = async () => {
    if (!userId) return;
    await navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50/50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center py-12 px-8 text-center">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-5">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Access pending
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Your account {email ? <span className="font-medium text-foreground">({email})</span> : null} isn’t linked to
            this farm yet. Ask a farm administrator to grant you access, then refresh this page.
          </p>

          <div className="mt-6 w-full rounded-lg border bg-muted/40 p-4 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your account ID
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-background px-2 py-1.5 text-xs text-foreground">
                {userId || "—"}
              </code>
              <Button variant="outline" size="sm" onClick={copyId} disabled={!userId}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Share this ID with your administrator so they can link or grant you access.
            </p>
          </div>

          <Button
            variant="ghost"
            className="mt-6 text-muted-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
