import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sliders, Save } from "lucide-react";
import { useState } from "react";
import { useGetMyProxies } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function ProxySettings() {
  const { data: proxies } = useGetMyProxies();
  const { toast } = useToast();
  const [authMethod, setAuthMethod] = useState("user-pass");
  const [protocol, setProtocol] = useState("socks5");
  const [stickySession, setStickySession] = useState(true);
  const [rotation, setRotation] = useState("10");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sliders className="w-6 h-6 text-primary" />
          Proxy Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure how your {proxies?.length ?? 0} active proxies behave.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Connection Settings</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Protocol</Label>
            <Select value={protocol} onValueChange={setProtocol}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="socks5">SOCKS5</SelectItem>
                <SelectItem value="http">HTTP</SelectItem>
                <SelectItem value="https">HTTPS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Auth Method</Label>
            <Select value={authMethod} onValueChange={setAuthMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user-pass">Username / Password</SelectItem>
                <SelectItem value="ip">IP Authorization</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Rotation Interval (minutes)</Label>
            <Input type="number" value={rotation} onChange={(e) => setRotation(e.target.value)} />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
            <div>
              <Label className="font-medium">Sticky Session</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Keep same IP per session</p>
            </div>
            <Switch checked={stickySession} onCheckedChange={setStickySession} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => toast({ title: "Settings saved", description: "Your proxy configuration has been updated." })}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
