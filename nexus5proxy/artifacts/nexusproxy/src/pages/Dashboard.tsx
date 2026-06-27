import { Link } from "wouter";
import {
  useGetActiveSubscription, useGetMyProxies, useListPlans,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Server, Clock, ShieldAlert, ArrowRight, Globe, RotateCw,
  Chrome, Globe2, BookOpen, Smartphone, Code2,
} from "lucide-react";

const SETUP_GUIDES = [
  { name: "Chrome", icon: Chrome, color: "text-blue-400" },
  { name: "Firefox", icon: Globe2, color: "text-orange-400" },
  { name: "Mobile", icon: Smartphone, color: "text-green-400" },
  { name: "Curl / API", icon: Code2, color: "text-purple-400" },
  { name: "Browser Extension", icon: BookOpen, color: "text-pink-400" },
  { name: "Custom Setup", icon: Server, color: "text-primary" },
];

export function Dashboard() {
  const { data: activeSub, isLoading: isSubLoading } = useGetActiveSubscription();
  const { data: proxies } = useGetMyProxies();
  const { data: plans } = useListPlans();

  const featuredPlans = (plans ?? [])
    .filter((p) => p.isActive)
    .filter((p) => ["socks5-res-ip-1300", "rotating-isp-130", "unlimited-res-7d"].includes(p.id))
    .slice(0, 3);

  if (isSubLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  }

  const hasSubscription = !!activeSub?.subscription;
  const subscription = activeSub?.subscription;
  const plan = activeSub?.plan;
  const totalBandwidthMb = (subscription?.bandwidthGbTotal ?? 0) * 1024;
  const usedMb = subscription?.bandwidthUsedMb ?? 0;
  const bandwidthPercent = totalBandwidthMb > 0
    ? Math.max(0, 100 - (usedMb / totalBandwidthMb) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back. Here's an overview of your account.
        </p>
      </div>

      {/* Notification Banner */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/30">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">
                {hasSubscription ? `${proxies?.length ?? 0} proxies are ready to use` : "Ready to get started?"}
              </div>
              <div className="text-xs text-muted-foreground">
                {hasSubscription
                  ? "Browse, copy, or download your full proxy list."
                  : "Browse our marketplace and reserve proxies in seconds."}
              </div>
            </div>
          </div>
          <Link href={hasSubscription ? "/proxies/proxy-list" : "/proxies/proxy-list"}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              View My Proxy List
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Active Plan Card */}
      {hasSubscription ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                Active Plan
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-[10px]">ACTIVE</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-primary mb-1 truncate">{plan?.name}</div>
              <p className="text-xs text-muted-foreground">
                {plan?.proxyCount ? `${plan.proxyCount} proxies` : "Unlimited proxies"} · {plan?.durationDays} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                Time Remaining
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold mb-1">
                {Math.floor((activeSub.remainingHours ?? 0) / 24)}<span className="text-sm font-normal text-muted-foreground"> days</span>
              </div>
              <p className="text-xs text-muted-foreground">{(activeSub.remainingHours ?? 0) % 24} hours left</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                Bandwidth Remaining
                <Activity className="w-3.5 h-3.5 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold mb-2">
                {((activeSub.bandwidthRemainingMb ?? 0) / 1024).toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground"> GB</span>
              </div>
              <Progress value={bandwidthPercent} className="h-1.5" indicatorClassName="bg-primary" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="w-12 h-12 text-primary mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">No Active Subscription</h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Pick a plan from the marketplace, or browse individual proxies and add them to your cart.
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/plans"><Button>View Plans</Button></Link>
              <Link href="/proxies/proxy-list"><Button variant="outline">Browse Proxies</Button></Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing cards from real plans */}
      {featuredPlans.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Featured Products</h2>
            <Link href="/plans">
              <Button variant="link" size="sm" className="text-primary">View all plans <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredPlans.map((p) => {
              const Icon = p.proxyTypes?.includes("isp") ? RotateCw : p.proxyTypes?.includes("residential") ? Globe : Server;
              return (
                <Card key={p.id} className="bg-card hover:border-primary/40 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {p.proxyTypes?.[0] ?? "proxy"}
                      </div>
                    </div>
                    <div className="font-semibold mb-1">{p.name}</div>
                    <div className="text-xs text-muted-foreground mb-4">
                      {p.proxyCount ? `${p.proxyCount.toLocaleString()} IPs` : `${p.bandwidthGb} GB`} · {p.durationDays} days
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold text-primary">${(p.priceUsd / 100).toFixed(2)}</div>
                      <Link href={`/payment?planId=${p.id}`}>
                        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                          Buy
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Setup Guides Grid */}
      <div>
        <h2 className="text-lg font-bold mb-3">Setup Guides</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {SETUP_GUIDES.map((g) => {
            const Icon = g.icon;
            return (
              <Card key={g.name} className="hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <Icon className={`w-7 h-7 ${g.color}`} />
                  <div className="text-xs font-medium">{g.name}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
