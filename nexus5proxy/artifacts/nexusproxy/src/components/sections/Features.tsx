import { motion } from "framer-motion";
import { Globe, ShieldCheck, RefreshCw, Terminal, Activity, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Globe,
    title: "Global IP Coverage",
    description: "Access IPs from over 100+ countries with city-level targeting for precise geo-location requirements."
  },
  {
    icon: ShieldCheck,
    title: "High Anonymity",
    description: "Elite-level residential proxies that are indistinguishable from real organic users."
  },
  {
    icon: RefreshCw,
    title: "Rotating & Sticky",
    description: "Choose between automatically rotating IPs per request or keeping sticky sessions up to 30 minutes."
  },
  {
    icon: Terminal,
    title: "Developer API",
    description: "Comprehensive REST API to manage proxies, monitor usage, and automate your infrastructure."
  },
  {
    icon: Activity,
    title: "99.9% Uptime",
    description: "Enterprise-grade infrastructure built for mission-critical scraping and automation pipelines."
  },
  {
    icon: Zap,
    title: "Blazing Fast",
    description: "Optimized routing and dedicated nodes ensure sub-second response times globally."
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function Features() {
  return (
    <section id="features" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(138,43,226,0.1)_0%,transparent_50%)] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Engineered for Performance</h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to run automation at scale. No bottlenecks, no blocks, just pure performance.
          </p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, i) => (
            <motion.div key={i} variants={item}>
              <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 h-full">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
