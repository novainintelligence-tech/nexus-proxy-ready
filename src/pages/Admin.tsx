import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Users, CreditCard, Server, Activity, Plus, RefreshCw, Trash2, Ban, CheckCircle2, Pencil, Settings as SettingsIcon, Zap, AlertTriangle } from "lucide-react";
import {
  useAdminGetStats,
  useAdminListUsers,
  useAdminBanUser,
  useAdminListPayments,
  useAdminConfirmPayment,
  useAdminListProxies,
  useAdminBulkAddProxies,
  useAdminDeleteProxy,
  useAdminUpdateProxy,
  useAdminListSubscriptions,
  useAdminUpdateSubscription,
  useAdminGetSettings,
  useAdminUpdateSettings,
  useAdminCreatePlan,
  useAdminUpdatePlan,
  useAdminDeletePlan,
  useAdminTriggerProxyIngest,
  useAdminTriggerProxyHealth,
  useAdminGetProxyPoolStats,
  useListPlans,
  getAdminListUsersQueryKey,
  getAdminListPaymentsQueryKey,
  getAdminListProxiesQueryKey,
  getAdminListSubscriptionsQueryKey,
  getAdminGetSettingsQueryKey,
  getListPlansQueryKey,
  getAdminGetStatsQueryKey
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { queryClient } from "../lib/queryClient";

export function Admin() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center border border-primary/30">
          <ShieldAlert className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-muted-foreground">Manage platform infrastructure and users.</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 bg-card border border-border h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs sm:text-sm">Payments</TabsTrigger>
          <TabsTrigger value="proxies" className="text-xs sm:text-sm">Proxies</TabsTrigger>
          <TabsTrigger value="pool" className="text-xs sm:text-sm">Pool</TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs sm:text-sm">Subs</TabsTrigger>
          <TabsTrigger value="plans" className="text-xs sm:text-sm">Plans</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="payments"><PaymentsTab /></TabsContent>
          <TabsContent value="proxies"><ProxiesTab /></TabsContent>
          <TabsContent value="pool"><PoolTab /></TabsContent>
          <TabsContent value="subscriptions"><SubscriptionsTab /></TabsContent>
          <TabsContent value="plans"><PlansTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function OverviewTab() {
  const { data: stats, isLoading } = useAdminGetStats();

  if (isLoading) return <div className="h-64 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          <CreditCard className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">${(stats.totalRevenueCents / 100).toFixed(2)}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          <Users className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{stats.totalUsers}</div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Subs</CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{stats.activeSubscriptions}</div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
          <CreditCard className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-500">{stats.pendingPayments}</div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Proxy Utilization</CardTitle>
          <Server className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{stats.assignedProxies} / {stats.totalProxies}</div>
          <p className="text-xs text-muted-foreground mt-1">Assigned vs Total Pool</p>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab() {
  const { data: users, isLoading } = useAdminListUsers();
  const banUser = useAdminBanUser();
  const { toast } = useToast();

  const handleToggleBan = (id: string, isBanned: boolean) => {
    banUser.mutate(
      { id, data: { isBanned } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
          toast({ title: isBanned ? "User Banned" : "User Unbanned" });
        }
      }
    );
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage user accounts and access.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map(user => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className="text-xs">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {user.isBanned ? (
                    <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">Banned</Badge>
                  ) : (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {user.role !== 'admin' && (
                    <Button 
                      variant={user.isBanned ? "outline" : "destructive"} 
                      size="sm"
                      onClick={() => handleToggleBan(user.id, !user.isBanned)}
                      disabled={banUser.isPending}
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      {user.isBanned ? "Unban" : "Ban"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PaymentsTab() {
  const { data: payments, isLoading } = useAdminListPayments();
  const confirmPayment = useAdminConfirmPayment();
  const { toast } = useToast();

  const handleConfirm = (id: string) => {
    if(!confirm("Manually confirm this payment? This provisions the user's subscription.")) return;
    
    confirmPayment.mutate(
      { id, data: { adminNote: "Manually confirmed via Admin Panel" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListPaymentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
          toast({ title: "Payment Confirmed", description: "Subscription provisioned successfully." });
        }
      }
    );
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments & Verification</CardTitle>
        <CardDescription>Review crypto payments and confirm pending transactions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>TxHash / Wallet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments?.map(payment => (
              <TableRow key={payment.id}>
                <TableCell className="text-sm font-medium">{payment.userEmail || payment.userId}</TableCell>
                <TableCell className="text-sm">{payment.planName || payment.planId}</TableCell>
                <TableCell>
                  <div className="font-medium text-primary">${(payment.amountUsd / 100).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{payment.currency}</div>
                </TableCell>
                <TableCell className="font-mono text-xs max-w-[200px] truncate text-muted-foreground">
                  {payment.txHash || "No TxHash provided"}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={payment.status === 'confirmed' ? 'default' : 'outline'}
                    className={
                      payment.status === 'confirmed' ? "bg-green-500/20 text-green-500 border-green-500/30" : 
                      payment.status === 'pending' ? "border-yellow-500/50 text-yellow-500" : ""
                    }
                  >
                    {payment.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {payment.status === 'pending' && (
                    <Button 
                      size="sm" 
                      className="bg-primary text-primary-foreground"
                      onClick={() => handleConfirm(payment.id)}
                      disabled={confirmPayment.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirm
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ProxiesTab() {
  const { data: proxies, isLoading } = useAdminListProxies();
  const bulkAdd = useAdminBulkAddProxies();
  const deleteProxy = useAdminDeleteProxy();
  const updateProxy = useAdminUpdateProxy();
  const { toast } = useToast();

  const [bulkText, setBulkText] = useState("");
  const [bulkType, setBulkType] = useState("residential");
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const openEdit = (p: any) => {
    setEditing(p);
    setEditForm({
      ip: p.ip, port: p.port, username: p.username, password: p.password,
      proxyType: p.proxyType, country: p.country ?? "", city: p.city ?? "",
      isp: p.isp ?? "", priceCents: p.priceCents ?? 150,
      status: p.status ?? "working", isActive: p.isActive,
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    updateProxy.mutate(
      { id: editing.id, data: editForm },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListProxiesQueryKey() });
          toast({ title: "Proxy updated" });
          setEditing(null);
        },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      },
    );
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!bulkText.trim()) return;

    bulkAdd.mutate(
      { data: { proxyList: bulkText, proxyType: bulkType } },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getAdminListProxiesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
          setBulkText("");
          toast({ 
            title: "Import Complete", 
            description: `Added: ${res.added}. Skipped/Failed: ${res.skipped}.`
          });
        }
      }
    );
  };

  const handleDelete = (id: string) => {
    if(!confirm("Delete this proxy?")) return;
    deleteProxy.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListProxiesQueryKey() });
        }
      }
    );
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Proxies</CardTitle>
          <CardDescription>Format: IP:PORT:USER:PASS (one per line)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="flex gap-4">
              <div className="w-48 space-y-2">
                <Label>Proxy Type</Label>
                <Select value={bulkType} onValueChange={setBulkType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="datacenter">Datacenter</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Proxy List</Label>
              <Textarea 
                className="font-mono text-xs h-32" 
                placeholder="192.168.1.1:8080:user:pass&#10;192.168.1.2:8080:user:pass"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={bulkAdd.isPending || !bulkText.trim()}>
              {bulkAdd.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Import Proxies
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proxy Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>IP:Port</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proxies?.slice(0, 100).map(proxy => (
                  <TableRow key={proxy.id}>
                    <TableCell className="font-mono text-sm">{proxy.ip}:{proxy.port}</TableCell>
                    <TableCell><Badge variant="outline">{proxy.proxyType}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{proxy.country || "Unknown"}</TableCell>
                    <TableCell>
                      {proxy.isAssigned ? (
                        <Badge className="bg-primary/20 text-primary border-primary/30">Assigned</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">Available</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(proxy)} className="hover:text-primary">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {!proxy.isAssigned && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(proxy.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-2 text-xs text-muted-foreground text-center border-t border-border">
            Showing up to 100 recent proxies.
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Proxy</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5"><Label className="text-xs">IP</Label><Input value={editForm.ip ?? ""} onChange={(e) => setEditForm({ ...editForm, ip: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Port</Label><Input type="number" value={editForm.port ?? ""} onChange={(e) => setEditForm({ ...editForm, port: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Username</Label><Input value={editForm.username ?? ""} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Password</Label><Input value={editForm.password ?? ""} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Type</Label>
              <Select value={editForm.proxyType ?? "residential"} onValueChange={(v) => setEditForm({ ...editForm, proxyType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="datacenter">Datacenter</SelectItem>
                  <SelectItem value="isp">ISP</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Status</Label>
              <Select value={editForm.status ?? "working"} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="working">Working</SelectItem>
                  <SelectItem value="degraded">Degraded</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Country</Label><Input value={editForm.country ?? ""} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">City</Label><Input value={editForm.city ?? ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">ISP</Label><Input value={editForm.isp ?? ""} onChange={(e) => setEditForm({ ...editForm, isp: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Price (cents)</Label><Input type="number" value={editForm.priceCents ?? 0} onChange={(e) => setEditForm({ ...editForm, priceCents: Number(e.target.value) })} /></div>
            <div className="col-span-2 flex items-center justify-between rounded border border-border p-3">
              <Label className="text-sm">Active</Label>
              <Switch checked={!!editForm.isActive} onCheckedChange={(v) => setEditForm({ ...editForm, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={updateProxy.isPending}>
              {updateProxy.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubscriptionsTab() {
  const { data: subs, isLoading } = useAdminListSubscriptions();
  const update = useAdminUpdateSubscription();
  const { toast } = useToast();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      status: s.status,
      bandwidthGbTotal: s.bandwidthGbTotal,
      bandwidthUsedMb: s.bandwidthUsedMb,
      expiresAt: s.expiresAt ? new Date(s.expiresAt).toISOString().slice(0, 16) : "",
    });
  };

  const save = () => {
    if (!editing) return;
    const payload: any = { ...form };
    if (payload.expiresAt) payload.expiresAt = new Date(payload.expiresAt).toISOString();
    update.mutate(
      { id: editing.id, data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListSubscriptionsQueryKey() });
          toast({ title: "Subscription updated" });
          setEditing(null);
        },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      },
    );
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Subscriptions</CardTitle>
        <CardDescription>Edit any active or expired subscription.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bandwidth</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(subs ?? []).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.userId}</TableCell>
                  <TableCell className="text-xs">{s.planId}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      s.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/30" :
                      s.status === "pending" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" :
                      "bg-muted text-muted-foreground"
                    }>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(s.bandwidthUsedMb / 1024).toFixed(1)} / {s.bandwidthGbTotal} GB
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!subs?.length && (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No subscriptions yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Subscription</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status ?? ""} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Bandwidth Total (GB)</Label>
                  <Input type="number" value={form.bandwidthGbTotal ?? 0} onChange={(e) => setForm({ ...form, bandwidthGbTotal: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Bandwidth Used (MB)</Label>
                  <Input type="number" value={form.bandwidthUsedMb ?? 0} onChange={(e) => setForm({ ...form, bandwidthUsedMb: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Expires At</Label>
                <Input type="datetime-local" value={form.expiresAt ?? ""} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={update.isPending}>
                {update.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function SettingsTab() {
  const { data: settings, isLoading } = useAdminGetSettings();
  const update = useAdminUpdateSettings();
  const { toast } = useToast();

  const toggle = (next: boolean) => {
    update.mutate(
      { data: { autoConfirmPayments: next } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminGetSettingsQueryKey() });
          toast({
            title: next ? "Auto-confirm enabled" : "Manual confirm enabled",
            description: next
              ? "New payments will be verified on-chain automatically."
              : "All payments require manual approval.",
          });
        },
      },
    );
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
  const auto = !!settings?.autoConfirmPayments;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><SettingsIcon className="w-5 h-5 text-primary" /> Payment Confirmation</CardTitle>
          <CardDescription>Choose how incoming crypto payments are processed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Auto-confirm payments</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                When a user submits a tx hash, NexusProxy queries the public chain explorer
                (BTC: blockstream.info, USDT-TRC20: trongrid, USDC: etherscan).
                Verified payments are confirmed instantly. Anything that fails verification stays
                pending and is flagged for your manual review.
              </p>
            </div>
            <Switch checked={auto} onCheckedChange={toggle} disabled={update.isPending} />
          </div>

          <div className={`rounded-lg border p-4 flex items-start gap-3 ${auto ? "border-primary/30 bg-primary/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
            {auto ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-medium text-primary mb-0.5">Auto-confirm is ON</div>
                  <p className="text-muted-foreground">
                    Failed verifications appear in <strong>Payments</strong> with a <em>"Needs admin review"</em> note.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-medium text-yellow-500 mb-0.5">Manual mode</div>
                  <p className="text-muted-foreground">
                    Every payment must be approved from the <strong>Payments</strong> tab.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlansTab() {
  const { data: plans, isLoading } = useListPlans();
  const createPlan = useAdminCreatePlan();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    planType: "standard",
    priceUsd: "50",
    bandwidthGb: "10",
    proxyCount: "100",
    durationDays: "30",
    proxyTypes: "residential",
    features: "HTTPS/SOCKS5,API Access"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPlan.mutate(
      {
        data: {
          id: formData.id,
          name: formData.name,
          description: formData.description,
          planType: formData.planType,
          priceUsd: parseInt(formData.priceUsd) * 100, // convert to cents
          bandwidthGb: parseInt(formData.bandwidthGb),
          proxyCount: parseInt(formData.proxyCount),
          durationDays: parseInt(formData.durationDays),
          proxyTypes: formData.proxyTypes.split(",").map(s => s.trim()),
          features: formData.features.split(",").map(s => s.trim())
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
          toast({ title: "Plan Created" });
        }
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Plan</CardTitle>
          <CardDescription>Add a new subscription tier to the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan ID (system name)</Label>
                <Input name="id" placeholder="e.g. premium-100" required value={formData.id} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input name="name" placeholder="e.g. Premium Proxies" required value={formData.name} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <Input name="priceUsd" type="number" required value={formData.priceUsd} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Plan Type Flag</Label>
                <Select value={formData.planType} onValueChange={(val) => setFormData(prev => ({...prev, planType: val}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proxy Count</Label>
                <Input name="proxyCount" type="number" required value={formData.proxyCount} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Bandwidth (GB)</Label>
                <Input name="bandwidthGb" type="number" required value={formData.bandwidthGb} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Duration (Days)</Label>
                <Input name="durationDays" type="number" required value={formData.durationDays} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Proxy Types (comma separated)</Label>
                <Input name="proxyTypes" placeholder="residential,datacenter" required value={formData.proxyTypes} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input name="description" value={formData.description} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Features (comma separated list for UI)</Label>
              <Textarea name="features" value={formData.features} onChange={handleChange} placeholder="HTTPS Access,City Targeting,Unlimited Threads" />
            </div>
            <Button type="submit" disabled={createPlan.isPending}>
              {createPlan.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Plan
            </Button>
          </form>
        </CardContent>
      </Card>

      <ActivePlansCard plans={plans ?? []} />
    </div>
  );
}

function PoolTab() {
  const { toast } = useToast();
  const { data: stats, isLoading, refetch } = useAdminGetProxyPoolStats({
    query: { refetchInterval: 30_000 } as any,
  });
  const triggerIngest = useAdminTriggerProxyIngest();
  const triggerHealth = useAdminTriggerProxyHealth();

  const handleIngest = () => {
    triggerIngest.mutate(undefined, {
      onSuccess: (r: any) => {
        toast({ title: "Ingest started", description: r?.note ?? "Running in background." });
        setTimeout(() => refetch(), 10_000);
      },
      onError: (e: any) =>
        toast({ title: "Ingest failed", description: e?.message ?? "Server error", variant: "destructive" }),
    });
  };

  const handleHealth = () => {
    triggerHealth.mutate(undefined, {
      onSuccess: (r: any) => {
        toast({
          title: "Health check finished",
          description: `Checked ${r?.checked ?? 0}, ${r?.ok ?? 0} responding.`,
        });
        refetch();
      },
      onError: (e: any) =>
        toast({ title: "Health check failed", description: e?.message ?? "Server error", variant: "destructive" }),
    });
  };

  const s: any = stats ?? {};
  const tile = (label: string, value: any, color = "text-foreground") => (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value ?? "—"}</div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Proxy Pool Operations</CardTitle>
          <CardDescription>
            Auto-fetch from public sources, enrich with geo+ISP data, score, and clean dead proxies.
            Background jobs run automatically (ingest every 15 min, health every 5 min).
            Ingestion is gated by the <strong>proxy_ingest_enabled</strong> setting.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleIngest} disabled={triggerIngest.isPending}>
            {triggerIngest.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Ingest Now
          </Button>
          <Button variant="outline" onClick={handleHealth} disabled={triggerHealth.isPending}>
            {triggerHealth.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
            Run Health Check
          </Button>
          <Button variant="ghost" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh Stats
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="h-32 flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {tile("Total Proxies", s.total)}
            {tile("Active", s.active, "text-green-500")}
            {tile("Working", s.working, "text-green-500")}
            {tile("Avg Score", s.avg_score, "text-primary")}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {tile("Premium (≥90)", s.premium, "text-yellow-400")}
            {tile("High (75-89)", s.high, "text-blue-400")}
            {tile("Usable (50-74)", s.usable, "text-muted-foreground")}
            {tile("Bad (<50)", s.bad, "text-destructive")}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {tile("Assigned", s.assigned)}
            {tile("Untested", s.untested, "text-muted-foreground")}
            {tile("Dead", s.dead, "text-destructive")}
          </div>
        </>
      )}
    </div>
  );
}

function ActivePlansCard({ plans }: { plans: any[] }) {
  const { toast } = useToast();
  const updatePlan = useAdminUpdatePlan();
  const deletePlan = useAdminDeletePlan();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});

  const openEdit = (plan: any) => {
    setEditing(plan);
    setForm({
      name: plan.name ?? "",
      description: plan.description ?? "",
      priceUsd: String((plan.priceUsd ?? 0) / 100),
      bandwidthGb: String(plan.bandwidthGb ?? 0),
      proxyCount: String(plan.proxyCount ?? 0),
      durationDays: String(plan.durationDays ?? 0),
      proxyTypes: (plan.proxyTypes ?? []).join(","),
      features: (plan.features ?? []).join(","),
      isActive: !!plan.isActive,
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    updatePlan.mutate(
      {
        id: editing.id,
        data: {
          name: form.name,
          description: form.description || null,
          priceUsd: Math.round(parseFloat(form.priceUsd || "0") * 100),
          bandwidthGb: parseInt(form.bandwidthGb || "0"),
          proxyCount: parseInt(form.proxyCount || "0"),
          durationDays: parseInt(form.durationDays || "0"),
          proxyTypes: String(form.proxyTypes).split(",").map((s: string) => s.trim()).filter(Boolean),
          features: String(form.features).split(",").map((s: string) => s.trim()).filter(Boolean),
          isActive: !!form.isActive,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
          toast({ title: "Plan Updated" });
          setEditing(null);
        },
        onError: (e: any) =>
          toast({ title: "Update failed", description: e?.message ?? "Server error", variant: "destructive" }),
      }
    );
  };

  const toggleActive = (plan: any) => {
    updatePlan.mutate(
      { id: plan.id, data: { isActive: !plan.isActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
          toast({ title: plan.isActive ? "Plan deactivated" : "Plan activated" });
        },
      }
    );
  };

  const remove = (plan: any) => {
    if (!confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    deletePlan.mutate(
      { id: plan.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
          toast({ title: "Plan deleted" });
        },
        onError: (e: any) =>
          toast({ title: "Delete failed", description: e?.message ?? "Server error", variant: "destructive" }),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Plans</CardTitle>
        <CardDescription>Edit pricing, capacity, and toggle plans on or off.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Proxies</TableHead>
              <TableHead>Bandwidth</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan: any) => (
              <TableRow key={plan.id}>
                <TableCell className="font-mono text-xs">{plan.id}</TableCell>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell>${(plan.priceUsd / 100).toFixed(2)}</TableCell>
                <TableCell>{plan.proxyCount}</TableCell>
                <TableCell>{plan.bandwidthGb} GB</TableCell>
                <TableCell>
                  <Badge variant={plan.isActive ? "default" : "secondary"} className={plan.isActive ? "bg-green-500/20 text-green-500" : ""}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(plan)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => toggleActive(plan)}
                      disabled={updatePlan.isPending}
                    >
                      {plan.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => remove(plan)}
                      disabled={deletePlan.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Plan: {editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Price (USD)</Label>
              <Input type="number" step="0.01" value={form.priceUsd ?? ""} onChange={(e) => setForm({ ...form, priceUsd: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Proxy Count</Label>
              <Input type="number" value={form.proxyCount ?? ""} onChange={(e) => setForm({ ...form, proxyCount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Bandwidth (GB)</Label>
              <Input type="number" value={form.bandwidthGb ?? ""} onChange={(e) => setForm({ ...form, bandwidthGb: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Duration (Days)</Label>
              <Input type="number" value={form.durationDays ?? ""} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Proxy Types (comma sep.)</Label>
              <Input value={form.proxyTypes ?? ""} onChange={(e) => setForm({ ...form, proxyTypes: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Features (comma sep.)</Label>
              <Textarea value={form.features ?? ""} onChange={(e) => setForm({ ...form, features: e.target.value })} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={!!form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label>Plan is active (visible to customers)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={updatePlan.isPending}>
              {updatePlan.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}