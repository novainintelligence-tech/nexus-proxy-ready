import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetMyCart, useRemoveFromCart, usePurchaseCart,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Trash2, Clock, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function timeRemaining(expiresAt: string | Date) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function Cart() {
  const { data: cart, isLoading } = useGetMyCart({ query: { refetchInterval: 5000 } as any });
  const remove = useRemoveFromCart();
  const purchase = usePurchaseCart();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currency, setCurrency] = useState<string>("USDT_TRC20");
  const [, setTick] = useState(0);

  // tick every second so the countdown updates
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const onRemove = async (id: string) => {
    await remove.mutateAsync({ id });
    await queryClient.invalidateQueries({ queryKey: ["/cart"] });
    await queryClient.invalidateQueries({ queryKey: ["/proxies"] });
  };

  const onPurchase = async () => {
    try {
      const res: any = await purchase.mutateAsync({ data: { currency } });
      await queryClient.invalidateQueries({ queryKey: ["/cart"] });
      await queryClient.invalidateQueries({ queryKey: ["/proxies"] });
      toast({ title: "Order created", description: "Complete the crypto payment to activate." });
      // route to payment page with the new payment id
      setLocation(`/payment?paymentId=${res.payment.id}`);
    } catch (e: any) {
      toast({
        title: "Purchase failed",
        description: e?.message ?? "Could not create order.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground">Loading cart...</div>;
  }

  const items = cart?.items ?? [];

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-primary" />
          My Cart
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reserved proxies are held for {cart?.reservationMinutes ?? 15} minutes.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground mb-4">Your cart is empty.</p>
            <Link href="/proxies/proxy-list">
              <Button>Browse Proxies</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">{items.length} Proxies Reserved</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Proxy</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Reservation</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.ip}:{item.port}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-[10px] bg-primary/5 text-primary border-primary/20">
                          {item.proxyType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.country ?? "—"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {timeRemaining(item.expiresAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ${((item.priceCents ?? 0) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onRemove(item.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Order Total</div>
                <div className="text-3xl font-bold text-primary">
                  ${((cart?.totalCents ?? 0) / 100).toFixed(2)}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                    <SelectItem value="USDT_TRC20">USDT (TRC20)</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={onPurchase}
                  disabled={purchase.isPending}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {purchase.isPending ? "Creating..." : "Checkout"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
