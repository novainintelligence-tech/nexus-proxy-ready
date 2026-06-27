import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-md border-b border-border/40" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center border border-primary/30 group-hover:border-primary transition-colors">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">
            Nexus<span className="text-primary">Proxy</span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="#use-cases" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Use Cases</a>
          <a href="#trust" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Network</a>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" className="text-foreground hover:text-primary">Log in</Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            Get Started
          </Button>
        </div>

        <button
          className="md:hidden text-foreground p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border/40 overflow-hidden"
          >
            <div className="flex flex-col px-4 py-6 gap-4">
              <a href="#features" className="text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#use-cases" className="text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Use Cases</a>
              <a href="#trust" className="text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Network</a>
              <div className="h-px bg-border my-2" />
              <Button variant="ghost" className="justify-start text-foreground">Log in</Button>
              <Button className="bg-primary text-primary-foreground w-full">Get Started</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}