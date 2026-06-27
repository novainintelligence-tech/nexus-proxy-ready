import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { Proxies } from "@/pages/Proxies";
export const Route = createFileRoute("/_app/proxies")({
  component: () => {
    const matches = useMatches();
    const hasChild = matches.some((m) => m.routeId !== "/_app/proxies" && m.routeId.startsWith("/_app/proxies/"));
    return hasChild ? <Outlet /> : <Proxies />;
  },
});