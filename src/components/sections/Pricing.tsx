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
    { id: "socks5-1d-50", name: "1 Day Test — 50 SOCKS", description: "1-day trial pack", priceUsd: 100, durationDays: 1, proxyCount: 50, bandwidthGb: 10, features: ["Trial pack", "Instant delivery", "Email support"] },
    // 15-Day Plans
    { id: "socks5-15d-50", name: "15d — 50 SOCKS", description: "15-day access to 50 SOCKS", priceUsd: 500, durationDays: 15, proxyCount: 50, bandwidthGb: 50, features: ["15-day", "Global coverage"] },
    { id: "socks5-15d-100", name: "15d — 100 SOCKS", description: "15-day access to 100 SOCKS", priceUsd: 700, durationDays: 15, proxyCount: 100, bandwidthGb: 100, features: ["15-day", "Global coverage"] },
    { id: "socks5-15d-200", name: "15d — 200 SOCKS", description: "15-day access to 200 SOCKS", priceUsd: 1000, durationDays: 15, proxyCount: 200, bandwidthGb: 200, features: ["15-day", "Global coverage"] },
    { id: "socks5-15d-400", name: "15d — 400 SOCKS", description: "15-day access to 400 SOCKS", priceUsd: 1500, durationDays: 15, proxyCount: 400, bandwidthGb: 400, features: ["15-day", "Global coverage"] },
    { id: "socks5-15d-600", name: "15d — 600 SOCKS", description: "15-day access to 600 SOCKS", priceUsd: 2000, durationDays: 15, proxyCount: 600, bandwidthGb: 600, features: ["15-day", "Global coverage"] },
    { id: "socks5-15d-900", name: "15d — 900 SOCKS", description: "15-day access to 900 SOCKS", priceUsd: 2900, durationDays: 15, proxyCount: 900, bandwidthGb: 900, features: ["15-day", "Global coverage"] },
    // 30-Day Plans
    { id: "socks5-30d-50", name: "30d — 50 SOCKS", description: "30-day access to 50 SOCKS", priceUsd: 800, durationDays: 30, proxyCount: 50, bandwidthGb: 50, features: ["30-day", "Global coverage"] },
    { id: "socks5-30d-100", name: "30d — 100 SOCKS", description: "30-day access to 100 SOCKS", priceUsd: 1300, durationDays: 30, proxyCount: 100, bandwidthGb: 100, features: ["30-day", "Global coverage"] },
    { id: "socks5-30d-200", name: "30d — 200 SOCKS", description: "30-day access to 200 SOCKS", priceUsd: 1800, durationDays: 30, proxyCount: 200, bandwidthGb: 200, features: ["30-day", "Global coverage"] },
    { id: "socks5-30d-400", name: "30d — 400 SOCKS", description: "30-day access to 400 SOCKS", priceUsd: 2800, durationDays: 30, proxyCount: 400, bandwidthGb: 400, features: ["30-day", "Global coverage"] },
    { id: "socks5-30d-600", name: "30d — 600 SOCKS", description: "30-day access to 600 SOCKS", priceUsd: 3800, durationDays: 30, proxyCount: 600, bandwidthGb: 600, features: ["30-day", "Global coverage"] },
    { id: "socks5-30d-900", name: "30d — 900 SOCKS", description: "30-day access to 900 SOCKS", priceUsd: 5300, durationDays: 30, proxyCount: 900, bandwidthGb: 900, features: ["30-day", "Global coverage"] },
    // 365-Day Plans
    { id: "socks5-365d-50", name: "365d — 50 SOCKS", description: "1-year access to 50 SOCKS", priceUsd: 8800, durationDays: 365, proxyCount: 50, bandwidthGb: 500, features: ["1-year", "Priority support"] },
    { id: "socks5-365d-100", name: "365d — 100 SOCKS", description: "1-year access to 100 SOCKS", priceUsd: 14300, durationDays: 365, proxyCount: 100, bandwidthGb: 1000, features: ["1-year", "Priority support"] },
  ],
  credits: [
    { id: "credits-starter-50", name: "Starter — 50 Credits", description: "Never-expire credits — good for small needs", priceUsd: 600, durationDays: 3650, proxyCount: 0, bandwidthGb: 0, features: ["50 credits", "Never expire"] },
    { id: "credits-standard-240", name: "Standard — 240 Credits", description: "Best value for regular users", priceUsd: 1400, durationDays: 3650, proxyCount: 0, bandwidthGb: 0, features: ["240 credits", "Never expire"] },
    { id: "credits-premium-900", name: "Premium — 900 Credits", description: "Large pack for heavy users", priceUsd: 3900, durationDays: 3650, proxyCount: 0, bandwidthGb: 0, features: ["900 credits", "Never expire"], popular: true },
  ],
  unlimited: [
    { id: "unlimited-30", name: "Unlimited 30d", description: "All-you-can-eat residential bandwidth.", priceUsd: 9900, durationDays: 30, proxyCount: 1, bandwidthGb: 9999, features: ["Unlimited GB", "Residential pool", "Single port gateway"] },
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
            🚀 PREMIUM SOCKS5 PLANS — Crypto & BTC payments
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">Plans & Credit Packs</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Fast, reliable SOCKS5 with flexible durations and never-expire credit packs. Pay with BTC, USDT, or USDC.
          </p>
        </motion.div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as keyof typeof PLANS)} className="flex flex-col items-center">
          <TabsList className="mb-10 bg-card/60 border border-border">
            <TabsTrigger value="socks5">SOCKS5 Proxies</TabsTrigger>
            <TabsTrigger value="credits">Credit Packs</TabsTrigger>
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