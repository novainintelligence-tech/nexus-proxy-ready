import { useGetUsageStats, useGetActiveSubscription } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, HardDrive, Wifi, Network, Clock } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

export function Usage() {
  const { data: stats, isLoading: isStatsLoading } = useGetUsageStats();
  const { data: activeSub, isLoading: isSubLoading } = useGetActiveSubscription();

  if (isStatsLoading || isSubLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Usage Statistics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse h-32 bg-muted/20" />
          ))}
        </div>
        <Card className="animate-pulse h-64 bg-muted/20 mt-8" />
      </div>
    );
  }

  const hasSubscription = !!activeSub?.subscription;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Activity className="w-8 h-8 text-primary" />
          Usage Statistics
        </h1>
        <p className="text-muted-foreground mt-1">Monitor your proxy network traffic and activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bandwidth</CardTitle>
            <HardDrive className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalBandwidthUsedMb ? (stats.totalBandwidthUsedMb / 1024).toFixed(2) : "0.00"} <span className="text-lg font-normal text-muted-foreground">GB</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime usage</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Proxies</CardTitle>
            <Network className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeProxies || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently in use</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Connections</CardTitle>
            <Wifi className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalConnections ? stats.totalConnections.toLocaleString() : 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime requests</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Activity</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {stats?.lastActivity ? formatDistanceToNow(parseISO(stats.lastActivity), { addSuffix: true }) : "Never"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Latest connection</p>
          </CardContent>
        </Card>
      </div>

      {hasSubscription && activeSub && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Current Plan Usage</CardTitle>
            <CardDescription>Bandwidth consumption for your active billing cycle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">Data Used</span>
                <span className="font-bold">
                  {(activeSub.subscription.bandwidthUsedMb / 1024).toFixed(2)} GB / {activeSub.subscription.bandwidthGbTotal} GB
                </span>
              </div>
              <Progress 
                value={(activeSub.subscription.bandwidthUsedMb / (activeSub.subscription.bandwidthGbTotal * 1024)) * 100} 
                className="h-3 bg-secondary/20" 
                indicatorClassName="bg-primary"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Plan Started</p>
                <p className="font-medium">{activeSub.subscription.startsAt ? new Date(activeSub.subscription.startsAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Plan Expires</p>
                <p className="font-medium text-primary">
                  {activeSub.subscription.expiresAt ? new Date(activeSub.subscription.expiresAt).toLocaleDateString() : 'N/A'}
                  {activeSub.remainingHours && ` (${Math.floor(activeSub.remainingHours / 24)} days left)`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}