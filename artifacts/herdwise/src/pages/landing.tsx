import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Box, Users, Stethoscope, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";

export function Landing() {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Herdwise" className="h-8 w-8" />
          <span className="font-bold text-lg text-foreground tracking-tight">Herdwise</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 gap-8 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 rounded-full px-4 py-1.5">
          <span>Digital livestock management</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
          Replace paper records with<br />
          <span className="text-primary">real-time herd data</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl">
          Herdwise helps cattle farm owners track every animal, manage investor relationships,
          and monitor health treatments — all in one place. Investors log in and see only their own cattle.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button size="lg" asChild>
            <Link href="/sign-up">
              Get Started Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mt-8">
          {[
            { icon: Box, label: "Cattle Management", desc: "Full CRUD — tag, breed, weight, status, photos" },
            { icon: Users, label: "Investor Portal", desc: "Each investor sees only their own animals" },
            { icon: Stethoscope, label: "Treatment Records", desc: "Vaccinations, dipping, deworming history" },
            { icon: BarChart3, label: "Reports", desc: "Weight gain trends and inventory reports" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-5 text-left space-y-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mt-4">
          {["Replaces paper records", "Role-based access", "Real-time data", "Secure investor logins"].map(f => (
            <span key={f} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {f}
            </span>
          ))}
        </div>
      </main>

      <footer className="text-center text-xs text-muted-foreground py-6 border-t border-border/50">
        © {new Date().getFullYear()} Herdwise · Livestock Investor Management Platform
      </footer>
    </div>
  );
}
