import { useMemo, useState } from "react";
import {
  useListAvailableProxies,
  useListProxyCountries,
  useAddToCart,
  useGetMyCart,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShoppingCart, RefreshCw, List, CheckCircle2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  initialType?: string;
  title?: string;
  subtitle?: string;
}

export function ProxyList({ initialType, title = "Proxy List", subtitle }: Props) {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string>("all");
  const [type, setType] = useState<string>(initialType ?? "all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = useMemo(() => {
    const p: Record<string, string | number> = { limit: 200 };
    if (search.trim()) p["search"] = search.trim();
    if (country !== "all") p["country"] = country;
    if (type !== "all") p["type"] = type;
    return p;
  }, [search, country, type]);

  const { data: proxies, isLoading, refetch, isFetching } = useListAvailableProxies(params, {
    query: { refetchInterval: 30_000 } as any,
  });
  const { data: countries } = useListProxyCountries();
  const { data: cart } = useGetMyCart();
  const addToCart = useAddToCart();

  const cartProxyIds = new Set(cart?.items?.map((i) => i.proxyId) ?? []);

  const handleAdd = async (proxyId: string) => {
    try {
      await addToCart.mutateAsync({ data: { proxyId } });
      await queryClient.invalidateQueries({ queryKey: ["/cart"] });
      await queryClient.invalidateQueries({ queryKey: ["/proxies"] });
      toast({ title: "Reserved", description: "Proxy added to cart for 15 minutes." });
    } catch (e: any) {
      const status = e?.response?.status ?? e?.status;
      const msg =
        status === 409 || status === 410
          ? "This proxy is no longer available."
          : "Failed to add to cart.";
      toast({ title: "Unavailable", description: msg, variant: "destructive" });
      await queryClient.invalidateQueries({ queryKey: ["/proxies"] });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <List className="w-6 h-6 text-primary" />
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {subtitle ?? "Browse available proxies and reserve them in your cart."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search IP or country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Proxy Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="datacenter">Datacenter</SelectItem>
                  <SelectItem value="isp">ISP</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries?.map((c) => (
                    <SelectItem key={c} value={c!}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading proxies...</div>
          ) : !proxies?.length ? (
            <div className="p-12 text-center text-muted-foreground">
              No matching proxies available. Try clearing your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Proxy Address</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>City / ISP</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right w-[120px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proxies.map((p) => {
                    const inCart = cartProxyIds.has(p.id);
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/20">
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-muted-foreground/60" />
                            <span className="blur-[3px] select-none">{p.ip}</span>:{p.port}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase text-[10px] tracking-wider bg-primary/5 text-primary border-primary/20">
                            {p.proxyType}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.country ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {[p.city, p.isp].filter(Boolean).join(" · ") || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{p.latencyMs ? `${p.latencyMs}ms` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "working" ? "default" : "destructive"} className={p.status === "working" ? "bg-green-500/10 text-green-500 border-green-500/30" : ""}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">${(p.priceCents / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {inCart ? (
                            <Button size="sm" variant="ghost" disabled className="h-8 text-xs text-green-500">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              In Cart
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                              onClick={() => handleAdd(p.id)}
                              disabled={addToCart.isPending}
                            >
                              <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                              Add
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
