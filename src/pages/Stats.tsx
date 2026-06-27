import {
  useGetUsageStats, useGetActiveSubscription, useGetMyProxies,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Activity, Server, Database, Clock } from "lucide-react";

export function Stats() {
  const { data: stats, isLoading } = useGetUsageStats();
  const { data: activeSub } = useGetActiveSubscription();
  const { data: proxies } = useGetMyProxies();

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground">Loading stats...</div>;
  }

  const totalBandwidthMb = (activeSub?.subscription?.bandwidthGbTotal ?? 0) * 1024;
  const usedMb = activeSub?.subscription?.bandwidthUsedMb ?? 0;
  const usedPct = totalBandwidthMb > 0 ? Math.min(100, (usedMb / totalBandwidthMb) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Stats
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Usage and account activity overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Bandwidth Used</CardTitle>
            <Database className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((stats?.totalBandwidthUsedMb ?? 0) / 1024).toFixed(2)} GB</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Active Proxies</CardTitle>
            <Server className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeProxies ?? proxies?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Total Connections</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalConnections ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Last Activity</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium text-muted-foreground">
              {stats?.lastActivity ? new Date(stats.lastActivity).toLocaleString() : "No activity yet"}
            </div>
          </CardContent>
        </Card>
      </div>

      {totalBandwidthMb > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Plan Bandwidth</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Progress value={usedPct} className="h-3" indicatorClassName="bg-primary" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{(usedMb / 1024).toFixed(2)} GB used</span>
              <span>{(totalBandwidthMb / 1024).toFixed(0)} GB total</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
