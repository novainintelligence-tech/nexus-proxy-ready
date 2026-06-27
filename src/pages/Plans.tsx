import { Link } from "wouter";
import { useListPlans } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Server, Zap } from "lucide-react";

export function Plans() {
  const { data: plans, isLoading } = useListPlans();

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 bg-muted/50 rounded w-48 mb-12"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-96 bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Premium residential and datacenter proxies. Paid securely in crypto.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans?.filter(p => p.isActive).map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative flex flex-col bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 ${
              plan.planType === 'premium' ? 'border-primary/30 shadow-[0_0_30px_rgba(0,240,255,0.1)]' : ''
            }`}
          >
            {plan.planType === 'premium' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground font-bold px-3 py-1">
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription className="pt-2">
                <span className="text-4xl font-bold text-foreground">
                  ${(plan.priceUsd / 100).toFixed(2)}
                </span>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 space-y-6">
              <div className="flex items-center justify-center gap-4 text-sm font-medium text-primary bg-primary/5 py-2 rounded-lg">
                <div className="flex items-center gap-1"><Server className="w-4 h-4"/> {plan.proxyCount} IPs</div>
                <div className="flex items-center gap-1"><Zap className="w-4 h-4"/> {plan.bandwidthGb}GB</div>
                <div className="flex items-center gap-1"><Shield className="w-4 h-4"/> {plan.durationDays}d</div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Features</p>
                {plan.features?.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            
            <CardFooter className="pt-6">
              <Link href={`/payment?planId=${plan.id}`} className="w-full">
                <Button 
                  className={`w-full ${
                    plan.planType === 'premium' 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                  }`}
                  size="lg"
                >
                  Buy Now
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}