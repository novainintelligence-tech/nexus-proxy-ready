import { useMemo, useState } from "react";
import { useListPlans } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CATEGORY_DEFS: { key: string; label: string; match: (p: any) => boolean }[] = [
  { key: "socks5",     label: "SOCKS5 Proxies",      match: (p) => p.id?.startsWith("socks5") },
  { key: "isp",        label: "Rotating ISP",        match: (p) => p.id?.startsWith("isp") || p.planType === "isp" },
  { key: "unlimited",  label: "Unlimited Bandwidth", match: (p) => p.id?.startsWith("unlimited") || p.planType === "unlimited" },
];

export function Pricing() {
  const { data: plans, isLoading } = useListPlans();
  const [tab, setTab] = useState("socks5");

  const categorized = useMemo(() => {
    const out: Record<string, any[]> = { socks5: [], isp: [], unlimited: [] };
    (plans ?? []).filter((p: any) => p.isActive !== false).forEach((p: any) => {
      const cat = CATEGORY_DEFS.find((c) => c.match(p))?.key ?? "socks5";
      out[cat]!.push(p);
    });
    Object.values(out).forEach((arr) => arr.sort((a, b) => a.priceUsd - b.priceUsd));
    return out;
  }, [plans]);

  const visible = categorized[tab] ?? [];

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
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Pick a plan that fits your <span className="text-primary">workflow</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            All plans include instant delivery, BTC / USDT / USDC payments, and self-serve dashboard.
          </p>
        </motion.div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full max-w-xl mx-auto grid-cols-3 mb-10 bg-card border border-border h-auto">
            {CATEGORY_DEFS.map((c) => (
              <TabsTrigger key={c.key} value={c.key} className="text-xs sm:text-sm py-2.5">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-72 rounded-xl bg-muted/20 animate-pulse border border-border" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No plans in this category yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visible.map((plan, idx) => {
              const popular = idx === 1;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                >
                  <Card
                    className={`h-full flex flex-col transition-all hover:-translate-y-1 ${
                      popular
                        ? "border-primary/60 shadow-[0_0_30px_rgba(0,240,255,0.15)] bg-card"
                        : "border-border bg-card/60"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      {popular && (
                        <Badge className="mb-2 self-start bg-primary text-primary-foreground text-[10px] tracking-wider">
                          POPULAR
                        </Badge>
                      )}
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                        {plan.description ?? "—"}
                      </p>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold tracking-tight">${(plan.priceUsd / 100).toFixed(0)}</span>
                          <span className="text-sm text-muted-foreground">
                            / {plan.durationDays === 1 ? "day" : `${plan.durationDays}d`}
                          </span>
                        </div>
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
                        {(plan.features ?? []).slice(0, 3).map((f: string) => (
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
                        <a href={`${import.meta.env.BASE_URL}sign-up`}>
                          Get Started
                          <ArrowRight className="w-3 h-3 ml-1.5" />
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
