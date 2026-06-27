import { Link } from "wouter";
import {
  useListMySubscriptions, useGetActiveSubscription,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CreditCard } from "lucide-react";

export function Subscription() {
  const { data: subs, isLoading } = useListMySubscriptions();
  const { data: active } = useGetActiveSubscription();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Subscription
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your active and past subscriptions.</p>
        </div>
        <Link href="/plans">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <CreditCard className="w-4 h-4 mr-2" />
            Buy Plan
          </Button>
        </Link>
      </div>

      {active?.subscription && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader><CardTitle>Active Subscription</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-1">Plan</div>
              <div className="font-bold text-primary">{active.plan?.name}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-1">Proxies</div>
              <div className="font-bold">{active.proxies?.length}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-1">Bandwidth Left</div>
              <div className="font-bold">{((active.bandwidthRemainingMb ?? 0) / 1024).toFixed(2)} GB</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-1">Time Left</div>
              <div className="font-bold">{active.remainingHours ?? 0} hrs</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading...</div>
          ) : !subs?.length ? (
            <div className="p-12 text-center text-muted-foreground">No subscriptions yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {subs.map((s: any) => (
                <div key={s.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.planName ?? s.planId}</div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(s.createdAt).toLocaleDateString()}
                      {s.expiresAt && ` · Expires ${new Date(s.expiresAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      s.status === "active"
                        ? "bg-green-500/10 text-green-500 border-green-500/30"
                        : s.status === "pending"
                        ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
