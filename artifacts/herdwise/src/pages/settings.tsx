import { Card, CardContent } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export function Settings() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your farm profile and preferences.
        </p>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <SettingsIcon className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Settings Hub</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            Configuration options for notifications, user management, and API access
            will be available here in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
