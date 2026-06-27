import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Shield, LayoutDashboard, ServerCog, List, Settings as SettingsIcon, BarChart3,
  Server, Globe, RotateCw, CreditCard, Calendar, Users2, Code2, Sliders,
  LogOut, Menu, ChevronDown, ShieldAlert, ShoppingCart,
} from "lucide-react";
import { useClerk } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CartButton } from "@/components/cart/CartButton";

type Item = { href: string; label: string; icon: any };
type Group = { label?: string; items: Item[] };

const groups: Group[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Proxies",
    items: [
      { href: "/proxies/proxy-list", label: "Proxy List", icon: List },
      { href: "/proxies/proxy-settings", label: "Proxy Settings", icon: Sliders },
      { href: "/stats", label: "Stats", icon: BarChart3 },
    ],
  },
  {
    label: "Products",
    items: [
      { href: "/proxy-server", label: "Proxy Server", icon: Server },
      { href: "/static-residential", label: "Static Residential", icon: Globe },
      { href: "/rotating-residential", label: "Rotating Residential", icon: RotateCw },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/plans", label: "Plans", icon: CreditCard },
      { href: "/subscription", label: "Subscription", icon: Calendar },
      { href: "/referral", label: "Referral", icon: Users2 },
      { href: "/api", label: "API", icon: Code2 },
      { href: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { data: user } = useGetMe();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Proxies: true, Products: true, Account: true,
  });

  const allGroups: Group[] = [...groups];
  if (user?.role === "admin") {
    allGroups.push({ label: "Admin", items: [{ href: "/admin", label: "Admin Panel", icon: ShieldAlert }] });
  }

  const isActive = (href: string) =>
    location === href || (href !== "/dashboard" && location.startsWith(href));

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 flex-1 overflow-y-auto">
        <Link href="/dashboard" className="flex items-center gap-3 group mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30 group-hover:border-primary transition-colors">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-foreground">
              Nexus<span className="text-primary">Proxy</span>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Marketplace</div>
          </div>
        </Link>

        <nav className="space-y-1">
          {allGroups.map((group, gi) => (
            <div key={gi} className="mb-2">
              {group.label ? (
                <button
                  onClick={() => setOpenGroups((s) => ({ ...s, [group.label!]: !s[group.label!] }))}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider hover:text-foreground transition"
                >
                  {group.label}
                  <ChevronDown className={`w-3 h-3 transition-transform ${openGroups[group.label] ? "" : "-rotate-90"}`} />
                </button>
              ) : null}
              {(!group.label || openGroups[group.label]) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? "text-primary" : ""}`} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4 px-1">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col truncate flex-1 min-w-0">
            <span className="text-xs font-medium text-foreground truncate">
              {user?.email}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {user?.role || "user"}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="hidden md:flex w-60 border-r border-border bg-card/40 flex-shrink-0 flex-col">
        <NavContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-4 justify-between bg-card/40 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-background border-r border-border">
                <NavContent />
              </SheetContent>
            </Sheet>
            <Link href="/dashboard" className="md:hidden flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm">NexusProxy</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <CartButton />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="container max-w-7xl mx-auto p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
