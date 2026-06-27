import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@tanstack/react-router";

type Plan = {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  durationDays: number;
  proxyCount: number;
  bandwidthGb: number;
  features: string[];
  popular?: boolean;
};

const PLANS: Record<string, Plan[]> = {
  socks5: [
    { id: "socks5-starter", name: "Starter", description: "Single-region SOCKS5 for light scraping.", priceUsd: 1500, durationDays: 30, proxyCount: 5, bandwidthGb: 50, features: ["1 region", "HTTP/SOCKS5", "Email support"] },
    { id: "socks5-pro", name: "Pro", description: "Multi-region with sticky sessions.", priceUsd: 4900, durationDays: 30, proxyCount: 25, bandwidthGb: 250, features: ["10 regions", "Sticky sessions", "Priority support"], popular: true },
    { id: "socks5-business", name: "Business", description: "Scale across the full network.", priceUsd: 14900, durationDays: 30, proxyCount: 100, bandwidthGb: 1000, features: ["100+ regions", "Sub-users", "API access"] },
  ],
  isp: [
    { id: "isp-lite", name: "ISP Lite", description: "Rotating ISP IPs for stealth automation.", priceUsd: 2900, durationDays: 30, proxyCount: 10, bandwidthGb: 100, features: ["Rotating per request", "US + EU pools", "City targeting"] },
    { id: "isp-pro", name: "ISP Pro", description: "Higher concurrency, broader pool.", priceUsd: 8900, durationDays: 30, proxyCount: 50, bandwidthGb: 500, features: ["Global pools", "Sticky 30m", "Webhooks"], popular: true },
    { id: "isp-scale", name: "ISP Scale", description: "Enterprise rotating ISP fleet.", priceUsd: 19900, durationDays: 30, proxyCount: 200, bandwidthGb: 2000, features: ["Dedicated pool", "SLA", "Account manager"] },
  ],
  unlimited: [
    { id: "unlimited-30", name: "Unlimited 30d", description: "All-you-can-eat residential bandwidth.", priceUsd: 9900, durationDays: 30, proxyCount: 1, bandwidthGb: 9999, features: ["Unlimited GB", "Residential pool", "Single port gateway"] },
    { id: "unlimited-pro", name: "Unlimited Pro", description: "Higher concurrency cap.", priceUsd: 19900, durationDays: 30, proxyCount: 1, bandwidthGb: 9999, features: ["Unlimited GB", "500 concurrent", "Country selector"], popular: true },
    { id: "unlimited-max", name: "Unlimited Max", description: "Top-tier throughput.", priceUsd: 39900, durationDays: 30, proxyCount: 1, bandwidthGb: 9999, features: ["Unlimited GB", "Unlimited concurrent", "Premium routing"] },
  ],
};

export function Pricing() {
  const [tab, setTab] = useState<keyof typeof PLANS>("socks5");
  const visible = useMemo(() => PLANS[tab] ?? [], [tab]);

  return (
    <section id="pricing" className="py-24 px-4 bg-card/30 border-t border-border">
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
            <Tag className="w-3 h-3 mr-1.5" />
            Pay-as-you-go &middot; Crypto only
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">Simple, transparent pricing</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pick a category, pay in BTC, USDT or USDC, and your proxies appear in the dashboard the second the transaction confirms.
          </p>
        </motion.div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as keyof typeof PLANS)} className="flex flex-col items-center">
          <TabsList className="mb-10 bg-card/60 border border-border">
            <TabsTrigger value="socks5">SOCKS5 Proxies</TabsTrigger>
            <TabsTrigger value="isp">Rotating ISP</TabsTrigger>
            <TabsTrigger value="unlimited">Unlimited Bandwidth</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visible.map((plan) => {
            const popular = !!plan.popular;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Card
                  className={`h-full flex flex-col bg-card/60 border ${
                    popular ? "border-primary/60 shadow-[0_0_30px_rgba(0,240,255,0.15)]" : "border-border"
                  }`}
                >
                  <CardHeader className="pb-3">
                    {popular && (
                      <Badge className="mb-2 self-start bg-primary text-primary-foreground text-[10px] tracking-wider">
                        POPULAR
                      </Badge>
                    )}
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">{plan.description}</p>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight">${(plan.priceUsd / 100).toFixed(0)}</span>
                      <span className="text-sm text-muted-foreground">
                        / {plan.durationDays === 1 ? "day" : `${plan.durationDays}d`}
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        {plan.proxyCount} {plan.proxyCount === 1 ? "proxy" : "proxies"}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        {plan.bandwidthGb >= 9999 ? "Unlimited" : `${plan.bandwidthGb} GB`} bandwidth
                      </li>
                      {plan.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild
                      className={`w-full h-9 text-xs ${
                        popular
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-card border border-border hover:bg-primary/10 text-foreground"
                      }`}
                    >
                      <Link to="/auth">
                        Get Started
                        <ArrowRight className="w-3 h-3 ml-1.5" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}