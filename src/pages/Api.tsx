import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, Copy, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ENDPOINTS = [
  { method: "GET",    path: "/api/proxies",        desc: "Browse available proxies (filters: search, country, type)" },
  { method: "GET",    path: "/api/proxies/my",     desc: "Get my assigned proxies" },
  { method: "POST",   path: "/api/cart/add",       desc: "Reserve a proxy in cart" },
  { method: "GET",    path: "/api/cart",           desc: "Get my active cart" },
  { method: "DELETE", path: "/api/cart/{id}",      desc: "Release a cart reservation" },
  { method: "POST",   path: "/api/purchase",       desc: "Convert cart to a pending payment" },
  { method: "GET",    path: "/api/plans",          desc: "List all active plans" },
  { method: "GET",    path: "/api/subscriptions",  desc: "List my subscriptions" },
  { method: "GET",    path: "/api/usage/stats",    desc: "Usage statistics" },
];

export function Api() {
  const { data: user } = useGetMe();
  const { toast } = useToast();
  const apiKey = user?.id ? `npx_${user.id}` : "—";

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied.` });
  };

  const baseUrl = `${window.location.origin}/api`;
  const sample = `curl -H "Authorization: Bearer ${apiKey}" ${baseUrl}/proxies/my`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Code2 className="w-6 h-6 text-primary" />
          API
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Programmatic access to your proxies. Authenticate with your Clerk session token.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Your API Token</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <code className="block bg-muted/40 p-3 rounded font-mono text-xs break-all border border-border">
            {apiKey}
          </code>
          <Button variant="outline" size="sm" onClick={() => copy(apiKey, "Token")}>
            <Copy className="w-3 h-3 mr-1.5" />
            Copy Token
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Terminal className="w-4 h-4" />Sample Request</CardTitle></CardHeader>
        <CardContent>
          <code className="block bg-muted/40 p-3 rounded font-mono text-xs break-all border border-border">
            {sample}
          </code>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Endpoints</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {ENDPOINTS.map((e) => (
              <div key={e.method + e.path} className="p-4 flex items-center gap-3">
                <span className={`text-xs font-mono font-bold px-2 py-1 rounded w-16 text-center ${
                  e.method === "GET" ? "bg-green-500/10 text-green-500" :
                  e.method === "POST" ? "bg-primary/10 text-primary" :
                  "bg-red-500/10 text-red-500"
                }`}>
                  {e.method}
                </span>
                <code className="font-mono text-xs text-foreground">{e.path}</code>
                <span className="text-xs text-muted-foreground ml-auto">{e.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
