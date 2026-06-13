import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Box,
  Users,
  Stethoscope,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { useClerk, useUser } from "@clerk/react";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";

const adminNavItems = [
  { name: "Overview", href: "/overview", icon: LayoutDashboard },
  { name: "Cattle", href: "/cattle", icon: Box },
  { name: "Investors", href: "/investors", icon: Users },
  { name: "Treatments", href: "/treatments", icon: Stethoscope },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

const investorNavItems = [
  { name: "My Report", href: "/my-report", icon: LayoutDashboard },
  { name: "My Cattle", href: "/cattle", icon: Box },
  { name: "Treatments", href: "/treatments", icon: Stethoscope },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { isAdmin, isInvestor, investorName } = useUserRole();

  const navItems = isAdmin ? adminNavItems : investorNavItems;

  const displayName =
    investorName ||
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "User";

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-screen bg-gray-50/50 dark:bg-gray-900/50 overflow-hidden font-sans">
      <aside className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">
              H
            </div>

            <div>
              <h1 className="font-bold text-sidebar-foreground text-sm tracking-tight leading-none">
                HerdWise
              </h1>

              <p className="text-[10px] text-sidebar-foreground/70 uppercase tracking-wider mt-0.5">
                {isInvestor ? "Investor Portal" : "Farm Manager"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4",
                    isActive
                      ? "text-primary"
                      : "text-sidebar-foreground/50"
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground font-medium text-xs flex-shrink-0">
              {initials}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground leading-none mb-1 truncate">
                {displayName}
              </span>

              <span className="text-xs text-sidebar-foreground/60 leading-none">
                {isInvestor ? "Investor" : "Farm Administrator"}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6 lg:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}