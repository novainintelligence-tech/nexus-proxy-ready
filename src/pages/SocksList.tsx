import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSocks } from "@/lib/api.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Filter, Search, List } from "lucide-react";

type Filters = {
  authType?: string;
  proxyType?: string;
  country?: string;
  region?: string;
  city?: string;
  blacklist?: "yes" | "no";
  zipcode?: string;
  host?: string;
};

const ANY = "__any";

function secondsAgo(ts?: string | null) {
  if (!ts) return "Never";
  const s = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return `${s} sec`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}

export function SocksList() {
  const fetcher = useServerFn(listSocks);
  const [filters, setFilters] = useState<Filters>({});
  const [applied, setApplied] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["socks-list", applied, page],
    queryFn: () => fetcher({ data: { ...applied, page, pageSize } }),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const set = <K extends keyof Filters>(k: K, v: Filters[K] | undefined) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const search = () => {
    setPage(1);
    setApplied(filters);
  };
  const reset = () => {
    setFilters({});
    setApplied({});
    setPage(1);
  };

  return (
    <div className="space-y-4 p-1">
      {/* Filter card */}
      <Card className="border-border/60">
        <CardHeader className="bg-primary/10 py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filter Socks
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex flex-wrap gap-2 items-end">
          <Select value={filters.authType ?? ANY} onValueChange={(v) => set("authType", v === ANY ? undefined : v)}>
            <SelectTrigger className="w-32"><SelectValue placeholder="All Auth" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All Auth</SelectItem>
              <SelectItem value="userpass">User/Pass</SelectItem>
              <SelectItem value="ip">IP Auth</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.proxyType ?? ANY} onValueChange={(v) => set("proxyType", v === ANY ? undefined : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All Type</SelectItem>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="datacenter">Datacenter</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="w-48"
            placeholder={`All Country (${total})`}
            value={filters.country ?? ""}
            onChange={(e) => set("country", e.target.value || undefined)}
          />
          <Input
            className="w-40"
            placeholder="Region"
            value={filters.region ?? ""}
            onChange={(e) => set("region", e.target.value || undefined)}
          />
          <Input
            className="w-40"
            placeholder="City"
            value={filters.city ?? ""}
            onChange={(e) => set("city", e.target.value || undefined)}
          />
          <Select value={filters.blacklist ?? ANY} onValueChange={(v) => set("blacklist", v === ANY ? undefined : (v as any))}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Blacklist" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Blacklist</SelectItem>
              <SelectItem value="no">Clean</SelectItem>
              <SelectItem value="yes">Blacklisted</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={search}><Search className="w-4 h-4 mr-1" /> Search</Button>
          <Button variant="outline" onClick={reset}>Reset</Button>
        </CardContent>
      </Card>

      {/* Zipcode / Host search */}
      <Card className="border-border/60">
        <CardHeader className="bg-primary/10 py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="w-4 h-4" /> Search by Zipcode / Host
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex flex-wrap gap-2 items-center">
          <Input
            className="w-64"
            placeholder="Zipcode: 30721,2442"
            value={filters.zipcode ?? ""}
            onChange={(e) => set("zipcode", e.target.value || undefined)}
          />
          <Button onClick={search}>Search</Button>
          <Input
            className="w-64"
            placeholder="Host: verizon..."
            value={filters.host ?? ""}
            onChange={(e) => set("host", e.target.value || undefined)}
          />
          <Button onClick={search}>Search</Button>
        </CardContent>
      </Card>

      {/* Counter */}
      <div className="flex items-center justify-between px-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4" />
          Showing: <span className="text-foreground font-semibold">{rows.length}</span> of{" "}
          <span className="text-primary font-semibold">{total.toLocaleString()}</span> socks
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span>Page {page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                {["IP", "Country", "Region", "City", "Host", "Online", "Zipcode", "Last View", "Blacklist", "Speed", "Type"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">No proxies match these filters.</td></tr>
              ) : (
                rows.map((r) => {
                  const ipMasked = r.ip.split(".").map((o, i) => (i === 0 ? o : "*")).join(".");
                  return (
                    <tr key={r.id} className="border-t border-border/40 hover:bg-muted/40">
                      <td className="px-3 py-2 font-mono text-xs">{ipMasked}</td>
                      <td className="px-3 py-2">{r.country ?? "-"}</td>
                      <td className="px-3 py-2">{r.region ?? "-"}</td>
                      <td className="px-3 py-2">{r.city ?? "-"}</td>
                      <td className="px-3 py-2 truncate max-w-[200px]">{r.host ?? "-"}</td>
                      <td className="px-3 py-2">{secondsAgo(r.lastSeenAt)}</td>
                      <td className="px-3 py-2">{r.zipcode ?? "-"}</td>
                      <td className="px-3 py-2">{secondsAgo(r.lastViewAt)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={r.blacklist ? "destructive" : "secondary"}>
                          {r.blacklist ? "Yes" : "No"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{r.speedMbps ?? "-"}</td>
                      <td className="px-3 py-2 capitalize">{r.proxyType}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}