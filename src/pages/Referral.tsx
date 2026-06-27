import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users2, Copy, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Referral() {
  const { data: user } = useGetMe();
  const { toast } = useToast();
  const code = user?.id ? `NEXUS-${user.id.slice(-8).toUpperCase()}` : "—";
  const link = `${window.location.origin}/sign-up?ref=${code}`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied.` });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users2 className="w-6 h-6 text-primary" />
          Referral Program
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Earn 10% commission on every plan purchased by users you refer.</p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="w-4 h-4 text-primary" />
            Your referral details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Your Code</div>
            <div className="flex gap-2">
              <Input value={code} readOnly className="font-mono" />
              <Button variant="outline" onClick={() => copy(code, "Code")}><Copy className="w-4 h-4" /></Button>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Your Link</div>
            <div className="flex gap-2">
              <Input value={link} readOnly />
              <Button variant="outline" onClick={() => copy(link, "Link")}><Copy className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Referrals", value: 0 },
          { label: "Pending", value: "$0.00" },
          { label: "Paid Out", value: "$0.00" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{s.label}</div>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
