import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export function Reports() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Analytics and exports for your farm operations.
        </p>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            We are working on powerful new reporting tools to help you track herd growth,
            treatment efficacy, and investor returns over time. Check back later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
