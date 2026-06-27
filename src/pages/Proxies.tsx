import { useState } from "react";
import { useGetMyProxies } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Server, Search, Download, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Proxies() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: proxies, isLoading } = useGetMyProxies();
  const { toast } = useToast();

  const filteredProxies = proxies?.filter(p => 
    p.ip.includes(searchTerm) || 
    p.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.proxyType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  const copyAllFormat = () => {
    if (!filteredProxies) return;
    const text = filteredProxies.map(p => `${p.ip}:${p.port}:${p.username}:${p.password}`).join('\n');
    copyToClipboard(text, "All proxies (IP:PORT:USER:PASS)");
  };

  const downloadTxt = () => {
    if (!filteredProxies) return;
    const text = filteredProxies.map(p => `${p.ip}:${p.port}:${p.username}:${p.password}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexusproxy_list.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">My Proxies</h1>
        <Card className="animate-pulse h-96 bg-muted/20 border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Server className="w-8 h-8 text-primary" />
            My Proxies
          </h1>
          <p className="text-muted-foreground mt-1">Manage and export your assigned proxy IPs.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={copyAllFormat} disabled={!filteredProxies?.length}>
            <Copy className="w-4 h-4 mr-2" />
            Copy All
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={downloadTxt} disabled={!filteredProxies?.length}>
            <Download className="w-4 h-4 mr-2" />
            Export TXT
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Proxy List</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search IP or Country..."
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!proxies || proxies.length === 0 ? (
            <div className="text-center py-16">
              <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-1">No proxies found</h3>
              <p className="text-muted-foreground text-sm">You don't have any active proxies assigned to your account.</p>
            </div>
          ) : filteredProxies?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No proxies match your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[180px]">IP Address</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Auth</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProxies?.map((proxy) => (
                    <TableRow key={proxy.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {proxy.ip}
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => copyToClipboard(proxy.ip, "IP")}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{proxy.port}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
                          {proxy.proxyType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {proxy.country || "Mixed"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyToClipboard(proxy.username, "Username")}>
                            User
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyToClipboard(proxy.password, "Password")}>
                            Pass
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => copyToClipboard(`${proxy.ip}:${proxy.port}:${proxy.username}:${proxy.password}`, "Proxy string")}
                        >
                          Full String
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}