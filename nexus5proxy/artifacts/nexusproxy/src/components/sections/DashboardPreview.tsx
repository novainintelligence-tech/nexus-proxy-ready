import { motion } from "framer-motion";
import { Server, Activity, Users, Key, ChevronDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardPreview() {
  return (
    <section className="py-24 bg-background relative border-y border-border/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.05)_0%,transparent_70%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Developer-First Dashboard</h2>
          <p className="text-lg text-muted-foreground">
            Manage your infrastructure with precision. Generate credentials, track bandwidth in real-time, and control geo-targeting from a single interface.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-5xl mx-auto"
        >
          {/* Mock Dashboard UI */}
          <div className="rounded-xl border border-border/50 bg-[#0d0d12] shadow-2xl overflow-hidden flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-64 border-r border-border/50 bg-black/40 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 py-3 mb-4">
                <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                  <Server className="w-3 h-3 text-primary" />
                </div>
                <span className="font-semibold text-white">NexusProxy</span>
              </div>
              
              <div className="px-3 py-2 rounded-md bg-primary/10 text-primary text-sm font-medium flex items-center gap-3">
                <Activity className="w-4 h-4" /> Overview
              </div>
              <div className="px-3 py-2 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 text-sm font-medium flex items-center gap-3 cursor-pointer transition-colors">
                <Server className="w-4 h-4" /> Proxy List
              </div>
              <div className="px-3 py-2 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 text-sm font-medium flex items-center gap-3 cursor-pointer transition-colors">
                <Users className="w-4 h-4" /> Sub-users
              </div>
              <div className="px-3 py-2 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 text-sm font-medium flex items-center gap-3 cursor-pointer transition-colors">
                <Key className="w-4 h-4" /> API Keys
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 md:p-8 bg-[#0d0d12]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-white">Overview</h3>
                <div className="flex items-center gap-2 bg-black/40 border border-border/50 rounded-md px-3 py-1.5 text-sm text-muted-foreground cursor-pointer">
                  Last 30 Days <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-black/40 border border-border/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Data Usage</div>
                  <div className="text-2xl font-bold text-white">12.4 <span className="text-sm font-normal text-muted-foreground">GB / 20 GB</span></div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-primary h-full w-[62%] rounded-full shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
                  </div>
                </div>
                <div className="bg-black/40 border border-border/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Active Proxies</div>
                  <div className="text-2xl font-bold text-white">1,402</div>
                  <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> All systems operational
                  </div>
                </div>
                <div className="bg-black/40 border border-border/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Current Plan</div>
                  <div className="text-2xl font-bold text-white">Business</div>
                  <div className="text-xs text-primary mt-2">Renews in 14 days</div>
                </div>
              </div>

              {/* Code Snippet */}
              <div className="bg-black border border-border/50 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-[#1a1a24]">
                  <div className="flex gap-2">
                    <div className="text-xs text-primary font-mono border-b-2 border-primary pb-2 -mb-[9px]">cURL</div>
                    <div className="text-xs text-muted-foreground font-mono cursor-pointer pb-2">Python</div>
                    <div className="text-xs text-muted-foreground font-mono cursor-pointer pb-2">Node.js</div>
                  </div>
                  <Copy className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-white" />
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="text-sm font-mono text-muted-foreground">
                    <span className="text-pink-400">curl</span> -x <span className="text-yellow-300">http://usr_1234:pass_abcd@proxy.nexusproxy.io:8000</span> \
                    <br />
                    <span className="text-primary">"https://api.ipify.org?format=json"</span>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
