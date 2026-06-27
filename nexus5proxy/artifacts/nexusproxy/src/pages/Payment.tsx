import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListPlans, useCreatePayment, useSubmitPaymentHash, useListMyPayments, getListMyPaymentsQueryKey } from "@workspace/api-client-react";
import { queryClient } from "../lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Copy, AlertCircle, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";

export function Payment() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const planId = searchParams.get("planId");
  const paymentId = searchParams.get("paymentId");
  const [currency, setCurrency] = useState("BTC");
  const [txHash, setTxHash] = useState("");
  
  const { toast } = useToast();
  const { data: plans, isLoading: isPlansLoading } = useListPlans();
  const { data: payments, isLoading: isPaymentsLoading } = useListMyPayments();
  
  const createPayment = useCreatePayment();
  const submitHash = useSubmitPaymentHash();

  // If paymentId is in the URL (cart purchase flow), match by that.
  // Otherwise fall back to planId-based matching for the legacy plan checkout.
  const activePayment = paymentId
    ? payments?.find(p => p.id === paymentId)
    : payments?.find(p => p.planId === planId && (p.status === "pending" || p.status === "confirmed"));

  // For plan-based checkout we pull the plan record. For cart purchases we
  // synthesize a "plan" from the payment for display purposes.
  const planFromList = plans?.find(p => p.id === planId);
  const plan = planFromList ?? (activePayment && activePayment.planId === "cart"
    ? { id: "cart", name: "Cart Purchase", priceUsd: activePayment.amountUsd, proxyCount: 0, bandwidthGb: 0, durationDays: 30 }
    : null);

  useEffect(() => {
    if (!planId && !paymentId && !isPlansLoading) {
      setLocation("/plans");
    }
  }, [planId, paymentId, isPlansLoading, setLocation]);

  if (isPlansLoading || isPaymentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return null; // Will redirect via useEffect
  }

  const handleCreatePayment = () => {
    createPayment.mutate(
      { data: { planId: plan.id, currency } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMyPaymentsQueryKey() });
          toast({ title: "Payment Request Created", description: "Please send the exact amount shown below." });
        },
        onError: (err) => {
          toast({ title: "Error", description: "Failed to create payment request.", variant: "destructive" });
        }
      }
    );
  };

  const handleSubmitHash = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayment || !txHash.trim()) return;

    submitHash.mutate(
      { id: activePayment.id, data: { txHash: txHash.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMyPaymentsQueryKey() });
          toast({ title: "Transaction Hash Submitted", description: "Your payment is being verified." });
          setTxHash("");
        },
        onError: (err) => {
          toast({ title: "Error", description: "Failed to submit transaction hash.", variant: "destructive" });
        }
      }
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", description: `${label} copied.` });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => setLocation("/plans")} className="px-2">
          <ArrowRight className="w-5 h-5 rotate-180" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
          <p className="text-muted-foreground">Complete your purchase for {plan.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {!activePayment ? (
            <Card>
              <CardHeader>
                <CardTitle>Select Payment Method</CardTitle>
                <CardDescription>We accept Bitcoin, USDT (TRC20), and USDC (ERC20).</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={currency} onValueChange={setCurrency} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Label
                    htmlFor="BTC"
                    className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all`}
                  >
                    <RadioGroupItem value="BTC" id="BTC" className="sr-only" />
                    <span className="font-bold text-lg mb-2">BTC</span>
                    <span className="text-xs text-muted-foreground">Bitcoin Network</span>
                  </Label>
                  <Label
                    htmlFor="USDT_TRC20"
                    className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all`}
                  >
                    <RadioGroupItem value="USDT_TRC20" id="USDT_TRC20" className="sr-only" />
                    <span className="font-bold text-lg mb-2">USDT</span>
                    <span className="text-xs text-muted-foreground">TRC20 Network</span>
                  </Label>
                  <Label
                    htmlFor="USDC_ERC20"
                    className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all`}
                  >
                    <RadioGroupItem value="USDC_ERC20" id="USDC_ERC20" className="sr-only" />
                    <span className="font-bold text-lg mb-2">USDC</span>
                    <span className="text-xs text-muted-foreground">ERC20 Network</span>
                  </Label>
                </RadioGroup>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-primary text-primary-foreground" 
                  size="lg" 
                  onClick={handleCreatePayment}
                  disabled={createPayment.isPending}
                >
                  {createPayment.isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Generate Payment Address"}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="border-primary/30 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Payment Details
                    {activePayment.status === "confirmed" && (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Confirmed</Badge>
                    )}
                    {activePayment.status === "pending" && (
                      <Badge variant="outline" className="border-primary/30 text-primary">Pending Verification</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Please send exactly the amount below to the specified address.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="font-medium text-destructive-foreground">
                      Send EXACTLY {activePayment.cryptoAmount} {activePayment.currency} to this address. Wrong amount or network = lost funds.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Amount to Send</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-3 bg-muted/50 rounded-lg text-lg font-bold border border-border">
                          {activePayment.cryptoAmount} {activePayment.currency}
                        </code>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(activePayment.cryptoAmount || "", "Amount")}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{activePayment.currency} Deposit Address</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-3 bg-muted/50 rounded-lg text-sm font-mono break-all border border-border">
                          {activePayment.walletAddress}
                        </code>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(activePayment.walletAddress || "", "Address")}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {activePayment.status === "pending" && !activePayment.txHash && (
                <Card>
                  <form onSubmit={handleSubmitHash}>
                    <CardHeader>
                      <CardTitle>Verify Payment</CardTitle>
                      <CardDescription>
                        After sending funds, paste the transaction hash (TxID) here to speed up verification.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label htmlFor="txHash">Transaction Hash</Label>
                        <Input 
                          id="txHash" 
                          placeholder="e.g. 0x123abc..." 
                          value={txHash}
                          onChange={(e) => setTxHash(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={submitHash.isPending || !txHash.trim()}
                      >
                        {submitHash.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Submit Transaction Hash
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              )}

              {activePayment.status === "pending" && activePayment.txHash && (
                <Alert className="border-primary/30 bg-primary/5">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  <AlertDescription className="ml-2 text-primary">
                    Verifying transaction. This usually takes 5-15 minutes depending on network congestion. You can leave this page.
                  </AlertDescription>
                </Alert>
              )}

              {activePayment.status === "confirmed" && (
                <Alert className="border-green-500/30 bg-green-500/5">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <AlertDescription className="ml-2 font-medium text-green-500">
                    Payment confirmed! Your subscription is now active.
                    <div className="mt-2">
                      <Button variant="outline" className="border-green-500/30 text-green-500 hover:bg-green-500/10" onClick={() => setLocation("/dashboard")}>
                        Go to Dashboard
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <div className="md:col-span-1">
          <Card className="bg-muted/20 border-border sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="font-medium">{plan.name} Plan</span>
                <span className="font-bold">${(plan.priceUsd / 100).toFixed(2)}</span>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Proxies</span>
                  <span className="text-foreground">{plan.proxyCount} IPs</span>
                </div>
                <div className="flex justify-between">
                  <span>Bandwidth</span>
                  <span className="text-foreground">{plan.bandwidthGb} GB</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration</span>
                  <span className="text-foreground">{plan.durationDays} Days</span>
                </div>
              </div>
              <div className="pt-4 flex justify-between items-center font-bold text-lg border-t border-border">
                <span>Total</span>
                <span className="text-primary">${(plan.priceUsd / 100).toFixed(2)} USD</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "outline" }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variant === "default" ? "bg-primary text-primary-foreground hover:bg-primary/80" : "border border-input hover:bg-accent hover:text-accent-foreground"} ${className}`}>
      {children}
    </span>
  );
}