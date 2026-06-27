import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_app")({
  component: () => (
    <TooltipProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <Toaster />
    </TooltipProvider>
  ),
});