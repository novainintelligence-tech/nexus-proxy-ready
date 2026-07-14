import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  syncProxyScrape,
  listPublicProxies,
  getProxyStats,
  checkProxy,
  bulkCheckProxies,
  lookupIp,
  getMyIp,
} from "@/lib/tools.functions";
import { getMe } from "@/lib/api.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Wrench, Activity, Globe, Download, Search, Copy, CheckCircle2, XCircle,
} from "lucide-react";

function copy(text: string) {
  navigator.clipboard?.writeText(text);
}

export function Tools() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const isAdmin = me.data?.role === "admin";

  // ---- Stats ----
  const stats = useQuery({
    queryKey: ["tools", "stats"],
    queryFn: () => getProxyStats(),
  });

  // ---- Sync ----
  const syncFn = useServerFn(syncProxyScrape);
  const [syncProto, setSyncProto] = useState<"all" | "http" | "https" | "socks4" | "socks5">("all");
  const syncMut = useMutation({
    mutationFn: () => syncFn({ data: { protocol: syncProto, limit: 5000 } }),
    onSuccess: (r: any) => {
      toast({ title: "Sync complete", description: `Fetched ${r.fetched}, upserted ${r.inserted}` });
      qc.invalidateQueries({ queryKey: ["tools"] });
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  // ---- Public list ----
  const [listProto, setListProto] = useState<"all" | "http" | "https" | "socks4" | "socks5">("all");
  const [listCountry, setListCountry] = useState("");
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ["tools", "list", listProto, listCountry, page],
    queryFn: () => listPublicProxies({ data: { protocol: listProto, country: listCountry || undefined, page, limit: 50 } }),
  });

  // ---- Checker ----
  const checkFn = useServerFn(checkProxy);
  const [checkHost, setCheckHost] = useState("");
  const [checkPort, setCheckPort] = useState("");
  const checkMut = useMutation({
    mutationFn: () => checkFn({ data: { host: checkHost, port: Number(checkPort) } }),
  });

  // ---- Bulk checker ----
  const bulkFn = useServerFn(bulkCheckProxies);
  const [bulkText, setBulkText] = useState("");
  const bulkMut = useMutation({
    mutationFn: () =>
      bulkFn({
        data: {
          list: bulkText.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 50),
        },
      }),
  });

  // ---- IP lookup ----
  const lookupFn = useServerFn(lookupIp);
  const [lookupTarget, setLookupTarget] = useState("");
  const lookupMut = useMutation({ mutationFn: () => lookupFn({ data: { ip: lookupTarget } }) });

  // ---- My IP ----
  const myIp = useQuery({ queryKey: ["tools", "myip"], queryFn: () => getMyIp() });

  // ---- Format converter (client) ----
  const [convIn, setConvIn] = useState("");
  const [convFmt, setConvFmt] = useState<"json" | "csv" | "txt">("json");
  const parseProxies = (raw: string) =>
    raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = l.match(/^(?:(\w+):\/\/)?([^:\s]+):(\d{1,5})(?::(\S+):(\S+))?$/);
        if (!m) return null;
        return {
          protocol: m[1] || "http",
          ip: m[2],
          port: Number(m[3]),
          username: m[4] || "",
          password: m[5] || "",
        };
      })
      .filter(Boolean) as any[];
  const convOut = (() => {
    const items = parseProxies(convIn);
    if (!items.length) return "";
    if (convFmt === "json") return JSON.stringify(items, null, 2);
    if (convFmt === "csv")
      return ["protocol,ip,port,username,password", ...items.map((i) => `${i.protocol},${i.ip},${i.port},${i.username},${i.password}`)].join("\n");
    return items.map((i) => `${i.protocol}://${i.ip}:${i.port}${i.username ? `:${i.username}:${i.password}` : ""}`).join("\n");
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary" /> Proxy Tools
        </h1>
        <p className="text-sm text-muted-foreground">
          Sync from ProxyScrape, check reachability, lookup IPs, and manage the public catalog.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.data?.total ?? "—"} />
        <StatCard label="HTTP" value={stats.data?.byProtocol?.http ?? "—"} />
        <StatCard label="HTTPS" value={stats.data?.byProtocol?.https ?? "—"} />
        <StatCard label="SOCKS4" value={stats.data?.byProtocol?.socks4 ?? "—"} />
        <StatCard label="SOCKS5" value={stats.data?.byProtocol?.socks5 ?? "—"} />
      </div>

      <Tabs defaultValue="sync" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="sync">Sync</TabsTrigger>
          <TabsTrigger value="catalog">Public Catalog</TabsTrigger>
          <TabsTrigger value="checker">Proxy Checker</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Checker</TabsTrigger>
          <TabsTrigger value="ip">IP Lookup</TabsTrigger>
          <TabsTrigger value="convert">Format Converter</TabsTrigger>
        </TabsList>

        {/* Sync */}
        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Sync from ProxyScrape</CardTitle>
              <CardDescription>
                Pulls the latest list from the ProxyScrape free proxy list mirror (refreshed every 5 min) and upserts into the catalog.
                {!isAdmin && <span className="block text-warning mt-1">Admin only.</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 flex-wrap items-end">
                <div>
                  <Label>Protocol</Label>
                  <Select value={syncProto} onValueChange={(v: any) => setSyncProto(v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                      <SelectItem value="socks4">SOCKS4</SelectItem>
                      <SelectItem value="socks5">SOCKS5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  disabled={!isAdmin || syncMut.isPending}
                  onClick={() => syncMut.mutate()}
                >
                  {syncMut.isPending ? "Syncing…" : "Sync now"}
                </Button>
                {syncMut.data && (
                  <Badge variant="outline" className="text-primary">
                    {(syncMut.data as any).inserted} inserted / {(syncMut.data as any).fetched} fetched
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Source: <code>cdn.jsdelivr.net/gh/proxyscrape/free-proxy-list</code>. Free public proxies — use for testing, not production traffic.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Catalog */}
        <TabsContent value="catalog">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="w-4 h-4" /> Public catalog</CardTitle>
              <CardDescription>Browse synced ProxyScrape proxies. {list.data?.total ?? 0} rows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap items-end">
                <div>
                  <Label>Protocol</Label>
                  <Select value={listProto} onValueChange={(v: any) => { setListProto(v); setPage(1); }}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                      <SelectItem value="socks4">SOCKS4</SelectItem>
                      <SelectItem value="socks5">SOCKS5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={listCountry} onChange={(e) => { setListCountry(e.target.value); setPage(1); }} placeholder="United States" className="w-48" />
                </div>
                <Button variant="outline" size="sm" onClick={() => list.refetch()}><RefreshCw className="w-3.5 h-3.5" /></Button>
                {list.data?.rows?.length ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const txt = list.data!.rows.map((r) => `${r.protocol}://${r.ip}:${r.port}`).join("\n");
                      const b = new Blob([txt], { type: "text/plain" });
                      const u = URL.createObjectURL(b);
                      const a = document.createElement("a");
                      a.href = u; a.download = `proxies-${listProto}-p${page}.txt`; a.click();
                      URL.revokeObjectURL(u);
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Export
                  </Button>
                ) : null}
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proto</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>ISP</TableHead>
                      <TableHead>Speed</TableHead>
                      <TableHead>Last seen</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.data?.rows?.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell><Badge variant="outline">{r.protocol}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{r.ip}:{r.port}</TableCell>
                        <TableCell>{r.country} {r.countryCode ? <span className="text-muted-foreground text-xs">({r.countryCode})</span> : null}</TableCell>
                        <TableCell>{r.city}</TableCell>
                        <TableCell className="text-xs">{r.isp}</TableCell>
                        <TableCell>{r.speedMbps ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.lastSeenAt ? new Date(r.lastSeenAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => copy(`${r.protocol}://${r.ip}:${r.port}`)}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!list.data?.rows?.length && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No proxies. Run Sync first.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <span className="text-xs text-muted-foreground">Page {page}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!list.data || page * 50 >= (list.data.total ?? 0)}
                  onClick={() => setPage((p) => p + 1)}
                >Next</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checker */}
        <TabsContent value="checker">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="w-4 h-4" /> Proxy checker</CardTitle>
              <CardDescription>TCP reachability + latency test.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 items-end flex-wrap">
                <div><Label>Host / IP</Label><Input value={checkHost} onChange={(e) => setCheckHost(e.target.value)} placeholder="1.2.3.4" /></div>
                <div><Label>Port</Label><Input value={checkPort} onChange={(e) => setCheckPort(e.target.value)} placeholder="1080" className="w-28" /></div>
                <Button onClick={() => checkMut.mutate()} disabled={!checkHost || !checkPort || checkMut.isPending}>
                  {checkMut.isPending ? "Checking…" : "Check"}
                </Button>
              </div>
              {checkMut.data && (
                <div className="p-3 rounded-md border bg-card/40 text-sm flex items-center gap-3">
                  {(checkMut.data as any).ok ? (
                    <><CheckCircle2 className="w-4 h-4 text-green-500" /> Reachable — {(checkMut.data as any).latencyMs}ms</>
                  ) : (
                    <><XCircle className="w-4 h-4 text-red-500" /> {(checkMut.data as any).error || (checkMut.data as any).note || "Unreachable"}</>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk checker</CardTitle>
              <CardDescription>One <code>ip:port</code> per line. Up to 50 at a time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={8} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="1.2.3.4:1080&#10;5.6.7.8:8080" className="font-mono text-xs" />
              <Button onClick={() => bulkMut.mutate()} disabled={!bulkText || bulkMut.isPending}>
                {bulkMut.isPending ? "Checking…" : "Check all"}
              </Button>
              {bulkMut.data && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Address</TableHead><TableHead>Status</TableHead><TableHead>Latency</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(bulkMut.data as any).results.map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{r.host}:{r.port}</TableCell>
                          <TableCell>{r.ok ? <Badge className="bg-green-500/20 text-green-400">OK</Badge> : <Badge variant="destructive">Fail</Badge>}</TableCell>
                          <TableCell>{r.latencyMs ? `${r.latencyMs}ms` : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* IP lookup */}
        <TabsContent value="ip">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Search className="w-4 h-4" /> IP Lookup</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 items-end">
                  <div className="flex-1"><Label>IP / host</Label><Input value={lookupTarget} onChange={(e) => setLookupTarget(e.target.value)} placeholder="8.8.8.8" /></div>
                  <Button disabled={!lookupTarget || lookupMut.isPending} onClick={() => lookupMut.mutate()}>Lookup</Button>
                </div>
                {lookupMut.data && (
                  <pre className="text-xs bg-muted/30 p-3 rounded-md overflow-auto max-h-72">{JSON.stringify(lookupMut.data, null, 2)}</pre>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Your IP</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-mono">{myIp.data?.ip || "—"}</div>
                <div className="text-xs text-muted-foreground">Country: {myIp.data?.country || "—"}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Converter */}
        <TabsContent value="convert">
          <Card>
            <CardHeader>
              <CardTitle>Format converter</CardTitle>
              <CardDescription>Parse <code>ip:port</code>, <code>proto://ip:port</code>, or <code>ip:port:user:pass</code> and convert.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Input</Label>
                  <Textarea rows={12} value={convIn} onChange={(e) => setConvIn(e.target.value)} className="font-mono text-xs" placeholder="socks5://1.2.3.4:1080" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Output</Label>
                    <Select value={convFmt} onValueChange={(v: any) => setConvFmt(v)}>
                      <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="txt">TXT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea rows={12} value={convOut} readOnly className="font-mono text-xs" />
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => copy(convOut)}><Copy className="w-3.5 h-3.5 mr-1" /> Copy</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

export default Tools;