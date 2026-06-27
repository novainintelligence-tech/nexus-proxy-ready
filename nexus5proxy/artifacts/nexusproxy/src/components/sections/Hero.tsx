import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bitcoin, ShieldCheck, Zap } from "lucide-react";

export function Hero() {
  const base = import.meta.env.BASE_URL;
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center pt-24 pb-16 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src={`${base}images/hero-bg.png`}
          alt=""
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.1)_0%,transparent_50%)]" />
      </div>

      <div className="container mx-auto px-4 z-10 relative">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm mb-6"
          >
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">
              Crypto-native proxy infrastructure
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6 leading-tight"
          >
            Buy proxies with <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              BTC, USDT &amp; USDC
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            SOCKS5, rotating ISP, and unlimited residential plans. Browse, reserve in cart, pay in
            crypto, and download your proxies the moment confirmation lands.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4"
          >
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto h-14 px-8 text-base sm:text-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(0,240,255,0.4)] group"
            >
              <a href={`${base}sign-up`}>
                Create Free Account
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-14 px-8 text-base sm:text-lg border-border hover:bg-white/5 group"
            >
              <a href="#pricing">
                Browse Plans
              </a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="mt-12 grid grid-cols-2 sm:flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs sm:text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2 justify-center">
              <Bitcoin className="w-4 h-4 text-primary" />
              BTC / USDT / USDC
            </div>
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              99.9% Uptime
            </div>
            <div className="flex items-center gap-2 justify-center">
              <ShieldCheck className="w-4 h-4 text-primary" />
              No KYC, no logs
            </div>
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
              100+ Countries
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
